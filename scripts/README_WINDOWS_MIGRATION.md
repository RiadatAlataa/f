# دليل تشغيل أداة الفحص والتدقيق المحلي الآمن (Dry Run) على Windows (PowerShell)
## جمعية ريادة العطاء لخدمة الإنسان بالعسيلة (ترخيص: 1000888600)

---

### الضوابط الأمنية المحققة:
1. **استعلامات قراءة فقط (Read-Only 100%)**: الأداة لا تنفذ أي استعلام `INSERT` أو `UPDATE` أو `DELETE`.
2. **فصل أداة الترحيل**: تم إلغاء خيار `--apply` تماماً، والأداة ترفض أي خيارات غير معروفة.
3. **فحص البصمة الصارم**: تم إلغاء أي خيار لتجاوز بصمة SHA-256؛ التطابق إلزامي بنسبة 100% مع البصمة المعتمدة:
   `AF21804BD617CE5D531E7F274C19CE4DB5403F7573E5189112EA8F843F7918BD`
4. **التحقق من Hostname عبر URL Parser**: فحص اسم المضيف الفعلي والتأكد من مطابقته الحصرية لنقطة اتصال Staging:
   `ep-tiny-hat-b4hpkghm` أو `ep-tiny-hat-b4hpkghm-pooler`.
5. **تفعيل التحقق الكامل من شهادة TLS**: `rejectUnauthorized: true`.
6. **حظر تسريب البيانات (Zero PII & Secret Leakage)**: حظر طباعة نصوص `developerErrorLogs` أو كلمات المرور أو الهويات أو روابط الاتصال حتى عند حدوث أخطاء.
7. **إيضاح سلامة المرفقات**: بيان أن ملف JSON يضم البيانات الوصفية فقط، والملفات الثنائية الفيزيائية تتطلب أداة السحب المستقلة `extract_attachments`.

---

### خطوات التشغيل على جهازك:

#### 1. التحقق من Node.js وتثبيت مكتبة pg محلياً
```powershell
node -v
npm install pg
```

#### 2. تعيين رابط فرع Staging بأمان دون كشف كلمة المرور
```powershell
$env:TEST_DATABASE_URL = Read-Host "أدخل رابط اتصال Neon لفرع Staging"
Clear-Host
```

#### 3. تشغيل أداة الفحص والتدقيق (Dry Run)
تأكد من وجود الملف `backup_reyadat_alata_2026-10-19.json` في نفس المجلد، ثم شغّل:
```powershell
node scripts/local_neon_migration_runner.cjs
```
أو حدد مسار الملف صراحة:
```powershell
node scripts/local_neon_migration_runner.cjs --file="C:\Users\YourUser\Downloads\backup_reyadat_alata_2026-10-19.json"
```
