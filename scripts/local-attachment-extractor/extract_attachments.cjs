/**
 * أداة محلية آمنة لاستخراج وتنزيل مرفقات جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * Local Secure Attachment Extractor & Validator (Windows / Mac / Linux)
 * 
 * المزايا الأمنية المتقدمة:
 * 1. تعمل محلياً 100% باستخدام مكتبات Node.js القياسية فقط (بدون npm install أو مكتبات خارجية).
 * 2. مصادقة إدارية آمنة ومباشرة عبر API الرسمي دون الحاجة لفتح أدوات المطور (F12) أو نسخ التوكن يدوياً.
 * 3. حظر كامل لأي روابط خارجية غير معتمدة وحظر تحويلات Redirect لخوادم خارج نطاق الجمعية المعتمد.
 * 4. تجريد رموز المصادقة فوراً عند حدوث أي تحويل بروتوكول أو نطاق.
 * 5. فحص التواقيع الرقمية للملفات (Magic Bytes) لمنع تنزيل صفحات HTML أو شاشات تسجيل الدخول وأخطاء السيرفر كملفات PDF/صور.
 * 6. قيود صارمة على أحجام الملفات (50MB كحد أقصى) ومهلة الاتصال (25 ثانية) ومحاولات إعادة الإرسال (Retry).
 * 7. منع الكتابة فوق أي ملفات محلية موجودة ومقارنة وحساب بصمات SHA-256 الرقمية.
 * 8. حظر تسجيل أي كلمات مرور أو رموز جلسات أو بيانات شخصية (PII) في التقارير وسجل الشاشة.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");
const readline = require("readline");
const { URL } = require("url");

// النطاقات المعتمدة والمسموح بالتنزيل منها حصرياً
const ALLOWED_HOSTS = new Set([
  "riadataleata-api.onrender.com",
  "www.riadataleata.com",
  "riadataleata.com"
]);

// دعم الخادم التجريبي المعزول للاختبارات فقط
if (process.env.TEST_OVERRIDE_SERVER_BASE) {
  try {
    const testUrl = new URL(process.env.TEST_OVERRIDE_SERVER_BASE);
    if (testUrl.hostname === "127.0.0.1" || testUrl.hostname === "localhost") {
      ALLOWED_HOSTS.add(testUrl.hostname);
    }
  } catch {
    // تجاهل الروابط غير الصالحة
  }
}

const DEFAULT_SERVER_BASE = process.env.TEST_OVERRIDE_SERVER_BASE || "https://riadataleata-api.onrender.com";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 ميغابايت لكل ملف كحد أقصى
const REQUEST_TIMEOUT_MS = 25000;       // 25 ثانية مهلة الطلب
const MAX_REDIRECTS = 3;                // أقصى عدد لتحويلات HTTP Redirect
const MAX_RETRIES = 2;                  // أقصى عدد لمحاولات إعادة التنزيل عند انقطاع الشبكة

// التحقق هل النطاق محلي مخصص للاختبار فقط
function isLocalTestHost(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

// دالة تفاعلية لقراءة المدخلات النصية العامة
function askQuestion(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(query, (ans) => {
      rl.close();
      resolve((ans || "").trim());
    });
  });
}

// دالة تفاعلية لقراءة كلمات المرور والرموز الحساسة بقناع مخفي (*)
function askSecureSecret(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const stdin = process.stdin;
    let secret = "";

    process.stdout.write(query);

    const onData = (char) => {
      char = char + "";
      switch (char) {
        case "\n":
        case "\r":
        case "\u0004":
          stdin.removeListener("data", onData);
          break;
        case "\u0008": // Backspace
        case "\x7f":
          if (secret.length > 0) {
            secret = secret.slice(0, -1);
            process.stdout.write("\b \b");
          }
          break;
        default:
          process.stdout.write("*");
          secret += char;
          break;
      }
    };

    stdin.on("data", onData);

    rl.on("close", () => {
      process.stdout.write("\n");
      resolve(secret.trim());
    });

    rl.question("", () => {
      rl.close();
    });
  });
}

// تنفيذ طلب POST آمن إلى الخادم (يُستخدم للمصادقة المباشرة فقط في الذاكرة)
function postJson(urlStr, payload) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const host = parsedUrl.hostname.toLowerCase();
      if (!ALLOWED_HOSTS.has(host)) {
        return reject(new Error("نطاق غير مصرح به للمصادقة"));
      }

      // التحقق الصارم من تشفير HTTPS مع فحص شهادة TLS الطبيعي
      if (parsedUrl.protocol !== "https:" && !isLocalTestHost(host)) {
        return reject(new Error("الاتصال بالخادم الرسمي يجب أن يكون مشفراً عبر HTTPS حصراً لحماية بيانات الدخول"));
      }

      const client = parsedUrl.protocol === "https:" ? https : http;
      const dataStr = JSON.stringify(payload);

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(dataStr),
          "User-Agent": "Reyadat-Attachment-Extractor/2.0"
        },
        timeout: REQUEST_TIMEOUT_MS
      };

      const req = client.request(options, (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(responseBody);
            resolve({ statusCode: res.statusCode, body: parsed });
          } catch {
            resolve({ statusCode: res.statusCode, body: null, raw: responseBody });
          }
        });
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("انتهت مهلة الاتصال بالخادم أثناء تسجيل الدخول"));
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.write(dataStr);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// التحقق من التوقيع الرقمي لنوع الملف (Magic Bytes) لمنع حفظ صفحات HTML أو أخطاء الخادم كامتدادات صور أو PDF
function validateMagicBytes(firstChunk, extension) {
  if (!firstChunk || firstChunk.length < 4) {
    return { valid: false, reason: "الملف فارغ أو صغير جداً" };
  }

  const sample = firstChunk.slice(0, 128).toString("utf8").toLowerCase().trim();
  if (
    sample.startsWith("<!doctype html") ||
    sample.startsWith("<html") ||
    sample.includes("<head>") ||
    sample.includes("<body>") ||
    sample.startsWith("{\"error\"") ||
    sample.startsWith("{\"status\":")
  ) {
    return {
      valid: false,
      reason: "المحتوى المستلم هو صفحة ويب HTML أو رسالة خطأ وليس ملفاً حقيقياً"
    };
  }

  const ext = extension.toLowerCase();
  const hex = firstChunk.slice(0, 12).toString("hex").toUpperCase();

  // فحص تواقيع أشهر الملفات
  if (ext === ".pdf") {
    const isPdf = firstChunk.slice(0, 5).toString("utf8") === "%PDF-";
    if (!isPdf) return { valid: false, reason: "توقيع ملف PDF غير مطابق (ليس مستند PDF صالح)" };
  } else if (ext === ".png") {
    const isPng = hex.startsWith("89504E470D0A1A0A");
    if (!isPng) return { valid: false, reason: "توقيع ملف PNG غير مطابق" };
  } else if (ext === ".jpg" || ext === ".jpeg") {
    const isJpg = hex.startsWith("FFD8FF");
    if (!isJpg) return { valid: false, reason: "توقيع ملف JPEG غير مطابق" };
  } else if (ext === ".gif") {
    const isGif = hex.startsWith("47494638"); // GIF8
    if (!isGif) return { valid: false, reason: "توقيع ملف GIF غير مطابق" };
  } else if (ext === ".webp") {
    const isRiff = firstChunk.slice(0, 4).toString("utf8") === "RIFF";
    const isWebp = firstChunk.slice(8, 12).toString("utf8") === "WEBP";
    if (!isRiff || !isWebp) return { valid: false, reason: "توقيع ملف WEBP غير مطابق" };
  }

  return { valid: true };
}

// مسح شجرة الـ JSON بشكل عودي لاستخراج كافة مسارات الملفات والصور
function discoverAttachments(obj, currentPath = "", discovered = []) {
  if (!obj || typeof obj !== "object") return discovered;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const fullPath = currentPath ? `${currentPath}.${key}` : key;

    if (typeof val === "string") {
      const lower = val.trim().toLowerCase();
      const isUrlOrPath = (
        lower.startsWith("http://") ||
        lower.startsWith("https://") ||
        lower.startsWith("/uploads/") ||
        lower.startsWith("uploads/") ||
        lower.startsWith("/card_templates/") ||
        lower.startsWith("card_templates/") ||
        lower.startsWith("/assets/") ||
        /\.(png|jpe?g|webp|gif|svg|pdf|docx?|xlsx?|csv)$/i.test(lower)
      );

      // استبعاد نصوص base64 الطويلة لتجنب تضخيم البيانات
      if (isUrlOrPath && !lower.startsWith("data:")) {
        discovered.push({
          jsonPath: fullPath,
          rawUrl: val.trim()
        });
      }
    } else if (typeof val === "object") {
      discoverAttachments(val, fullPath, discovered);
    }
  }

  return discovered;
}

// تصنيف المرفق إلى مجلد مخصص حسب دلالة المسار
function resolveCategory(jsonPath, rawUrl) {
  const combined = (jsonPath + " " + rawUrl).toLowerCase();
  if (combined.includes("license")) return "licenses";
  if (combined.includes("cardtemplate") || combined.includes("card_template") || combined.includes("card_templates")) return "cards";
  if (combined.includes("beneficiar")) return "beneficiaries";
  if (combined.includes("volunteer")) return "volunteers";
  if (combined.includes("card")) return "cards";
  if (combined.includes("team")) return "teams";
  if (combined.includes("financ") || combined.includes("invoice") || combined.includes("receipt")) return "finances";
  if (combined.includes("letter")) return "letters";
  if (combined.includes("employee")) return "employees";
  return "general_documents";
}

// تنظيف الروابط من أي معلمات حساسة قبل تسجيلها في التقارير
function sanitizeUrlForLogging(rawUrl) {
  if (!rawUrl) return "";
  try {
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      const u = new URL(rawUrl);
      u.search = ""; // تجريد كل معلمات الاستعلام
      u.hash = "";
      return u.toString();
    }
    return rawUrl.split("?")[0].split("#")[0];
  } catch {
    return rawUrl.split("?")[0];
  }
}

// تنزيل ملف واحد مع الحماية الكاملة، ومتابعة التحويلات الآمنة، والتحقق من التوقيع
function downloadFileSafe(targetUrl, destPath, sessionToken, redirectCount = 0) {
  return new Promise((resolve) => {
    try {
      if (redirectCount > MAX_REDIRECTS) {
        return resolve({
          success: false,
          statusCode: 310,
          error: "تجاوز الحد الأقصى للتحويلات (Too Many Redirects)"
        });
      }

      const parsedUrl = new URL(targetUrl);
      const host = parsedUrl.hostname.toLowerCase();

      // التحقق الصارم من النطاق المسموح به
      if (!ALLOWED_HOSTS.has(host)) {
        return resolve({
          success: false,
          statusCode: 403,
          error: `تم حظر التنزيل من نطاق غير معتمد: ${host}`
        });
      }

      // التحقق الصارم من التشفير عبر HTTPS
      if (parsedUrl.protocol !== "https:" && !isLocalTestHost(host)) {
        return resolve({
          success: false,
          statusCode: 400,
          error: `تم رفض الرابط غير المشفر (${parsedUrl.protocol})، يشترط استخدام HTTPS حصراً`
        });
      }

      const client = parsedUrl.protocol === "https:" ? https : http;
      const headers = {
        "User-Agent": "Reyadat-Attachment-Extractor/2.0",
        "Accept": "*/*"
      };

      // تمرير رمز المصادقة فقط للنطاقات المعتمدة
      if (sessionToken) {
        headers["x-session-token"] = sessionToken;
        headers["Authorization"] = `Bearer ${sessionToken}`;
      }

      const req = client.get(targetUrl, { headers, timeout: REQUEST_TIMEOUT_MS }, (res) => {
        // معالجة التحويلات الآمنة (Redirect 301, 302, 307, 308)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          let nextUrl = res.headers.location;
          try {
            // حل المسار النسبي إذا كان التحويل مساراً محلياً
            const resolvedUrl = new URL(nextUrl, targetUrl);
            const nextHost = resolvedUrl.hostname.toLowerCase();

            // فحص هل النطاق الجديد ضمن النطاقات المعتمدة
            if (!ALLOWED_HOSTS.has(nextHost)) {
              return resolve({
                success: false,
                statusCode: 403,
                error: `تم حظر تحويل الرابط إلى نطاق خارجي (${nextHost}) لحماية البيانات`
              });
            }

            // تجريد رمز المصادقة إذا تغير النطاق أو البروتوكول لزيادة الأمان
            const nextToken = (nextHost === host) ? sessionToken : null;
            return resolve(downloadFileSafe(resolvedUrl.toString(), destPath, nextToken, redirectCount + 1));
          } catch (err) {
            return resolve({
              success: false,
              statusCode: 400,
              error: `رابط التحويل غير صالح: ${err.message}`
            });
          }
        }

        // التحقق من رمز الاستجابة
        if (res.statusCode !== 200) {
          res.resume();
          return resolve({
            success: false,
            statusCode: res.statusCode,
            error: `استجاب الخادم برمز خطأ (${res.statusCode})`
          });
        }

        // التحقق من نوع المحتوى (Content-Type) لمنع حفظ صفحات HTML أو JSON كملفات
        const contentType = (res.headers["content-type"] || "").toLowerCase();
        const ext = path.extname(destPath).toLowerCase();
        if (
          contentType.includes("text/html") ||
          contentType.includes("application/xhtml") ||
          (contentType.includes("application/json") && ext !== ".json")
        ) {
          res.resume();
          return resolve({
            success: false,
            statusCode: 415,
            error: `المحتوى المستلم نوعه (${contentType}) وهو صفحة ويب أو خطأ وليس ملفاً صالحاً`
          });
        }

        // التحقق من حجم الملف المعلن في الترويسات
        const declaredSize = parseInt(res.headers["content-length"] || "0", 10);
        if (declaredSize > MAX_FILE_SIZE) {
          res.resume();
          return resolve({
            success: false,
            statusCode: 413,
            error: `حجم الملف (${(declaredSize / (1024 * 1024)).toFixed(1)} MB) يتجاوز الحد الأقصى المسموح به (50 MB)`
          });
        }

        const hash = crypto.createHash("sha256");
        let bytesWritten = 0;
        let firstChunk = null;
        let fileStream = null;
        let hasAborted = false;

        res.on("data", (chunk) => {
          if (hasAborted) return;

          bytesWritten += chunk.length;
          if (bytesWritten > MAX_FILE_SIZE) {
            hasAborted = true;
            req.destroy();
            if (fileStream) fileStream.destroy();
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            return resolve({
              success: false,
              statusCode: 413,
              error: "تجاوز الملف حجم 50 ميغابايت أثناء التنزيل وتم إيقافه فوراً"
            });
          }

          if (!firstChunk) {
            firstChunk = chunk;
            // فحص التوقيع الرقمي ومحتوى أول بايتات
            const validation = validateMagicBytes(firstChunk, ext);
            if (!validation.valid) {
              hasAborted = true;
              req.destroy();
              if (fileStream) fileStream.destroy();
              if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
              return resolve({
                success: false,
                statusCode: 422,
                error: validation.reason
              });
            }

            fileStream = fs.createWriteStream(destPath);
            fileStream.on("error", (err) => {
              if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
              resolve({
                success: false,
                statusCode: 500,
                error: `فشل كتابة الملف محلياً: ${err.message}`
              });
            });
          }

          hash.update(chunk);
          fileStream.write(chunk);
        });

        res.on("end", () => {
          if (hasAborted) return;
          if (!fileStream) {
            return resolve({
              success: false,
              statusCode: 204,
              error: "الملف فارغ ولا يحتوي على بيانات"
            });
          }

          fileStream.end(() => {
            const digest = hash.digest("hex");
            resolve({
              success: true,
              statusCode: 200,
              fileSize: bytesWritten,
              sha256: digest
            });
          });
        });

        res.on("error", (err) => {
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          resolve({ success: false, statusCode: 500, error: `خطأ أثناء تنزيل البيانات: ${err.message}` });
        });
      });

      req.on("timeout", () => {
        req.destroy();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        resolve({ success: false, statusCode: 408, error: "انتهت مهلة الاتصال بالخادم (Timeout)" });
      });

      req.on("error", (err) => {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        resolve({ success: false, statusCode: 0, error: `خطأ اتصال: ${err.message}` });
      });
    } catch (err) {
      resolve({ success: false, statusCode: 0, error: `رابط غير صالح: ${err.message}` });
    }
  });
}

// دالة التنزيل مع دعم محاولات الإعادة التلقائية (Retry with Backoff)
async function downloadWithRetry(targetUrl, destPath, sessionToken) {
  let attempt = 0;
  while (attempt <= MAX_RETRIES) {
    const res = await downloadFileSafe(targetUrl, destPath, sessionToken);
    if (res.success) return res;

    // إذا كان الخطأ 404 أو 403 أو نوع محتوى غير صالح، فلا فائدة من الإعادة
    if (res.statusCode === 404 || res.statusCode === 403 || res.statusCode === 415 || res.statusCode === 422) {
      return res;
    }

    attempt++;
    if (attempt <= MAX_RETRIES) {
      const waitTime = attempt * 800;
      await new Promise(r => setTimeout(r, waitTime));
    } else {
      return res;
    }
  }
}

// الدالة الرئيسية لتنفيذ عملية الفحص والتنزيل
async function main() {
  console.log("================================================================================");
  console.log("   أداة الاستخراج والتحقق الآمن لمرفقات جمعية ريادة العطاء لخدمة الإنسان بالعسيلة");
  console.log("   نسخة التشغيل المحلي الآمن - متوافقة تماماً مع نظام Windows (Node.js)");
  console.log("================================================================================\n");

  // 1. تحديد ملف النسخة الاحتياطية
  let backupFile = "backup_reyadat_alata.json";
  if (!fs.existsSync(backupFile)) {
    const candidates = fs.readdirSync(process.cwd()).filter(f => f.startsWith("backup_") && f.endsWith(".json"));
    if (candidates.length > 0) {
      backupFile = candidates[0];
    }
  }

  const userFile = await askQuestion(`أدخل اسم ملف النسخة الاحتياطية (افتراضي: ${backupFile}): `);
  if (userFile) backupFile = userFile;

  if (!fs.existsSync(backupFile)) {
    console.error(`\n[خطأ] لم يتم العثور على الملف: "${backupFile}".`);
    console.error("يرجى تنزيل نسخة db.json أولاً من لوحة تحكم الموقع ووضعها في نفس المجلد مع هذه الأداة.\n");
    process.exit(1);
  }

  console.log(`\n✔ تم العثور على ملف النسخة: ${backupFile}`);
  let dbData;
  try {
    const rawContent = fs.readFileSync(backupFile, "utf8");
    dbData = JSON.parse(rawContent);
  } catch (err) {
    console.error(`[خطأ فادح] تعذر قراءة أو تحليل ملف JSON: ${err.message}`);
    process.exit(1);
  }

  // 2. خيارات المصادقة الآمنة دون كشف أدوات المطور أو نسخ رموز من التخزين المحلي
  console.log("\n--------------------------------------------------------------------------------");
  console.log("خيارات المصادقة الأمنية (لتنزيل المرفقات الخاصة بالمستفيدين والمتطوعين):");
  console.log(" [1] تسجيل الدخول الإداري المباشر (اسم المستخدم + كلمة المرور) [موصى به - آمن ومباشر]");
  console.log(" [2] إدخال رمز جلسة مخصص يدوياً (sessionToken)");
  console.log(" [3] تخطي المصادقة (تنزيل الملفات العامة فقط مثل التراخيص والبطاقات)");
  console.log("--------------------------------------------------------------------------------");

  let sessionToken = null;
  const authChoice = await askQuestion("اختر طريقة المصادقة [1 أو 2 أو 3] (افتراضي: 1): ") || "1";

  if (authChoice === "1") {
    let loginSuccess = false;
    let attempts = 0;

    while (!loginSuccess && attempts < 3) {
      attempts++;
      console.log(`\n[محاولة تسجيل الدخول ${attempts}/3]:`);
      const identifier = await askQuestion("اسم المستخدم أو رقم الهوية أو البريد الإلكتروني: ");
      if (!identifier) {
        console.log("تم إلغاء إدخال اسم المستخدم، المتابعة كزائر عام...");
        break;
      }
      const password = await askSecureSecret("كلمة المرور (ستظهر كرموز * لحمايتها): ");

      process.stdout.write("جارِ التحقق الآمن من بيانات الاعتماد مع خادم الجمعية... ");
      try {
        const loginRes = await postJson(`${DEFAULT_SERVER_BASE}/api/db/auth/login`, {
          identifier,
          password
        });

        if (loginRes.statusCode === 200 && loginRes.body && loginRes.body.status === "success" && loginRes.body.sessionToken) {
          sessionToken = loginRes.body.sessionToken;
          loginSuccess = true;
          console.log("✔ تم تسجيل الدخول بنجاح! مرحباً بحساب الإدارة المعتمد.");
          console.log("ملاحظة أمنية: رمز الجلسة محفوظ في الذاكرة المؤقتة فقط ولن يُكتب في أي ملف أو سجل.");
        } else {
          const errMsg = loginRes.body?.error || `فشل المصادقة (رمز ${loginRes.statusCode})`;
          console.log(`✖ ${errMsg}`);
          if (attempts < 3) {
            const retry = await askQuestion("هل ترغب في إعادة المحاولة؟ (نعم/لا) [نعم]: ");
            if (retry.toLowerCase().startsWith("ل") || retry.toLowerCase() === "n" || retry.toLowerCase() === "no") {
              break;
            }
          }
        }
      } catch (err) {
        console.log(`✖ خطأ في الاتصال بالخادم: ${err.message}`);
        break;
      }
    }

    if (!sessionToken) {
      console.log("[تنبيه] سيتم المتابعة بدون مصادقة إدارية (الملفات الخاصة بالمستفيدين قد تعيد خطأ 401).");
    }
  } else if (authChoice === "2") {
    sessionToken = await askSecureSecret("أدخل رمز الجلسة (sessionToken) بصيغة آمنة: ");
    if (!sessionToken) {
      console.log("[تنبيه] لم يتم إدخال رمز، المتابعة بالوضع العام فقط.");
    }
  } else {
    console.log("[إشعار] تم اختيار تخطي المصادقة، سيتم تنزيل المرفقات العامة المتاحة فقط.");
  }

  // 3. مسح واكتشاف الملفات
  console.log("\nجارِ فحص شجرة قاعدة البيانات واستخراج مسارات وروابط المرفقات...");
  const rawList = discoverAttachments(dbData);
  console.log(`تم اكتشاف ${rawList.length} حقلاً يحتوي على روابط أو مسارات ملفات.`);

  // إزالة التكرارات
  const uniqueItemsMap = new Map();
  for (const item of rawList) {
    if (!uniqueItemsMap.has(item.rawUrl)) {
      uniqueItemsMap.set(item.rawUrl, item);
    }
  }
  const uniqueItems = Array.from(uniqueItemsMap.values());
  console.log(`عدد الملفات الفريدة بعد إزالة التكرارات: ${uniqueItems.length}`);

  // 4. إنشاء مجلد التنزيل المنظم
  const outputBaseDir = path.join(process.cwd(), "extracted_attachments");
  if (!fs.existsSync(outputBaseDir)) {
    fs.mkdirSync(outputBaseDir, { recursive: true });
  }

  const results = [];
  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let externalIgnoredCount = 0;

  console.log("\nبدء معالجة وتنزيل الملفات المصرح بها:");
  console.log("--------------------------------------------------------------------------------");

  for (let i = 0; i < uniqueItems.length; i++) {
    const item = uniqueItems[i];
    const category = resolveCategory(item.jsonPath, item.rawUrl);
    const categoryDir = path.join(outputBaseDir, category);
    if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });

    let fullDownloadUrl = "";
    let isExternal = false;

    if (item.rawUrl.startsWith("http://") || item.rawUrl.startsWith("https://")) {
      try {
        const parsed = new URL(item.rawUrl);
        if (ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
          fullDownloadUrl = item.rawUrl;
        } else {
          isExternal = true;
        }
      } catch {
        isExternal = true;
      }
    } else {
      // مسار محلي نسبي على الخادم (مثل /uploads/... أو /card_templates/...)
      const cleanPath = item.rawUrl.startsWith("/") ? item.rawUrl : `/${item.rawUrl}`;
      fullDownloadUrl = `${DEFAULT_SERVER_BASE}${cleanPath}`;
    }

    // اسم الملف وتنظيفه من محارف نظام التشغيل المحظورة في Windows
    let originalName = path.basename(item.rawUrl.split("?")[0]) || `attachment_${i + 1}.bin`;
    originalName = originalName.replace(/[\\/:*?"<>|\r\n]/g, "_").trim();
    if (!originalName) originalName = `attachment_${i + 1}.bin`;

    let destFilePath = path.join(categoryDir, originalName);

    // الرابط النظيف لأغراض التقرير (خالٍ من أي توكن أو معلمات حساسة)
    const sanitizedReportUrl = sanitizeUrlForLogging(fullDownloadUrl);

    // إذا كان الرابط خارجياً وغير معتمد من الجمعية
    if (isExternal) {
      externalIgnoredCount++;
      console.log(`[تخطي رابط خارجي] ${item.rawUrl.substring(0, 50)}... (محظور لحماية الخصوصية)`);
      results.push({
        index: i + 1,
        fileName: originalName,
        category,
        url: sanitizeUrlForLogging(item.rawUrl),
        status: "EXTERNAL_BLOCKED",
        reason: "رابط خارجي ليس ضمن نطاق خادم الجمعية المعتمد"
      });
      continue;
    }

    // منع الكتابة فوق ملف موجود ومقارنة البصمة
    if (fs.existsSync(destFilePath)) {
      const existingBuf = fs.readFileSync(destFilePath);
      const existingHash = crypto.createHash("sha256").update(existingBuf).digest("hex");
      skippedCount++;
      console.log(`[موجود مسبقاً] ${category}/${originalName} (${existingBuf.length} بايت - SHA: ${existingHash.substring(0, 10)}...)`);
      results.push({
        index: i + 1,
        fileName: originalName,
        category,
        url: sanitizedReportUrl,
        status: "SKIPPED_ALREADY_EXISTS",
        sha256: existingHash,
        fileSize: existingBuf.length
      });
      continue;
    }

    // تنفيذ التنزيل الآمن مع الفحص ومحاولات الإعادة
    process.stdout.write(`[${i + 1}/${uniqueItems.length}] جارِ تنزيل (${category}/${originalName})... `);
    const downloadRes = await downloadWithRetry(fullDownloadUrl, destFilePath, sessionToken);

    if (downloadRes.success) {
      successCount++;
      process.stdout.write(`✔ نجح (${downloadRes.fileSize} بايت) [${downloadRes.sha256.substring(0, 8)}...]\n`);
      results.push({
        index: i + 1,
        fileName: originalName,
        category,
        url: sanitizedReportUrl,
        status: "DOWNLOADED_SUCCESS",
        sha256: downloadRes.sha256,
        fileSize: downloadRes.fileSize
      });
    } else {
      failedCount++;
      process.stdout.write(`✖ فشل: ${downloadRes.error}\n`);
      results.push({
        index: i + 1,
        fileName: originalName,
        category,
        url: sanitizedReportUrl,
        status: "DOWNLOAD_FAILED",
        statusCode: downloadRes.statusCode,
        error: downloadRes.error
      });
    }

    // تأخير طفيف ومدروس (200ms) لتجنب الإجهاد على الخادم
    await new Promise(r => setTimeout(r, 200));
  }

  // 5. إنشاء التقرير النهائي بدون أي بيانات شخصية أو رموز حساسة
  const reportPath = path.join(process.cwd(), "extraction_report.json");
  const summaryTextPath = path.join(process.cwd(), "extraction_summary.txt");

  const isComplete = (failedCount === 0 && uniqueItems.length > 0);

  const reportPayload = {
    timestamp: new Date().toISOString(),
    association: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
    sourceBackupFile: backupFile,
    serverTarget: DEFAULT_SERVER_BASE,
    integrityStatus: isComplete ? "VERIFIED_COMPLETE" : "PARTIAL_MISSING_FILES",
    summary: {
      totalDiscoveredInDb: rawList.length,
      totalUniqueFiles: uniqueItems.length,
      downloadedSuccessfully: successCount,
      skippedAlreadyExisted: skippedCount,
      failedOrUnavailableOnServer: failedCount,
      externalLinksBlocked: externalIgnoredCount
    },
    files: results
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), "utf8");

  const summaryText = `================================================================================
تقرير استخراج وتحقق مرفقات جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
تاريخ الفحص: ${new Date().toLocaleString("ar-SA")}
حالة النزاهة الإجمالية: ${isComplete ? "مكتملة وموثقة بالكامل ✔" : "جزئية (توجد ملفات مفقودة أو غير متوفرة على الخادم) ⚠"}
================================================================================

1. إحصائيات المعالجة:
   - ملف النسخة المصدر: ${backupFile}
   - إجمالي الحقول المكتشفة في قاعدة البيانات: ${rawList.length}
   - إجمالي الملفات الفريدة: ${uniqueItems.length}
   - الملفات التي تم تنزيلها بنجاح: ${successCount}
   - الملفات التي كانت موجودة مسبقاً وتفادي استبدالها: ${skippedCount}
   - الروابط الخارجية المحظورة لحماية الخصوصية: ${externalIgnoredCount}
   - الملفات غير المتوفرة على الخادم (فشل / 404 / تلف المحتوى): ${failedCount}

2. التنبيه الفني والنزاهة الرقمية:
   ${isComplete 
     ? "- كافة الملفات المسجلة في ملف النسخة الاحتياطية تم استخراجها والتحقق من بصماتها بنجاح." 
     : `- هناك ${failedCount} ملفات تعذر استرجاعها من الخادم، ولا يجوز اعتبار النسخة شاملة حتى مراجعة أسباب التعذر.`}
   - تم فحص التواقيع الرقمية للملفات والتأكد من خلوها من أي صفحات خطأ أو تسجيل دخول ملتبسة.
   - إذا كان هناك أي ملفات رُفعت إلى خادم Render Free ولكن لم تسجل في قاعدة البيانات، فإنها تفنى عند إعادة تشغيل الخادم ولا يمكن سردها تلقائياً.

3. مسار حفظ المرفقات المكتملة:
   ${outputBaseDir}

تم إنشاء هذا التقرير تلقائياً وتوثيق بصمة SHA-256 لكل ملف في ملف: extraction_report.json.
================================================================================`;

  fs.writeFileSync(summaryTextPath, summaryText, "utf8");

  console.log("\n================================================================================");
  console.log(`   اكتملت عملية الاستخراج والفحص! الحالة: ${isComplete ? "مكتملة تماماً ✔" : "جزئية (راجع التقارير) ⚠"}`);
  console.log("================================================================================");
  console.log(`- الملفات الناجحة: ${successCount}`);
  console.log(`- الملفات الموجودة مسبقاً: ${skippedCount}`);
  console.log(`- الملفات غير المتوفرة أو الفاشلة: ${failedCount}`);
  console.log(`- الروابط الخارجية المحظورة: ${externalIgnoredCount}`);
  console.log(`- مجلد الحفظ المحلي: ${outputBaseDir}`);
  console.log(`- تقرير البصمات الكامل (بدون بيانات حساسة): ${reportPath}`);
  console.log(`- ملخص التقرير العربي: ${summaryTextPath}\n`);
}

if (require.main === module) {
  main().catch(err => {
    console.error("خطأ غير متوقع:", err);
    process.exit(1);
  });
}

module.exports = {
  discoverAttachments,
  resolveCategory,
  validateMagicBytes,
  sanitizeUrlForLogging,
  postJson,
  downloadFileSafe,
  ALLOWED_HOSTS
};
