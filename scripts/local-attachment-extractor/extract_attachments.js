/**
 * أداة استخراج المرفقات المحلية - مشغل ES Module المتوافق
 * يقوم بتشغيل المحرك المعتمد extract_attachments.cjs بسلاسة عبر Node.js
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// استيراد وتشغيل المحرك الرئيسي المعتمد
require("./extract_attachments.cjs");
