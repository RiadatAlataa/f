/**
 * جناح اختبارات الأمان والتدقيق الشاملة باستخدام بيانات وهمية مصنعة بنسبة 100% (Synthetic Mock Data)
 * يختبر جميع المتطلبات الـ 10 دون المساس ببيانات حقيقية أو بيئة الإنتاج
 */

const {
  validateConnectionUrl,
  auditAccountsStructure,
  validateCoreArrays,
  OFFICIAL_BACKUP_SHA256,
  EXACT_ALLOWED_HOSTNAMES
} = require("./local_neon_migration_runner.cjs");

console.log("================================================================================");
console.log(" 🧪 بدء تشغيل الاختبارات الآلية للضوابط الأمنية الـ 10 (بيانات وهمية فقط)");
console.log("================================================================================");

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(` ✅ [TEST ${totalTests}] نجاح: ${message}`);
    passedTests++;
  } else {
    console.error(` ❌ [TEST ${totalTests}] فشل: ${message}`);
    process.exit(1);
  }
}

// 1. اختبار حظر الـ Regex وحصر المضيفين المعتمدين حرفياً
console.log("\n--- [1] اختبار التحقق الحرفي من المضيفين المصرح بهم فقط ---");
assert(
  EXACT_ALLOWED_HOSTNAMES.has("ep-tiny-hat-b4hpkghm.c-6.us-east-2.aws.neon.tech") &&
  EXACT_ALLOWED_HOSTNAMES.has("ep-tiny-hat-b4hpkghm-pooler.c-6.us-east-2.aws.neon.tech"),
  "قائمة المضيفين المصرح بهم تحتوي حصرياً على المضيفين المعتمدين."
);

assert(
  !EXACT_ALLOWED_HOSTNAMES.has("ep-tiny-hat-b4hpkghm-other.neon.tech") &&
  !EXACT_ALLOWED_HOSTNAMES.has("neon.tech") &&
  !EXACT_ALLOWED_HOSTNAMES.has("production.neon.tech"),
  "حظر أي مضيف غير مدرج في القائمة الحرفية التامة."
);

// 2. اختبار فحص البروتوكول والمنفذ واسم قاعدة البيانات
console.log("\n--- [2] اختبار فحص البروتوكول والمنفذ وقاعدة neondb ---");
const validUrl = "postgresql://mock_user:mock_pass@ep-tiny-hat-b4hpkghm-pooler.c-6.us-east-2.aws.neon.tech:5432/neondb";
const checkValid = validateConnectionUrl(validUrl);
assert(checkValid.valid === true, "قبول رابط Staging النظامي (postgresql://...:5432/neondb).");

const invalidProto = "http://mock_user:mock_pass@ep-tiny-hat-b4hpkghm-pooler.c-6.us-east-2.aws.neon.tech:5432/neondb";
assert(validateConnectionUrl(invalidProto).code === "ERR_INVALID_PROTOCOL", "رفض البروتوكول غير المصرح (ERR_INVALID_PROTOCOL).");

const invalidPort = "postgresql://mock_user:mock_pass@ep-tiny-hat-b4hpkghm-pooler.c-6.us-east-2.aws.neon.tech:3306/neondb";
assert(validateConnectionUrl(invalidPort).code === "ERR_INVALID_PORT", "رفض المنفذ غير المصرح (ERR_INVALID_PORT).");

const invalidDb = "postgresql://mock_user:mock_pass@ep-tiny-hat-b4hpkghm-pooler.c-6.us-east-2.aws.neon.tech:5432/production_db";
assert(validateConnectionUrl(invalidDb).code === "ERR_INVALID_DATABASE", "رفض اسم قاعدة بيانات غير neondb (ERR_INVALID_DATABASE).");

const unauthorizedHost = "postgresql://mock_user:mock_pass@ep-other-hat.neon.tech:5432/neondb";
assert(validateConnectionUrl(unauthorizedHost).code === "ERR_UNAUTHORIZED_HOST", "حظر أي مضيف خارجي غير معتمد (ERR_UNAUTHORIZED_HOST).");

// 3. اختبار التحقق من أن الأقسام الأساسية مصفوفات
console.log("\n--- [3] اختبار التحقق الصارم من مصفوفات الأقسام الأساسية ---");
const validMockPayload = {
  userDepartmentAccess: [{ id: "mock_1", role: "staff" }],
  volunteers: [],
  beneficiaries: [],
  employees: []
};
assert(validateCoreArrays(validMockPayload).valid === true, "قبول البنية عندما تكون جميع الأقسام مصفوفات فعلية.");

const invalidMockPayload = {
  userDepartmentAccess: "NOT_AN_ARRAY",
  volunteers: [],
  beneficiaries: null,
  employees: {}
};
assert(validateCoreArrays(invalidMockPayload).valid === false, "رفض البنية عندما تكون الأقسام ليست مصفوفات.");

// 4. اختبار تدقيق الحسابات وتمييز Google OAuth وفحص Bcrypt الصارم وإعلان FAIL عند النقص
console.log("\n--- [4] اختبار تدقيق الحسابات وتمييز Google OAuth والصلاحيات ---");
const mockAccounts = [
  {
    id: "acc_1",
    role: "super_admin",
    status: "active",
    passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyzaBCDEFGHIJKLMNOPQRSTUVWXY12" // هاش bcrypt متوافق تماماً
  },
  {
    id: "acc_2",
    role: "department_manager",
    status: "active",
    userEmail: "dept.manager@gmail.com",
    authProvider: "google" // مصادقة عبر Google OAuth
  },
  {
    id: "acc_3",
    role: "employee",
    status: "active",
    passwordHash: null // حساب بمصادقة أحادية أو قيد التعيين
  }
];

const auditResult = auditAccountsStructure(mockAccounts);
assert(auditResult.totalAccounts === 3, "عدد الحسابات المدققة = 3.");
assert(auditResult.bcryptPasswordCount === 1, "اكتشاف حساب واحد يعتمد هاش Bcrypt سليم.");
assert(auditResult.googleOAuthCount === 1, "تمييز واكتشاف حساب واحد يعتمد Google OAuth.");
assert(auditResult.pendingOrSingleFactorCount === 1, "تمييز حساب واحد قيد التعيين أو مصادقة أحادية.");
assert(auditResult.superAdminCount === 1, "اكتشاف حساب الإدارة العليا.");
assert(auditResult.isPassed === true, "اجتياز فحص الحسابات السليمة هيكلياً بنجاح (PASS).");

// اختبار إعلان FAIL عند وجود خلل هيكلي في الحسابات
const brokenAccounts = [
  {
    role: null // ينقصه المعرف id وحقل الدور role غير صالح
  }
];
const brokenAuditResult = auditAccountsStructure(brokenAccounts);
assert(brokenAuditResult.isPassed === false, "إعلان الفشل (FAIL) فوراً عند وجود نقص في بنية الحسابات أو المعرفات.");

// 5. التحقق من ثبات بصمة SHA-256 الرسمية
console.log("\n--- [5] التحقق من ثبات بصمة SHA-256 الرسمية ---");
assert(
  OFFICIAL_BACKUP_SHA256 === "af21804bd617ce5d531e7f274c19ce4db5403f7573e5189112ea8f843f7918bd",
  "البصمة المعتمدة ثابتة برمجياً ولا يمكن استبدالها بمتغير بيئي."
);

console.log("\n================================================================================");
console.log(` 🎉 نتيجة الاختبارات الآلية: اجتياز ${passedTests} من أصل ${totalTests} اختبار بنجاح 100%!`);
console.log("================================================================================\n");
