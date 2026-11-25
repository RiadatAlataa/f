// Synthetic data for the TEST HOSTING copy only. No real person, account, phone, email or national ID.
// - national IDs start with 9 (not a valid Saudi ID prefix), phones are 000xxxxxxx, emails use example.org
// - every credential is generated at runtime; nothing secret is stored in the repository
import crypto from "node:crypto";

const pick = (arr, i) => arr[i % arr.length];
const pad = (n, w) => String(n).padStart(w, "0");
const FIRST = ["أحمد", "سارة", "خالد", "نورة", "عبدالله", "ريم", "فهد", "هند", "سلمان", "لمى"];
const LAST = ["التجريبي", "الاختباري", "النموذجي", "الافتراضي"];
const fakeName = (i) => `${pick(FIRST, i)} ${pick(LAST, i >> 3)} ${i}`;
const fakeId = (i) => `9${pad(i, 9)}`;
const fakePhone = (i) => `000${pad(i, 7)}`;
const fakeEmail = (prefix, i) => `${prefix}.${i}@example.org`;

/**
 * scale: 1 ≈ a small association (≈ 200 volunteers, 300 beneficiaries); the document grows roughly linearly.
 * imageKb: size of an inline base64 "photo" attached to each volunteer (0 = none), to model data-URL images.
 */
export function buildSyntheticDb({ scale = 1, imageKb = 0, adminPasswordHash }) {
  const now = new Date().toISOString();
  const img = imageKb > 0 ? "data:image/png;base64," + crypto.randomBytes(Math.floor(imageKb * 768)).toString("base64") : "";
  const deps = ["dep-1", "dep-2", "dep-3", "dep-4", "dep-5", "dep-6", "dep-7", "dep-8", "dep-9"].map((id, i) => ({
    id, nameAr: `إدارة تجريبية ${i + 1}`, nameEn: `Test department ${i + 1}`, status: "active"
  }));
  const teams = Array.from({ length: 10 * scale }, (_, i) => ({
    id: `team-${i}`, nameAr: `فريق تجريبي ${i}`, leaderName: `قائد تجريبي ${i}`, departmentId: "dep-5", status: "active",
    leaderPhone: fakePhone(900000 + i), membersCount: 20, createdAt: now
  }));
  const volunteers = Array.from({ length: 200 * scale }, (_, i) => ({
    id: `vol-${i}`, name: fakeName(i), nationalId: fakeId(i), phone: fakePhone(i), email: fakeEmail("vol", i),
    teamId: `team-${i % teams.length}`, status: "active", points: i % 500, hours: i % 120, city: "مدينة تجريبية",
    membershipNumber: `TEST-VOL-${pad(i, 6)}`, joinDate: "2026-01-01", ...(img ? { photo: img } : {})
  }));
  const beneficiaries = Array.from({ length: 300 * scale }, (_, i) => ({
    id: `ben-${i}`, name: fakeName(100000 + i), nationalId: fakeId(500000000 + i), phone: fakePhone(500000 + i),
    status: "approved", familySize: (i % 8) + 1, category: "فئة تجريبية", address: "عنوان تجريبي", beneficiaryNumber: `TEST-BEN-${pad(i, 6)}`
  }));
  const inventoryItems = Array.from({ length: 150 * scale }, (_, i) => ({
    id: `item-${i}`, nameAr: `صنف تجريبي ${i}`, barcode: `TEST${pad(i, 9)}`, quantity: (i * 7) % 300, unit: "قطعة", warehouseId: "wh-1"
  }));
  const distributions = Array.from({ length: 100 * scale }, (_, i) => ({
    id: `dist-${i}`, beneficiaryId: `ben-${i % beneficiaries.length}`, items: [{ itemId: `item-${i % inventoryItems.length}`, qty: 1 }],
    status: "delivered", createdAt: now
  }));
  const logs = Array.from({ length: 1000 * scale }, (_, i) => ({
    id: `log-${i}`, timestamp: now, user: "نظام تجريبي", action: `عملية تجريبية رقم ${i}`, ip: "192.0.2.1", device: "test"
  }));
  const notifications = Array.from({ length: 300 * scale }, (_, i) => ({
    id: `n-${i}`, userId: `vol-${i % volunteers.length}`, titleAr: "إشعار تجريبي", bodyAr: "نص تجريبي", read: false, createdAt: now
  }));
  const attendance = Array.from({ length: 500 * scale }, (_, i) => ({
    id: `att-${i}`, volunteerId: `vol-${i % volunteers.length}`, date: "2026-01-01", hours: 3, status: "present"
  }));
  return {
    systemSettings: { societyName: "جمعية تجريبية (بيانات وهمية)", maintenanceMode: false },
    homeSettings: { orgMembers: [] },
    news: [], partners: [], gallery: [], heroSlides: [], orgMembers: [], faqs: [],
    departments: deps, teams, volunteers, beneficiaries, employees: [], storekeepers: [],
    supportManagers: [], supportAgents: [], supervisors: [],
    userDepartmentAccess: [
      {
        id: "perm-admin", userId: "admin-user", username: "admin", userName: "مدير تجريبي", userEmail: "test-admin@example.org",
        role: "admin", primaryDepartmentId: "dep-1", permissions: ["super_admin"], status: "active", mustChangePassword: false,
        ...(adminPasswordHash ? { passwordHash: adminPasswordHash } : { loginDisabled: true })
      },
      // synthetic operations-manager record so start-up normalisation does not create its built-in default
      {
        id: "perm-ops", userId: "ops-manager", username: "ops-test", userName: "مدير عمليات تجريبي", userEmail: "test-ops@example.org",
        nationalId: "9000000002", phone: "0000000002", role: "operations_manager", primaryDepartmentId: "dep-1",
        permissions: ["operations_manager"], status: "active", loginDisabled: true
      }
    ],
    inventoryItems, distributions, warehouses: [{ id: "wh-1", nameAr: "مستودع تجريبي" }],
    logs, accessAuditLogs: [], notifications, attendance,
    // non-empty so the server does not insert its built-in sample initiatives
    initiatives: Array.from({ length: 3 }, (_, i) => ({ id: `init-${i}`, titleAr: `مبادرة تجريبية ${i}`, status: "active", teamId: "team-0", createdAt: now })), requests: [], benefitRequests: [],
    passwordResetRequests: [], passwordResetOtps: [], supportTickets: [], supportTasks: [], chatConversations: [],
    activeSessions: [], trustedDevices: [], rememberedHandles: [], volunteerApplications: [], teamApplications: [],
    emailSettings: { provider: "both_auto", resendApiKey: "", smtpPassword: "", enabled: false },
    _syntheticTestData: true, _createdAt: now
  };
}
