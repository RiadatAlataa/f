/**
 * Intelligent Database Snapshot Reconciliation Engine
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Provides:
 * 1. Granular Field-Level Merging (eliminates shallow {...existing, ...patch} overwriting).
 * 2. Anti-Zombie / No-Resurrection Protection with explicit tombstone timestamps and re-creation support.
 * 3. Watermark & Clock-Skew Protection: Prevents un-timestamped or older incoming payloads from overriding live data.
 * 4. Controlled Administrative Overrides: Allows authorized administrators to correct nationalId, fileNumber, etc.
 * 5. Intentional clearing of optional fields while protecting mandatory schema keys.
 * 6. Deep recursive object and array reconciliation.
 */

export interface ReconcileOptions {
  source?: string;
  forceOverwrite?: boolean;
  tombstones?: string[];
  preserveTargetOnEqualTimestamps?: boolean;
  allowAdministrativeCorrections?: boolean; // When true, allows updating nationalId, fileNumber, barcode
  allowClearingOptionalFields?: boolean;      // When true, allows explicit clearing of optional fields
  deltaFields?: string[];                     // Specific fields to reconcile
  isFullRestore?: boolean;                   // When true (explicit admin full restore), bypasses tombstone block
  userRole?: string;
}

export interface ReconcileResult {
  reconciledDb: any;
  addedCount: number;
  updatedCount: number;
  deletedPreventedCount: number;
  conflictsResolved: number;
  auditEntries: string[];
}

export interface DeletedTombstone {
  id: string;
  collection: string;
  deletedAt: string;
  deletedBy?: string;
}

const STRICTLY_IMMUTABLE_KEYS = new Set([
  "id"
]);

const ADMINISTRATIVE_IDENTIFIER_KEYS = new Set([
  "nationalId",
  "fileNumber",
  "file_number",
  "barcode",
  "createdAt",
  "created_at",
  "createdDate"
]);

const MANDATORY_SCHEMA_KEYS = new Set([
  "id",
  "name",
  "nameAr",
  "title",
  "role",
  "category",
  "primaryDepartmentId",
  "departmentId"
]);

const MONITORED_COLLECTIONS = [
  "departments",
  "volunteers",
  "volunteerApplications",
  "initiatives",
  "beneficiaries",
  "benefitRequests",
  "teams",
  "teamMembers",
  "teamApplications",
  "attendanceRecords",
  "financialAccounts",
  "financialVouchers",
  "financialBudgets",
  "inventory",
  "inventoryItems",
  "inventoryTransactions",
  "supportTickets",
  "news",
  "partners",
  "gallery",
  "orgMembers",
  "heroSlides",
  "distributions",
  "distributionHandovers",
  "storekeepers",
  "certificateTemplates",
  "departmentDirectives",
  "userDepartmentAccess",
  "employees"
];

/**
 * Records an explicitly deleted entity into the database tombstone registry.
 */
export function recordDeletedEntity(
  db: any,
  id: string,
  collection = "general",
  deletedBy = "system"
): void {
  if (!db || typeof db !== "object" || !id || typeof id !== "string") return;

  if (!Array.isArray(db._deletedRecordIds)) {
    db._deletedRecordIds = [];
  }
  if (!db._deletedTombstones || typeof db._deletedTombstones !== "object") {
    db._deletedTombstones = {};
  }

  const tombstone: DeletedTombstone = {
    id,
    collection,
    deletedAt: new Date().toISOString(),
    deletedBy
  };

  db._deletedTombstones[id] = tombstone;

  if (!db._deletedRecordIds.includes(id)) {
    db._deletedRecordIds.push(id);
    // Keep bounded history to avoid memory bloat (max 5,000 tombstones)
    if (db._deletedRecordIds.length > 5000) {
      const evictedId = db._deletedRecordIds.shift();
      if (evictedId && db._deletedTombstones[evictedId]) {
        delete db._deletedTombstones[evictedId];
      }
    }
  }
}

/**
 * Checks if an entity ID has been marked as deleted.
 * If the incoming item is provably created AFTER the tombstone date,
 * legitimate re-creation is recognized and tombstone is cleared.
 */
export function isEntityDeleted(
  db: any,
  id: string,
  extraTombstones: string[] = [],
  incomingItem?: any,
  isFullRestore = false
): boolean {
  if (!id) return false;
  if (isFullRestore) return false;

  const isExtraTombstone = extraTombstones.includes(id);
  const isRecordedInIds = db && Array.isArray(db._deletedRecordIds) && db._deletedRecordIds.includes(id);

  if (!isExtraTombstone && !isRecordedInIds) {
    return false;
  }

  // Check for legitimate re-creation:
  // If incomingItem has a creation timestamp strictly newer than the tombstone's deletedAt
  if (incomingItem && db && db._deletedTombstones && db._deletedTombstones[id]) {
    const tombstone = db._deletedTombstones[id] as DeletedTombstone;
    const incomingCreatedAt = incomingItem.createdAt || incomingItem.created_at || incomingItem.timestamp;
    if (incomingCreatedAt && typeof incomingCreatedAt === "string") {
      const createdTime = new Date(incomingCreatedAt).getTime();
      const deletedTime = new Date(tombstone.deletedAt).getTime();
      if (!isNaN(createdTime) && !isNaN(deletedTime) && createdTime > deletedTime) {
        // Legitimate re-creation detected! Clear tombstone.
        delete db._deletedTombstones[id];
        db._deletedRecordIds = db._deletedRecordIds.filter((tid: string) => tid !== id);
        return false;
      }
    }
  }

  return true;
}

/**
 * Extracts a comparable timestamp string from an entity.
 */
function getEntityTimestamp(entity: any): string {
  if (!entity || typeof entity !== "object") return "";
  const ts = entity.updatedAt || entity.updated_at || entity.lastModified || entity.timestamp || entity.date;
  return typeof ts === "string" ? ts : "";
}

/**
 * Reconciles two versions of a single record with granular field-level comparison.
 * Never blindly overwrites the entire object.
 */
export function reconcileRecord(
  existing: any,
  incoming: any,
  options: ReconcileOptions = {}
): { merged: any; changedFields: string[] } {
  if (!existing || typeof existing !== "object") {
    return { merged: { ...incoming }, changedFields: Object.keys(incoming || {}) };
  }
  if (!incoming || typeof incoming !== "object") {
    return { merged: { ...existing }, changedFields: [] };
  }

  const merged = { ...existing };
  const changedFields: string[] = [];

  const existingTs = getEntityTimestamp(existing);
  const incomingTs = getEntityTimestamp(incoming);

  // 1. Timestamp & Watermark Verification Policy
  if (!options.forceOverwrite) {
    // If incoming has an explicit timestamp that is OLDER than existing, preserve existing live data
    if (existingTs && incomingTs && incomingTs < existingTs) {
      return { merged, changedFields: [] };
    }

    // If live data has an updatedAt timestamp, but incoming payload has NO timestamp:
    // Do NOT allow an untimestamped payload to blindly overwrite fresh live data
    if (existingTs && !incomingTs && !options.deltaFields) {
      return { merged, changedFields: [] };
    }

    // If neither has a timestamp and equal policy is to preserve target
    if (!existingTs && !incomingTs && options.preserveTargetOnEqualTimestamps !== false && !options.deltaFields) {
      // Retain existing unless explicit delta fields specified
      return { merged, changedFields: [] };
    }
  }

  // 2. Identify fields to compare (either explicit deltas or all incoming keys)
  const candidateKeys = options.deltaFields && options.deltaFields.length > 0
    ? options.deltaFields
    : Object.keys(incoming);

  const canAdminCorrect = options.allowAdministrativeCorrections === true ||
    options.userRole === "admin" ||
    options.userRole === "super_admin";

  const allowClearing = options.allowClearingOptionalFields !== false;

  for (const key of candidateKeys) {
    const incomingVal = incoming[key];
    const existingVal = existing[key];

    // Primary ID is strictly immutable
    if (STRICTLY_IMMUTABLE_KEYS.has(key)) {
      continue;
    }

    // Administrative Identifier Keys (nationalId, fileNumber, barcode, etc.):
    // Can only be modified if caller has authorized administrative correction permissions
    if (ADMINISTRATIVE_IDENTIFIER_KEYS.has(key)) {
      if (existingVal !== undefined && existingVal !== null && existingVal !== "") {
        if (!canAdminCorrect) {
          continue; // Block non-admin or unauthorized changes
        }
      }
    }

    // Undefined in incoming payload means "field was omitted/not modified"
    if (incomingVal === undefined) {
      continue;
    }

    // Handling clearing of fields (null or empty string "")
    if (incomingVal === null || (typeof incomingVal === "string" && incomingVal.trim() === "")) {
      // Mandatory schema fields CANNOT be cleared
      if (MANDATORY_SCHEMA_KEYS.has(key)) {
        continue;
      }
      // If clearing optional fields is allowed, apply the clear
      if (allowClearing && existingVal !== incomingVal) {
        merged[key] = incomingVal;
        changedFields.push(key);
      }
      continue;
    }

    // Nested object granular reconciliation
    if (
      typeof incomingVal === "object" && incomingVal !== null && !Array.isArray(incomingVal) &&
      typeof existingVal === "object" && existingVal !== null && !Array.isArray(existingVal)
    ) {
      const nestedResult = reconcileRecord(existingVal, incomingVal, options);
      if (nestedResult.changedFields.length > 0) {
        merged[key] = nestedResult.merged;
        changedFields.push(key);
      }
      continue;
    }

    // Granular value comparison
    const incomingSerialized = JSON.stringify(incomingVal);
    const existingSerialized = JSON.stringify(existingVal);

    if (incomingSerialized !== existingSerialized) {
      merged[key] = incomingVal;
      changedFields.push(key);
    }
  }

  if (changedFields.length > 0) {
    merged.updatedAt = new Date().toISOString();
  }

  return { merged, changedFields };
}

/**
 * Full Database Snapshot Reconciliation.
 * Reconciles targetDb with incomingDb safely:
 * - Prevents resurrection of records that are in targetDb._deletedRecordIds
 * - Allows legitimate re-creation when createdAt is newer than deletion date
 * - Bypasses tombstones on explicit administrative full restore
 * - Performs granular field-level merges on existing items
 * - Preserves logs without duplicates
 */
export function reconcileDbSnapshots(
  targetDb: any,
  incomingDb: any,
  options: ReconcileOptions = {}
): ReconcileResult {
  const auditEntries: string[] = [];
  let addedCount = 0;
  let updatedCount = 0;
  let deletedPreventedCount = 0;
  let conflictsResolved = 0;

  if (!targetDb || typeof targetDb !== "object") {
    throw new Error("Target database snapshot is invalid or uninitialized");
  }
  if (!incomingDb || typeof incomingDb !== "object") {
    return {
      reconciledDb: targetDb,
      addedCount: 0,
      updatedCount: 0,
      deletedPreventedCount: 0,
      conflictsResolved: 0,
      auditEntries: ["Incoming snapshot was empty; target database retained unchanged."]
    };
  }

  // Ensure tombstone structures exist
  if (!Array.isArray(targetDb._deletedRecordIds)) {
    targetDb._deletedRecordIds = [];
  }
  if (!targetDb._deletedTombstones || typeof targetDb._deletedTombstones !== "object") {
    targetDb._deletedTombstones = {};
  }

  const extraTombstones = options.tombstones || [];

  // Reconcile each monitored collection
  for (const collectionName of MONITORED_COLLECTIONS) {
    if (!Array.isArray(incomingDb[collectionName])) continue;
    if (!Array.isArray(targetDb[collectionName])) {
      targetDb[collectionName] = [];
    }

    const targetList: any[] = targetDb[collectionName];
    const incomingList: any[] = incomingDb[collectionName];
    const targetMap = new Map<string, number>();

    targetList.forEach((item, idx) => {
      if (item && item.id) {
        targetMap.set(String(item.id), idx);
      }
    });

    for (const incomingItem of incomingList) {
      if (!incomingItem || !incomingItem.id) continue;
      const itemId = String(incomingItem.id);

      // Check for tombstone / anti-zombie protection
      if (isEntityDeleted(targetDb, itemId, extraTombstones, incomingItem, options.isFullRestore)) {
        deletedPreventedCount++;
        auditEntries.push(`[ANTI-ZOMBIE] Blocked resurrection of deleted item "${itemId}" in collection "${collectionName}".`);
        continue;
      }

      if (targetMap.has(itemId)) {
        // Record exists: Reconcile granularly
        const existingIdx = targetMap.get(itemId)!;
        const existingItem = targetList[existingIdx];
        const { merged, changedFields } = reconcileRecord(existingItem, incomingItem, options);

        if (changedFields.length > 0) {
          targetList[existingIdx] = merged;
          updatedCount++;
          conflictsResolved += changedFields.length;
          auditEntries.push(`[RECONCILE UPDATE] Collection "${collectionName}" item "${itemId}" fields updated: ${changedFields.join(", ")}`);
        }
      } else {
        // Record is genuinely new: Append safely
        targetList.push({ ...incomingItem });
        targetMap.set(itemId, targetList.length - 1);
        addedCount++;
        auditEntries.push(`[RECONCILE ADD] Added new record "${itemId}" to collection "${collectionName}".`);
      }
    }
  }

  // Reconcile audit logs: Union by id/timestamp without duplicates
  if (Array.isArray(incomingDb.logs) && Array.isArray(targetDb.logs)) {
    const existingLogIds = new Set(targetDb.logs.map((l: any) => l.id || `${l.timestamp}-${l.action}`));
    for (const incomingLog of incomingDb.logs) {
      const logKey = incomingLog.id || `${incomingLog.timestamp}-${incomingLog.action}`;
      if (!existingLogIds.has(logKey)) {
        targetDb.logs.push(incomingLog);
        existingLogIds.add(logKey);
      }
    }
    targetDb.logs.sort((a: any, b: any) => {
      const ta = a.timestamp || "";
      const tb = b.timestamp || "";
      return tb.localeCompare(ta);
    });
  }

  // Stamp revision watermark
  targetDb._version = ((typeof targetDb._version === "number" ? targetDb._version : 0) + 1);
  targetDb._lastModified = new Date().toISOString();

  return {
    reconciledDb: targetDb,
    addedCount,
    updatedCount,
    deletedPreventedCount,
    conflictsResolved,
    auditEntries
  };
}
