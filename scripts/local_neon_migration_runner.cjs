/**
 * أداة الفحص والتدقيق المحلي الآمن (Dry Run Auditor) لنظام جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * Local Secure Dry-Run Auditor (Read-Only) for Neon Staging Branch
 * 
 * المبادئ الأمنية الصارمة:
 * 1. بصمة SHA-256 ثابتة ومطابقتها إلزامية بنسبة 100% دون أي متغير بيئي أو خيار تجاوز.
 * 2. التحقق الحرفي الصارم من اسم المضيف عبر URL Parser (حظر الـ Regex وحصر المضيفين المعتمدين).
 * 3. التحقق الدقيق من البروتوكول والمنفذ واسم قاعدة البيانات neondb.
 * 4. تفعيل التحقق التام من شهادة TLS (rejectUnauthorized: true).
 * 5. حظر أي استعلام كتابة وفصل أداة الترحيل تماماً ورفض أي خيارات غير معروفة.
 * 6. تدقيق هيكلي إلزامي للحسابات (التحقق من المصفوفات، الصلاحيات، هاشات bcrypt، وتمييز حسابات Google OAuth).
 * 7. إذا كانت البنية ناقصة، تُعلن النتيجة فوراً بفشل الفحص (FAIL).
 * 8. حظر طباعة أي نصوص أخطاء خام أو أسرار أو PII، واستخدام رموز أخطاء عامة وآمنة.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");
const { Pool } = require("pg");

// البصمة الرسمية المعتمدة للنسخة الحقيقية (ثابتة غير قابلة للتجاوز)
const OFFICIAL_BACKUP_SHA256 = "af21804bd617ce5d531e7f274c19ce4db5403f7573e5189112ea8f843f7918bd";
const DEFAULT_BACKUP_FILENAME = "backup_reyadat_alata_2026-10-19.json";

// المضيفون المصرح بهم حصرياً في فرع Staging
const EXACT_ALLOWED_HOSTNAMES = new Set([
  "ep-tiny-hat-b4hpkghm.c-6.us-east-2.aws.neon.tech",
  "ep-tiny-hat-b4hpkghm-pooler.c-6.us-east-2.aws.neon.tech"
]);

// المفاتيح المستبعدة أمنياً
const SECURITY_EXCLUDED_KEYS = {
  activeSessions: "جلسات دخول مؤقتة ومنتهية؛ استبعاد إلزامي لحماية أمن الجلسات من هجمات تثبيت الجلسة (Session Fixation).",
  passwordResetOtps: "رموز تحقق مؤقتة (OTP) صالحة لمدة 15 دقيقة فقط وقد انتهت؛ استبعاد إلزامي لمنع نقل رموز منتهية.",
  passwordResetRequests: "طلبات استعادة كلمة مرور مغلقة ومنتهية."
};

// فحص أمني دقيق لرابط الاتصال باستخدام URL Parser
function validateConnectionUrl(urlString) {
  if (!urlString || typeof urlString !== "string") {
    return { valid: false, code: "ERR_URL_EMPTY", message: "متغير رابط الاتصال غير محدد أو فارغ." };
  }

  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, code: "ERR_URL_MALFORMED", message: "صيغة رابط الاتصال غير صالحة كـ URL." };
  }

  // 1. التحقق من البروتوكول
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    return { valid: false, code: "ERR_INVALID_PROTOCOL", message: "البروتوكول المستخدم غير صالح؛ يجب أن يكون postgresql أو postgres." };
  }

  // 2. التحقق الحرفي الصارم من المضيف
  const hostname = (parsed.hostname || "").toLowerCase().trim();
  if (!EXACT_ALLOWED_HOSTNAMES.has(hostname)) {
    return { 
      valid: false, 
      code: "ERR_UNAUTHORIZED_HOST", 
      message: "اسم المضيف لا يطابق نقطة اتصال فرع Staging التجريبية المعتمدة حصرياً. تم حظر الاتصال." 
    };
  }

  // 3. التحقق من المنفذ المسموح (5432 أو افتراضي)
  if (parsed.port && parsed.port !== "5432") {
    return { valid: false, code: "ERR_INVALID_PORT", message: "منفذ الاتصال غير مصرح به؛ المنفذ المسموح هو 5432 فقط." };
  }

  // 4. التحقق من اسم قاعدة البيانات
  const dbName = parsed.pathname.replace(/^\/+|\/+$/g, "");
  if (dbName !== "neondb") {
    return { valid: false, code: "ERR_INVALID_DATABASE", message: "اسم قاعدة البيانات غير مصرح به؛ المسموح حصرياً هو neondb." };
  }

  return { valid: true, hostname, dbName };
}

// حساب بصمة SHA-256 للملف
function computeFileSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex").toLowerCase();
}

// تدقيق هيكلية الحسابات والصلاحيات (مع تمييز Google OAuth وفحص Bcrypt الصارم)
function auditAccountsStructure(userAccessList) {
  const result = {
    totalAccounts: userAccessList.length,
    validStructureCount: 0,
    bcryptPasswordCount: 0,
    googleOAuthCount: 0,
    pendingOrSingleFactorCount: 0,
    superAdminCount: 0,
    departmentManagersCount: 0,
    employeesCount: 0,
    activeStatusCount: 0,
    structuralErrorsCount: 0,
    isPassed: false
  };

  // تعبير نمطي صارم لـ Bcrypt (يدعم $2a$, $2b$, $2y$ بطول 60 محرفاً)
  const strictBcryptRegex = /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/;

  for (const acc of userAccessList) {
    let isItemValid = true;

    if (!acc || typeof acc !== "object") {
      result.structuralErrorsCount++;
      continue;
    }

    // التحقق من وجود المعرف الأساسي ودور الحساب
    if (!acc.id && !acc.userId) isItemValid = false;
    if (!acc.role || typeof acc.role !== "string") isItemValid = false;

    // تمييز نوع المصادقة (Google OAuth مقابل كلمة المرور)
    const isGoogleAuth = acc.authProvider === "google" || 
                         acc.isGoogleAuth === true || 
                         (typeof acc.googleId === "string" && acc.googleId.trim().length > 0) ||
                         (acc.userEmail && acc.userEmail.endsWith("@gmail.com") && !acc.passwordHash);

    if (isGoogleAuth) {
      result.googleOAuthCount++;
    } else if (acc.passwordHash && typeof acc.passwordHash === "string" && strictBcryptRegex.test(acc.passwordHash)) {
      result.bcryptPasswordCount++;
    } else {
      result.pendingOrSingleFactorCount++;
    }

    // تصنيف الأدوار
    const roleLower = (acc.role || "").toLowerCase();
    if (roleLower === "super_admin" || acc.isSuperAdmin === true) {
      result.superAdminCount++;
    } else if (roleLower.includes("manager") || roleLower.includes("director") || roleLower.includes("مدير")) {
      result.departmentManagersCount++;
    } else {
      result.employeesCount++;
    }

    if (acc.status === "active" || acc.status === "مفعل") {
      result.activeStatusCount++;
    }

    if (isItemValid) {
      result.validStructureCount++;
    } else {
      result.structuralErrorsCount++;
    }
  }

  // يشترط للنجاح وجود حسابات، وسلامة بنية 100% منها، وخلوها من الأخطاء الهيكلية
  result.isPassed = result.totalAccounts > 0 && 
                    result.structuralErrorsCount === 0 && 
                    result.validStructureCount === result.totalAccounts;

  return result;
}

// دالة فحص مصفوفات الأقسام الأساسية
function validateCoreArrays(data) {
  const errors = [];
  const requiredArrays = [
    { key: "userDepartmentAccess", label: "حسابات الإدارة والصلاحيات" },
    { key: "volunteers", label: "سجلات المتطوعين" },
    { key: "beneficiaries", label: "سجلات المستفيدين" },
    { key: "employees", label: "سجلات الموظفين" }
  ];

  for (const item of requiredArrays) {
    if (!Array.isArray(data[item.key])) {
      errors.push(`القسم ${item.key} (${item.label}) ليس مصفوفة صالحة.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// دالة الفحص الرئيسية (Read-Only Dry Run)
async function runDryRunAudit(options = {}) {
  console.log("================================================================================");
  console.log(" 🔍 أداة الفحص والتدقيق الآمن للقراءة فقط (Dry Run Auditor)");
  console.log("    مشروع: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة (رقم الترخيص: 1000888600)");
  console.log("================================================================================");

  let overallPassed = true;

  // 1. فحص وسائط سطر الأوامر الصارم
  const args = options.args || process.argv.slice(2);
  const allowedPrefixes = ["--file="];

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      console.log("الاستخدام المسموح:");
      console.log("  node scripts/local_neon_migration_runner.cjs");
      console.log("  node scripts/local_neon_migration_runner.cjs --file=\"C:\\path\\to\\backup.json\"");
      return { success: true, message: "Help displayed" };
    }

    if (arg === "--apply" || arg === "-a") {
      console.error("\n🛑 [ERR_APPLY_PROHIBITED] أداة الترحيل مفصولة ومغلقة تماماً.");
      console.error("   هذه الأداة مخصصة للفحص وقراءة البيانات فقط (Read-Only) وترفض خيار --apply.");
      process.exit(1);
    }

    const isAllowed = allowedPrefixes.some(p => arg.startsWith(p));
    if (!isAllowed) {
      console.error(`\n🛑 [ERR_UNKNOWN_OPTION] خيار غير مدعوم: "${arg}"`);
      process.exit(1);
    }
  }

  // 2. مسار الملف
  const customFileArg = args.find(a => a.startsWith("--file="));
  const targetFilePath = customFileArg 
    ? path.resolve(customFileArg.split("=")[1].replace(/^["']|["']$/g, "")) 
    : path.resolve(process.cwd(), DEFAULT_BACKUP_FILENAME);

  console.log(`[1] ملف النسخة المستهدف: ${path.basename(targetFilePath)}`);

  if (!fs.existsSync(targetFilePath)) {
    console.error(`\n❌ [ERR_FILE_NOT_FOUND] لم يتم العثور على ملف النسخة في المسار المحدد.`);
    process.exit(1);
  }

  // 3. التحقق من بصمة SHA-256 الثابتة
  console.log("\n[2] التحقق الصارم من بصمة SHA-256 الثابتة...");
  const actualSha256 = computeFileSha256(targetFilePath);

  console.log(`   - بصمة الملف المحسوبة: ${actualSha256.toUpperCase()}`);
  console.log(`   - البصمة المعتمدة رسميًا: ${OFFICIAL_BACKUP_SHA256.toUpperCase()}`);

  if (actualSha256 !== OFFICIAL_BACKUP_SHA256) {
    console.error("\n🛑 [ERR_SHA256_MISMATCH] بصمة الملف لا تطابق البصمة المعتمدة نهائياً.");
    console.error("   لحماية سلامة بيانات الجمعية، تم إيقاف العملية لمنع فحص نسخة غير معتمدة.");
    process.exit(1);
  }
  console.log("   ✅ مطابقة تامة للبصمة الرسمية المعتمدة (PASS).");

  // 4. قراءة وفحص بنية JSON
  console.log("\n[3] تحليل هيكلية ملف النسخة الاحتياطية...");
  let backupData;
  try {
    const raw = fs.readFileSync(targetFilePath, "utf8");
    backupData = JSON.parse(raw);
  } catch {
    console.error(`\n❌ [ERR_JSON_INVALID] محتوى الملف لا يمثل ملف JSON صالح التركيب.`);
    process.exit(1);
  }

  // قراءة العدد الحقيقي للمفاتيح دون افتراض مسبق
  const realKeys = Object.keys(backupData);
  const actualKeyCount = realKeys.length;
  console.log(`   - إجمالي الأقسام/المفاتيح المكتشفة فعلياً: ${actualKeyCount} قسم.`);

  // 5. التحقق من أن الأقسام الأساسية مصفوفات
  console.log("\n[4] التحقق الصارم من نوعية المصفوفات الأساسية:");
  const arrayCheck = validateCoreArrays(backupData);
  if (!arrayCheck.valid) {
    console.error("   ❌ فشل: بعض الأقسام الأساسية لا تمثل مصفوفات صالحة.");
    overallPassed = false;
  } else {
    console.log("   ✅ جميع الأقسام الأساسية (حسابات، متطوعين، مستفيدين، موظفين) مصفوفات صالحة (PASS).");
  }

  // 6. فحص المفاتيح المستبعدة وسجلات developerErrorLogs
  console.log("\n[5] تدقيق المفاتيح المستبعدة أمنياً وسجلات النظام:");
  for (const [k, reason] of Object.entries(SECURITY_EXCLUDED_KEYS)) {
    const count = Array.isArray(backupData[k]) ? backupData[k].length : (backupData[k] ? 1 : 0);
    console.log(`   - [مستبعد أمنياً] ${k}: (${count} سجل) -> ${reason}`);
  }

  const devLogs = backupData.developerErrorLogs || [];
  console.log(`   - [تدقيق إحصائي] developerErrorLogs: ${Array.isArray(devLogs) ? devLogs.length : 0} سجل.`);
  if (Array.isArray(devLogs) && devLogs.length > 0) {
    const clientBoundaryLogs = devLogs.filter(l => l && (l.componentStack || l.componentName)).length;
    const serverCrashLogs = devLogs.filter(l => l && (l.isServerCrash || l.fatalServerCrash)).length;
    console.log(`     * تتبع أخطاء واجهة المتصفح (React Boundary): ${clientBoundaryLogs}`);
    console.log(`     * أعطال خادم حيوية (Fatal Server Crashes): ${serverCrashLogs}`);
    console.log(`     * حماية الخصوصية: تم حظر طباعة نصوص الأخطاء أو المكدس أو معرفات المستخدمين.`);
  }

  // 7. تدقيق الحسابات والصلاحيات وهاشات التشفير (مع إعلان FAIL عند أي نقص)
  console.log("\n[6] تدقيق بنية الحسابات والصلاحيات والمصادقة (Zero PII):");
  const userAccess = backupData.userDepartmentAccess || [];
  const accountAudit = auditAccountsStructure(userAccess);

  console.log(`   - حسابات الوصول الإداري: ${accountAudit.totalAccounts}`);
  console.log(`     * بنية الحسابات السليمة: ${accountAudit.validStructureCount}/${accountAudit.totalAccounts}`);
  console.log(`     * حسابات بكلمات مرور مشفرة متوافقة (Bcrypt): ${accountAudit.bcryptPasswordCount}`);
  console.log(`     * حسابات تعتمد مصادقة Google OAuth: ${accountAudit.googleOAuthCount}`);
  console.log(`     * حسابات بمصادقة أحادية أو قيد التعيين: ${accountAudit.pendingOrSingleFactorCount}`);
  console.log(`     * حسابات بصلاحيات الإدارة العليا: ${accountAudit.superAdminCount}`);
  console.log(`     * حسابات مديري الأقسام والعمليات: ${accountAudit.departmentManagersCount}`);
  console.log(`     * حسابات الموظفين وفرق العمل: ${accountAudit.employeesCount}`);
  console.log(`     * الأخطاء الهيكلية المكتشفة: ${accountAudit.structuralErrorsCount}`);

  if (!accountAudit.isPassed) {
    console.error("   ❌ نتيجة فحص الحسابات: فشل (FAIL) - تم رصد نقص في بنية الحسابات أو الصلاحيات.");
    overallPassed = false;
  } else {
    console.log("   ✅ نتيجة فحص الحسابات: اجتياز كامل (PASS).");
  }

  console.log(`   - سجلات المتطوعين (volunteers): ${Array.isArray(backupData.volunteers) ? backupData.volunteers.length : 0}`);
  console.log(`   - سجلات المستفيدين (beneficiaries): ${Array.isArray(backupData.beneficiaries) ? backupData.beneficiaries.length : 0}`);
  console.log(`   - سجلات الموظفين (employees): ${Array.isArray(backupData.employees) ? backupData.employees.length : 0}`);

  // 8. فحص المرفقات مع بيان التمييز بين البيانات الوصفية والملفات الفيزيائية
  console.log("\n[7] فحص مسارات المرفقات والملفات الخارجية:");
  let webUrls = 0, localAssets = 0, docRefs = 0;
  function countRefs(obj) {
    if (!obj) return;
    if (typeof obj === "string") {
      if (obj.startsWith("http://") || obj.startsWith("https://")) webUrls++;
      else if (obj.startsWith("/logo") || obj.startsWith("/card_templates")) localAssets++;
      else if (obj.endsWith(".pdf") || obj.endsWith(".jpg") || obj.endsWith(".png")) docRefs++;
      return;
    }
    if (Array.isArray(obj)) obj.forEach(countRefs);
    else if (typeof obj === "object") for (const v of Object.values(obj)) countRefs(v);
  }
  countRefs(backupData);

  console.log(`   - روابط ويب وصور مستضافة (URLs): ${webUrls}`);
  console.log(`   - مسارات شعارات وقوالب محلية: ${localAssets}`);
  console.log(`   - مسميات وثائق ومستندات PDF/صور في السجلات: ${docRefs}`);
  console.log("\n   ⚠️ إشعار سلامة المرفقات والملفات:");
  console.log("   - ملف النسخة الاحتياطية (JSON) يحتوي على البيانات الوصفية (Metadata) ومسميات الملفات فقط.");
  console.log("   - الملفات الثنائية الفيزيائية (Binary Files) ليست مضمنة في ملف JSON، وتتطلب أداة extract_attachments المستقلة.");

  // 9. التحقق الصارم من رابط اتصال Neon Staging
  console.log("\n[8] التحقق الأمني من اتصال قاعدة بيانات Neon التجريبية (Read-Only):");
  const rawDbUrl = process.env.TEST_DATABASE_URL || "";
  const urlValidation = validateConnectionUrl(rawDbUrl);

  if (!urlValidation.valid) {
    console.error(`\n🛑 [${urlValidation.code}] ${urlValidation.message}`);
    overallPassed = false;
    process.exit(1);
  }
  console.log(`   ✅ تم التحقق الحرفي من اسم المضيف (${urlValidation.hostname}) والبروتوكول والمنفذ وقاعدة neondb.`);

  // اختبار الاتصال بـ PostgreSQL بوضع قراءة فقط وبشهادة TLS موثقة
  const pool = new Pool({
    connectionString: rawDbUrl,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 10000
  });

  let client;
  try {
    client = await pool.connect();
    const verRes = await client.query("SELECT version(), current_database(), current_user;");
    const dbName = verRes.rows[0].current_database;
    const dbUser = verRes.rows[0].current_user;
    const pgVer = verRes.rows[0].version.split(" on ")[0];

    console.log(`   ✅ الاتصال بـ PostgreSQL ناجح ومؤمن بـ TLS مشفر.`);
    console.log(`   - قاعدة البيانات: ${dbName} | المستخدم: ${dbUser}`);
    console.log(`   - إصدار المحرك: ${pgVer}`);

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`   - عدد الجداول الحالية في فرع Staging: ${tablesRes.rows.length} جدول.`);

  } catch {
    console.error(`\n❌ [ERR_DB_CONNECT_FAILED] تعذر الاتصال الآمن بقاعدة بيانات Neon Staging.`);
    overallPassed = false;
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }

  // 10. التقرير النهائي
  console.log("\n================================================================================");
  if (overallPassed) {
    console.log(" 🎉 نتيجة الفحص والتدقيق الآمن: اجتياز كامل بنجاح (PASS)");
    console.log(" - نوع العملية: قراءة واستعلامات فحص بنسبة 100% (Read-Only).");
    console.log(" - عدد عمليات الكتابة أو التعديل: 0 (صفر تعديل على قاعدة البيانات).");
    console.log(" - سلامة البصمة الرقمية: مطابقة تامة للبصمة الرسمية المعتمدة.");
    console.log(" - الاتصال بـ Neon Staging: مطابق حصرياً لنقطة الاختبار ومشفر بـ TLS.");
    console.log(" - أداة الترحيل الحقيقي: مفصولة ومغلقة بالكامل بانتظار الموافقة الصريحة.");
  } else {
    console.log(" ❌ نتيجة الفحص والتدقيق: فشل (FAIL) - تم رصد بنود غير مكتملة.");
  }
  console.log("================================================================================\n");

  return { success: overallPassed, actualKeyCount };
}

if (require.main === module) {
  runDryRunAudit().catch(() => {
    console.error("❌ [ERR_GENERAL] حدث خطأ أثناء تنفيذ الفحص.");
    process.exit(1);
  });
}

module.exports = {
  runDryRunAudit,
  validateConnectionUrl,
  computeFileSha256,
  auditAccountsStructure,
  validateCoreArrays,
  OFFICIAL_BACKUP_SHA256,
  EXACT_ALLOWED_HOSTNAMES
};
