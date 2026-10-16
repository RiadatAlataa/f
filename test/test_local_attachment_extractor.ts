/**
 * سكريبت اختبار وتحقق شامل لأداة استخراج المرفقات المحلية الآمنة
 * Automated Verification Test for Local Attachment Extractor
 */

import fs from "fs";
import path from "path";
import assert from "assert";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

console.log("================================================================================");
console.log("   بدء فحص واختبار أداة استخراج المرفقات المحلية (الإصدار 2.0)");
console.log("================================================================================\n");

const extractorDir = path.join(process.cwd(), "scripts", "local-attachment-extractor");

// 1. فحص وجود جميع الملفات الأساسية المعتمدة
console.log("الاختبار 1: التحقق من وجود ملفات الأداة بالأسماء الصحيحة...");
const expectedFiles = [
  "extract_attachments.cjs",
  "extract_attachments.js",
  "extract_attachments.ps1",
  "run_extractor.bat",
  "README_WINDOWS.md"
];

for (const file of expectedFiles) {
  const fullPath = path.join(extractorDir, file);
  assert(fs.existsSync(fullPath), `الملف المفقود: ${file}`);
  const stat = fs.statSync(fullPath);
  assert(stat.size > 50, `حجم الملف ${file} غير طبيعي أو فارغ`);
  console.log(`  ✔ تم التحقق من وجود الملف: ${file} (${stat.size} بايت)`);
}

// 2. تحميل واختبار دوال المحرك الرئيسي المعتمد (extract_attachments.cjs)
console.log("\nالاختبار 2: التحقق من استيراد وعمل دوال extract_attachments.cjs...");
const extractorEngine = require(path.join(extractorDir, "extract_attachments.cjs"));
assert(typeof extractorEngine.validateMagicBytes === "function", "دالة validateMagicBytes غير متوفرة");
assert(typeof extractorEngine.sanitizeUrlForLogging === "function", "دالة sanitizeUrlForLogging غير متوفرة");
assert(typeof extractorEngine.discoverAttachments === "function", "دالة discoverAttachments غير متوفرة");
assert(typeof extractorEngine.resolveCategory === "function", "دالة resolveCategory غير متوفرة");
assert(extractorEngine.ALLOWED_HOSTS instanceof Set, "قائمة ALLOWED_HOSTS غير معرفة كـ Set");
console.log("  ✔ تم استيراد كافة الدوال المصدرة من extract_attachments.cjs بنجاح.");

// 3. فحص التواقيع الرقمية للملفات (Magic Bytes) ومنع تضليل HTML
console.log("\nالاختبار 3: اختبار كشف ومنع صفحات HTML ورسائل الخطأ المتنكرة في صيغة PDF أو صور...");

// 3.1 تجربة ملف PDF حقيقي
const validPdfBuffer = Buffer.from("%PDF-1.7\n%synthetic test pdf content\n%%EOF");
const pdfRes = extractorEngine.validateMagicBytes(validPdfBuffer, ".pdf");
assert(pdfRes.valid === true, "فشل التحقق من ملف PDF صالح");
console.log("  ✔ تم قبول مستند PDF حقيقي صالح بنجاح.");

// 3.2 تجربة ملف HTML متنكر في صورة PDF (مثل صفحة 404 أو تسجيل دخول)
const fakePdfHtmlBuffer = Buffer.from("<!DOCTYPE html><html><head><title>Error 404 Not Found</title></head><body>File not found</body></html>");
const fakePdfRes = extractorEngine.validateMagicBytes(fakePdfHtmlBuffer, ".pdf");
assert(fakePdfRes.valid === false, "لم يتم كشف صفحة HTML المتنكرة كـ PDF!");
assert(fakePdfRes.reason.includes("HTML") || fakePdfRes.reason.includes("توقيع"), "السبب غير واضح");
console.log(`  ✔ تم بنجاح رصد وحظر صفحة HTML متنكرة في صيغة PDF: "${fakePdfRes.reason}"`);

// 3.3 تجربة ملف خطأ JSON متنكر في صورة PNG
const errorJsonBuffer = Buffer.from('{"error": "Unauthorized access", "status": 401}');
const fakePngRes = extractorEngine.validateMagicBytes(errorJsonBuffer, ".png");
assert(fakePngRes.valid === false, "لم يتم كشف رسالة خطأ JSON المتنكرة كصورة PNG!");
console.log(`  ✔ تم بنجاح رصد وحظر رسالة خطأ JSON متنكرة في صورة PNG.`);

// 3.4 تجربة صورة PNG حقيقية بتوقيع 89 50 4E 47
const validPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
const pngRes = extractorEngine.validateMagicBytes(validPngBuffer, ".png");
assert(pngRes.valid === true, "فشل التحقق من صورة PNG صالحة");
console.log("  ✔ تم قبول صورة PNG صالحة ذات توقيع رقمي أصلي.");

// 4. اختبار تجريد الروابط من المعلمات الحساسة (PII & Auth Token Sanitization)
console.log("\nالاختبار 4: اختبار تجريد الروابط من الرموز والمعلمات الحساسة في التقارير...");
const rawUrlWithSensitiveParams = "https://riadataleata-api.onrender.com/uploads/beneficiaries/doc_test.pdf?sessionToken=secret_token_12345&nationalId=1029384756&name=Ahmad";
const sanitizedUrl = extractorEngine.sanitizeUrlForLogging(rawUrlWithSensitiveParams);
assert(!sanitizedUrl.includes("secret_token_12345"), "تم تسريب رمز الجلسة في الرابط المنظف!");
assert(!sanitizedUrl.includes("1029384756"), "تم تسريب رقم الهوية في الرابط المنظف!");
assert(sanitizedUrl === "https://riadataleata-api.onrender.com/uploads/beneficiaries/doc_test.pdf", `الرابط المنظف غير مطابق: ${sanitizedUrl}`);
console.log(`  ✔ الرابط الأصلي الحساس: ${rawUrlWithSensitiveParams.substring(0, 70)}...`);
console.log(`  ✔ الرابط المنظف للتقرير: ${sanitizedUrl}`);

// 5. اختبار قيود النطاقات المعتمدة (Security Boundaries & Anti-SSRF)
console.log("\nالاختبار 5: التحقق من حظر النطاقات والروابط الخارجية غير المعتمدة...");
assert(extractorEngine.ALLOWED_HOSTS.has("riadataleata-api.onrender.com"), "نطاق Render مفقود");
assert(extractorEngine.ALLOWED_HOSTS.has("www.riadataleata.com"), "نطاق الجمعية الرئيسي مفقود");
assert(!extractorEngine.ALLOWED_HOSTS.has("evil-phishing-domain.com"), "يجب ألا يسمح بنطاقات مجهولة");
assert(!extractorEngine.ALLOWED_HOSTS.has("google.com"), "يجب ألا يسمح بنطاقات خارجية");
console.log("  ✔ النطاقات المعتمدة محصورة بدقة في خوادم الجمعية الرسمية.");

// 6. اختبار استخراج وتصنيف المرفقات من شجرة بيانات اصطناعية
console.log("\nالاختبار 6: اختبار استخراج وتصنيف المرفقات من كائن بيانات...");
const sampleDb = {
  generalConfig: {
    officialLicenseUrl: "/uploads/license/license_official_1790788997771.png"
  },
  cardTemplates: [
    { id: "tmpl-1", backgroundUrl: "https://riadataleata-api.onrender.com/card_templates/volunteer_bg.png" }
  ],
  beneficiaries: [
    { id: "ben-1", idDocument: "/uploads/beneficiaries/id_card_sample.pdf", nationalId: "1234567890" }
  ],
  volunteers: [
    { id: "vol-1", contractUrl: "/uploads/volunteers/volunteer_pledge.pdf" }
  ],
  externalTrap: {
    unauthorizedAvatar: "https://external-untrusted-server.com/malicious.png"
  },
  dataUriTrap: {
    base64Data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }
};

const discovered = extractorEngine.discoverAttachments(sampleDb);
console.log(`  ✔ تم اكتشاف ${discovered.length} مرفقات في البيانات الاصطناعية.`);

// التحقق من استبعاد data: base64
const hasBase64 = discovered.some((d: any) => d.rawUrl.startsWith("data:"));
assert(!hasBase64, "تم تضمين رابط base64 خطأً!");
console.log("  ✔ تم استبعاد وسائط base64 الضخمة لتفادي إجهاد الذاكرة.");

// التحقق من التصنيف
const licenseCategory = extractorEngine.resolveCategory("generalConfig.officialLicenseUrl", "/uploads/license/license.png");
assert(licenseCategory === "licenses", `تصنيف الترخيص غير صحيح: ${licenseCategory}`);

const cardCategory = extractorEngine.resolveCategory("cardTemplates.0.backgroundUrl", "/card_templates/volunteer_bg.png");
assert(cardCategory === "cards", `تصنيف البطاقة غير صحيح: ${cardCategory}`);

const beneficiaryCategory = extractorEngine.resolveCategory("beneficiaries.0.idDocument", "/uploads/beneficiaries/id_card.pdf");
assert(beneficiaryCategory === "beneficiaries", `تصنيف المستفيدين غير صحيح: ${beneficiaryCategory}`);
console.log("  ✔ تصنيف المجلدات دقيق ومطابق لمتطلبات تنظيم الأرشيف المحلي.");

// 7. التحقق من تطابق ملف تشغيل الويندوز run_extractor.bat
console.log("\nالاختبار 7: التحقق من كود run_extractor.bat وREADME_WINDOWS.md...");
const batContent = fs.readFileSync(path.join(extractorDir, "run_extractor.bat"), "utf8");
assert(batContent.includes("extract_attachments.cjs"), "run_extractor.bat لا يشير إلى extract_attachments.cjs");
assert(batContent.includes("extract_attachments.ps1"), "run_extractor.bat لا يحتوي على بديل PowerShell");

const readmeContent = fs.readFileSync(path.join(extractorDir, "README_WINDOWS.md"), "utf8");
assert(readmeContent.includes("extract_attachments.cjs"), "دليل التشغيل لا يوضح اسم الملف الفعلي extract_attachments.cjs");
assert(!readmeContent.includes("Inspect / فحص"), "دليل التشغيل لا يزال يطلب فتح أدوات المطور (F12)!");
assert(!readmeContent.includes("F12"), "دليل التشغيل لا يزال يذكر مفتاح F12!");
assert(readmeContent.includes("تسجيل الدخول الإداري المباشر"), "دليل التشغيل لا يوضح ميزة تسجيل الدخول المباشر الجديدة");
console.log("  ✔ تم التحقق من خلو دليل التشغيل وملف BAT من أي إشارة لأدوات المطور أو نسخ الرموز يدوياً.");

console.log("\n================================================================================");
console.log("النتيجة: تم اجتياز كافة اختبارات أداة الاستخراج المحلية الآمنة بنجاح 100%!");
console.log("================================================================================\n");
