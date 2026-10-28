#!/usr/bin/env node
/**
 * ============================================================================
 * سكربت اختبار الاتصال الحقيقي بين Cloudflare R2 ونظام جمعية ريادة العطاء
 * Real Connectivity & Integrity Probe for Cloudflare R2 Storage
 * ============================================================================
 * 
 * ضوابط الأمان الصارمة:
 * 1. قراءة المفاتيح حصراً من متغيرات البيئة وعدم طباعتها أو تخزينها.
 * 2. عزل الاختبارات بالكامل داخل مجلد: test-uploads/
 * 3. حظر تام لأي مسار يخص المستفيدين أو المتطوعين أو الموظفين.
 * 4. التحقق من تطابق بصمة SHA-256 للملف المسترجع.
 * 5. حذف ملف الاختبار المؤقت فقط والتأكد من إزالته بالكامل.
 */

import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import crypto from 'node:crypto';

// ألوان مخرجات الطرفية للوضوح
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function logHeader(text) {
  console.log(`\n${COLORS.cyan}${COLORS.bold}====================================================================${COLORS.reset}`);
  console.log(`${COLORS.cyan}${COLORS.bold}  ${text}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${COLORS.bold}====================================================================${COLORS.reset}\n`);
}

function logPass(title, details) {
  console.log(`  ${COLORS.green}${COLORS.bold}[PASS]${COLORS.reset} ${title}`);
  if (details) console.log(`         ${COLORS.gray}${details}${COLORS.reset}`);
}

function logFail(title, details) {
  console.log(`  ${COLORS.red}${COLORS.bold}[FAIL]${COLORS.reset} ${title}`);
  if (details) console.log(`         ${COLORS.yellow}${details}${COLORS.reset}`);
}

function logInfo(title, details) {
  console.log(`  ${COLORS.cyan}[INFO]${COLORS.reset} ${title}`);
  if (details) console.log(`         ${COLORS.gray}${details}${COLORS.reset}`);
}

// عينة صورة 1x1 PNG قياسية خفيفة مشفرة Base64 (67 بايت)
const DUMMY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const DUMMY_PNG_BUFFER = Buffer.from(DUMMY_PNG_BASE64, 'base64');
const EXPECTED_SHA256 = crypto.createHash('sha256').update(DUMMY_PNG_BUFFER).digest('hex');

async function streamToBuffer(readableStream) {
  if (readableStream && typeof readableStream.transformToByteArray === 'function') {
    const bytes = await readableStream.transformToByteArray();
    return Buffer.from(bytes);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (chunk) => chunks.push(chunk));
    readableStream.on('end', () => resolve(Buffer.concat(chunks)));
    readableStream.on('error', reject);
  });
}

async function runProbe() {
  logHeader('فحص الاتصال الحقيقي بـ Cloudflare R2 - جمعية ريادة العطاء');

  const results = {
    envCheck: false,
    bucketReachability: false,
    upload: false,
    integritySha256: false,
    cleanup: false,
    deletionVerified: false
  };

  // -------------------------------------------------------------------------
  // الخطوة 1: فحص متغيرات البيئة دون طباعة أي مفاتيح سرية
  // -------------------------------------------------------------------------
  console.log(`${COLORS.bold}1. فحص متغيرات البيئة (Environment Variables):${COLORS.reset}`);

  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = (process.env.R2_BUCKET_NAME || '').trim();

  const missing = [];
  if (!accountId) missing.push('R2_ACCOUNT_ID');
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!bucketName) missing.push('R2_BUCKET_NAME');

  // عرض الحالة المقنعة بأمان تام
  logInfo('حالة R2_ACCOUNT_ID:', accountId ? `[موجود - الطول: ${accountId.length} حرف]` : '[غير موجود - MISSING]');
  logInfo('حالة R2_ACCESS_KEY_ID:', accessKeyId ? `[موجود - الطول: ${accessKeyId.length} حرف]` : '[غير موجود - MISSING]');
  logInfo('حالة R2_SECRET_ACCESS_KEY:', secretAccessKey ? `[موجود - الطول: ${secretAccessKey.length} حرف]` : '[غير موجود - MISSING]');
  logInfo('حالة R2_BUCKET_NAME:', bucketName ? `[محدد: ${bucketName}]` : '[غير موجود - MISSING]');

  if (missing.length > 0) {
    logFail('فشل فحص متغيرات البيئة', `المتغيرات الناقصة: ${missing.join(', ')}`);
    console.log(`\n${COLORS.yellow}يرجى إعداد المتغيرات في نافذة PowerShell قبل تشغيل السكربت كما هو موضح في الدليل.${COLORS.reset}\n`);
    process.exit(1);
  }

  logPass('متغيرات البيئة مكتملة وصالحة', 'تم التحقق من وجود جميع المتغيرات الأربعة دون تسريب أي بيانات.');
  results.envCheck = true;

  // -------------------------------------------------------------------------
  // الخطوة 2: إنشاء عميل S3 المخصص لـ Cloudflare R2 وفحص الوصول للحاوية
  // -------------------------------------------------------------------------
  console.log(`\n${COLORS.bold}2. فحص الوصول إلى حاوية R2 (Bucket Reachability):${COLORS.reset}`);

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    logPass('تم الاتصال بالحاوية بنجاح', `الحاوية: ${bucketName} | النقطة الطرفية: ${endpoint}`);
    results.bucketReachability = true;
  } catch (err) {
    logFail('تعذر الاتصال بالحاوية أو فشلت المصادقة', `الخطأ: ${err.name || 'Error'} - ${err.message}`);
    console.log(`\n${COLORS.yellow}تحقق من صحة R2_ACCOUNT_ID و R2_ACCESS_KEY_ID و R2_SECRET_ACCESS_KEY وتصاريح الحاوية.${COLORS.reset}\n`);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // الخطوة 3: رفع ملف وهمي معزول بالكامل
  // -------------------------------------------------------------------------
  console.log(`\n${COLORS.bold}3. رفع ملف تجريبي وهمي إلى مسار معزول (test-uploads):${COLORS.reset}`);

  const testFileId = `probe_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.png`;
  const testKey = `test-uploads/${testFileId}`;

  // حاجز أمني صارم: ممنوع منعاً باتاً استهداف أي مسار غير test-uploads/
  if (!testKey.startsWith('test-uploads/')) {
    throw new Error('SECURITY VIOLATION: Refusing to interact with a key outside test-uploads/');
  }

  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: DUMMY_PNG_BUFFER,
      ContentType: 'image/png',
      Metadata: {
        'probe-purpose': 'riadat-alataa-r2-verification',
        'created-at': new Date().toISOString()
      }
    }));
    logPass('تم رفع الملف التجريبي بنجاح', `المسار: ${testKey} (الحجم: ${DUMMY_PNG_BUFFER.length} بايت)`);
    results.upload = true;
  } catch (err) {
    logFail('فشل رفع الملف التجريبي', `الخطأ: ${err.message}`);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // الخطوة 4: استرجاع الملف وفحص البصمة الرقمية (SHA-256)
  // -------------------------------------------------------------------------
  console.log(`\n${COLORS.bold}4. استرجاع الملف وفحص البصمة الرقمية (SHA-256 Integrity):${COLORS.reset}`);

  try {
    const getRes = await s3.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: testKey
    }));

    const retrievedBuffer = await streamToBuffer(getRes.Body);
    const retrievedSha256 = crypto.createHash('sha256').update(retrievedBuffer).digest('hex');

    if (retrievedSha256 === EXPECTED_SHA256) {
      logPass('تم استرجاع الملف بنجاح وبصمة التشفير متطابقة 100%', `SHA-256: ${retrievedSha256}`);
      results.integritySha256 = true;
    } else {
      logFail('عدم تطابق البصمة الرقمية (Data Mismatch)', `المتوقع: ${EXPECTED_SHA256} | المسترجع: ${retrievedSha256}`);
      results.integritySha256 = false;
    }
  } catch (err) {
    logFail('فشل استرجاع الملف للتحقق', `الخطأ: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // الخطوة 5: حذف الملف التجريبي فقط مع قيود أمان تمنع حذف غيره
  // -------------------------------------------------------------------------
  console.log(`\n${COLORS.bold}5. تنظيف وحذف الملف التجريبي فقط (Safe Cleanup):${COLORS.reset}`);

  // فحص أمان إضافي قبل تنفيذ أمر الحذف
  if (!testKey.startsWith('test-uploads/') || testKey.includes('..')) {
    logFail('حظر أمني', 'تم إلغاء عملية الحذف لأن المفتاح لا يطابق المسار التجريبي المعزول');
    process.exit(1);
  }

  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testKey
    }));
    logPass('تم إرسال أمر حذف الملف التجريبي', `المسار المحذوف: ${testKey}`);
    results.cleanup = true;
  } catch (err) {
    logFail('فشل حذف الملف التجريبي', `الخطأ: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // الخطوة 6: التأكد الحقيقي من اختفاء الملف بعد الحذف
  // -------------------------------------------------------------------------
  console.log(`\n${COLORS.bold}6. التأكد من إزالة الملف من الحاوية (Verification of Deletion):${COLORS.reset}`);

  try {
    await s3.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: testKey
    }));
    // إذا لم يرمِ خطأ، فالملف ما زال موجوداً!
    logFail('الملف لا يزال موجوداً بعد الحذف', `لم يتم تأكيد الحذف للمفتاح: ${testKey}`);
    results.deletionVerified = false;
  } catch (err) {
    // نتوقع خطأ 404 أو NotFound أو NoSuchKey
    const isNotFound = err.name === 'NotFound' || err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404;
    if (isNotFound) {
      logPass('تم تأكيد إزالة الملف تماماً من الحاوية (404 Not Found)', 'لم يعد للملف أي أثر داخل الحاوية.');
      results.deletionVerified = true;
    } else {
      logFail('استجابة غير متوقعة عند التحقق من الحذف', `الرمز: ${err.name} - ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // النتيجة النهائية وخلاصة التقرير
  // -------------------------------------------------------------------------
  logHeader('خلاصة نتائج فحص Cloudflare R2 الحقيقي');

  const allPassed = Object.values(results).every(v => v === true);

  console.log(`  1. فحص متغيرات البيئة:                 ${results.envCheck ? COLORS.green + '[PASS]' : COLORS.red + '[FAIL]'}${COLORS.reset}`);
  console.log(`  2. الاتصال بالحاوية والمصادقة:         ${results.bucketReachability ? COLORS.green + '[PASS]' : COLORS.red + '[FAIL]'}${COLORS.reset}`);
  console.log(`  3. رفع ملف PNG وهمي (test-uploads):    ${results.upload ? COLORS.green + '[PASS]' : COLORS.red + '[FAIL]'}${COLORS.reset}`);
  console.log(`  4. سلامة البيانات وبصمة SHA-256:        ${results.integritySha256 ? COLORS.green + '[PASS]' : COLORS.red + '[FAIL]'}${COLORS.reset}`);
  console.log(`  5. حذف ملف الاختبار المعزول:           ${results.cleanup ? COLORS.green + '[PASS]' : COLORS.red + '[FAIL]'}${COLORS.reset}`);
  console.log(`  6. التحقق من اختفاء الملف (404):        ${results.deletionVerified ? COLORS.green + '[PASS]' : COLORS.red + '[FAIL]'}${COLORS.reset}`);

  console.log('');
  if (allPassed) {
    console.log(`${COLORS.green}${COLORS.bold}النتيجة العامة: PASS - حاوية Cloudflare R2 جاهزة تماماً للربط بالنظام بأمان عالي.${COLORS.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${COLORS.red}${COLORS.bold}النتيجة العامة: FAIL - حدث خطأ في إحدى خطوات الاختبار، يرجى مراجعة التفاصيل أعلاه.${COLORS.reset}\n`);
    process.exit(1);
  }
}

runProbe().catch((err) => {
  console.error(`\n${COLORS.red}[FATAL ERROR] حدث خطأ غير متوقع:${COLORS.reset}`, err.message);
  process.exit(1);
});
