# ================================================================================
# أداة استخراج المرفقات المحلية الآمنة (PowerShell أصلي لنظام Windows)
# جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - الإصدار الآمن 2.0
# ================================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = "Continue"

# فرض بروتوكولات الأمان TLS 1.2 و TLS 1.3 مع التحقق الطبيعي من الشهادة دون تعطيل
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
Clear-Host

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   أداة استخراج المرفقات المحلية الآمنة - جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" -ForegroundColor Yellow
Write-Host "   نسخة PowerShell المخصصة لنظام Windows (تعمل مباشرة بدون أي برامج إضافية)" -ForegroundColor Green
Write-Host "================================================================================`n" -ForegroundColor Cyan

# النطاقات المعتمدة حصرياً
$allowedHosts = @("riadataleata-api.onrender.com", "www.riadataleata.com", "riadataleata.com")
$serverBase = "https://riadataleata-api.onrender.com"
$maxFileSize = 50 * 1024 * 1024 # 50 ميغابايت كحد أقصى لكل ملف
$requestTimeoutSec = 25

# التحقق من تشفير الرابط الأساسي عبر HTTPS
if (-not $serverBase.ToLower().StartsWith("https://")) {
    Write-Host "[خطأ أمني فادح] يشترط أن يكون الاتصال مشفراً عبر HTTPS حصراً لحماية بيانات الاعتماد." -ForegroundColor Red
    Pause
    Exit
}

# 1. تحديد ملف النسخة الاحتياطية
$defaultFile = "backup_reyadat_alata.json"
if (-not (Test-Path $defaultFile)) {
    $found = Get-ChildItem -Filter "backup_*.json" | Select-Object -First 1
    if ($found) { $defaultFile = $found.Name }
}

$inputFile = Read-Host "أدخل اسم ملف النسخة الاحتياطية (افتراضي: $defaultFile)"
if ([string]::IsNullOrWhiteSpace($inputFile)) { $inputFile = $defaultFile }

if (-not (Test-Path $inputFile)) {
    Write-Host "`n[خطأ] لم يتم العثور على الملف: '$inputFile'" -ForegroundColor Red
    Write-Host "يرجى تنزيل ملف النسخة أولاً من لوحة تحكم الموقع ووضعه في نفس المجلد مع هذه الأداة.`n"
    Pause
    Exit
}

Write-Host "`n✔ تم العثور على ملف النسخة: $inputFile" -ForegroundColor Green
try {
    $jsonRaw = Get-Content -Raw -Path $inputFile -Encoding UTF8
    $db = $jsonRaw | ConvertFrom-Json
} catch {
    Write-Host "[خطأ فادح] فشل قراءة أو تحليل ملف JSON: $_" -ForegroundColor Red
    Pause
    Exit
}

# 2. المصادقة الإدارية الآمنة
Write-Host "`n--------------------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "خيارات المصادقة الأمنية (لتنزيل المرفقات الخاصة بالمستفيدين والمتطوعين):" -ForegroundColor White
Write-Host " [1] تسجيل الدخول الإداري المباشر (اسم المستخدم + كلمة المرور) [موصى به - آمن ومباشر]" -ForegroundColor Green
Write-Host " [2] إدخال رمز جلسة مخصص يدوياً (sessionToken)" -ForegroundColor White
Write-Host " [3] تخطي المصادقة (تنزيل الملفات العامة فقط مثل التراخيص وبطاقات المتطوعين)" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Gray

$authChoice = Read-Host "اختر طريقة المصادقة [1 أو 2 أو 3] (افتراضي: 1)"
if ([string]::IsNullOrWhiteSpace($authChoice)) { $authChoice = "1" }

$sessionToken = ""

if ($authChoice -eq "1") {
    $loginSuccess = $false
    $attempts = 0

    while (-not $loginSuccess -and $attempts -lt 3) {
        $attempts++
        Write-Host "`n[محاولة تسجيل الدخول $attempts/3]:" -ForegroundColor Cyan
        $identifier = Read-Host "اسم المستخدم أو رقم الهوية أو البريد الإلكتروني"
        if ([string]::IsNullOrWhiteSpace($identifier)) {
            Write-Host "تم إلغاء تسجيل الدخول، المتابعة بالوضع العام..." -ForegroundColor Yellow
            break
        }

        $securePass = Read-Host "كلمة المرور (مخفية بالكامل)" -AsSecureString
        $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
        $plainPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

        Write-Host "جارِ التحقق الآمن من بيانات الاعتماد مع خادم الجمعية... " -NoNewline -ForegroundColor White
        try {
            $loginPayload = @{
                identifier = $identifier
                password = $plainPass
            } | ConvertTo-Json

            $loginRes = Invoke-RestMethod -Uri "$serverBase/api/db/auth/login" `
                -Method Post `
                -Body $loginPayload `
                -ContentType "application/json; charset=utf-8" `
                -TimeoutSec $requestTimeoutSec `
                -UseBasicParsing `
                -ErrorAction Stop

            if ($loginRes.status -eq "success" -and -not [string]::IsNullOrWhiteSpace($loginRes.sessionToken)) {
                $sessionToken = $loginRes.sessionToken
                $loginSuccess = $true
                Write-Host "✔ تم تسجيل الدخول بنجاح! مرحباً بحساب الإدارة المعتمد." -ForegroundColor Green
                Write-Host "ملاحظة أمنية: رمز الجلسة محفوظ في الذاكرة المؤقتة فقط ولن يُكتب في أي ملف أو تقرير." -ForegroundColor DarkGray
            } else {
                $err = if ($loginRes.error) { $loginRes.error } else { "فشلت المصادقة" }
                Write-Host "✖ $err" -ForegroundColor Red
            }
        } catch {
            Write-Host "✖ خطأ في المصادقة: $($_.Exception.Message)" -ForegroundColor Red
        }

        # مسح كلمة المرور الصريحة من الذاكرة
        $plainPass = $null
        [System.GC]::Collect()

        if (-not $loginSuccess -and $attempts -lt 3) {
            $retry = Read-Host "هل ترغب في إعادة المحاولة؟ (نعم/لا) [نعم]"
            if ($retry -match "^(ل|n|no)$") { break }
        }
    }

    if (-not $loginSuccess) {
        Write-Host "[تنبيه] سيتم المتابعة بدون مصادقة إدارية (الملفات الخاصة قد تعيد رمز 401)." -ForegroundColor Yellow
    }
} elseif ($authChoice -eq "2") {
    $sec = Read-Host "أدخل رمز الجلسة (sessionToken) بصيغة آمنة" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    $sessionToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    if ([string]::IsNullOrWhiteSpace($sessionToken)) {
        Write-Host "[تنبيه] لم يتم إدخال رمز، المتابعة بالوضع العام فقط." -ForegroundColor Yellow
    }
} else {
    Write-Host "[إشعار] تم اختيار الوضع العام، سيتم تنزيل المرفقات المتاحة بدون صلاحيات خاصة." -ForegroundColor Yellow
}

# 3. استخراج الروابط من JSON
Write-Host "`nجارِ فحص شجرة البيانات واستخراج روابط الملفات والمرفقات..." -ForegroundColor Cyan

$regex = '(?:"rawUrl"|":\s*")((?:https?:\/\/[^"\s]+|\/uploads\/[^"\s]+|\/card_templates\/[^"\s]+|[^"\s]+\.(?:png|jpe?g|webp|gif|svg|pdf|docx?|xlsx?|csv)))'
$matches = [regex]::Matches($jsonRaw, $regex)

$discovered = [System.Collections.Generic.HashSet[string]]::new()
foreach ($m in $matches) {
    $val = $m.Groups[1].Value.Trim()
    if (-not $val.StartsWith("data:") -and $val.Length -gt 4) {
        [void]$discovered.Add($val)
    }
}

Write-Host "تم اكتشاف $($discovered.Count) ملفاً ومرفقاً فريداً." -ForegroundColor Green

# 4. تجهيز مجلد التنزيل
$outDir = Join-Path $PSScriptRoot "extracted_attachments"
if (-not (Test-Path $outDir)) { [void](New-Item -ItemType Directory -Path $outDir) }

$successCount = 0
$skippedCount = 0
$failedCount = 0
$externalCount = 0
$reportList = @()

Write-Host "`nبدء معالجة وتنزيل الملفات:" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Gray

$headers = @{
    "User-Agent" = "Reyadat-Attachment-Extractor-PS/2.0"
}
if (-not [string]::IsNullOrWhiteSpace($sessionToken)) {
    $headers["x-session-token"] = $sessionToken
    $headers["Authorization"] = "Bearer $sessionToken"
}

# دالة فحص التواقيع الرقمية للـ PowerShell لمنع حفظ صفحات HTML كملفات
function Test-ValidMagicBytes($filePath, $extension) {
    if (-not (Test-Path $filePath)) { return $false }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    if ($bytes.Length -lt 4) { return $false }

    $textSample = [System.Text.Encoding]::UTF8.GetString($bytes, 0, [Math]::Min(128, $bytes.Length)).ToLower()
    if ($textSample.StartsWith("<!doctype html") -or $textSample.StartsWith("<html") -or $textSample.Contains("<head>") -or $textSample.StartsWith('{"error"') -or $textSample.StartsWith('{"status":')) {
        return $false
    }

    $ext = $extension.ToLower()
    if ($ext -eq ".pdf") {
        if ($bytes.Length -lt 5) { return $false }
        $header = [System.Text.Encoding]::ASCII.GetString($bytes, 0, 5)
        return ($header -eq "%PDF-")
    }
    if ($ext -eq ".png") {
        if ($bytes.Length -lt 4) { return $false }
        return ($bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47)
    }
    if ($ext -eq ".jpg" -or $ext -eq ".jpeg") {
        if ($bytes.Length -lt 3) { return $false }
        return ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8 -and $bytes[2] -eq 0xFF)
    }

    return $true
}

$i = 0
foreach ($urlItem in $discovered) {
    $i++
    # التصنيف
    $cat = "general_documents"
    $lowerItem = $urlItem.ToLower()
    if ($lowerItem.Contains("license")) { $cat = "licenses" }
    elseif ($lowerItem.Contains("cardtemplate") -or $lowerItem.Contains("card_template")) { $cat = "cards" }
    elseif ($lowerItem.Contains("beneficiar")) { $cat = "beneficiaries" }
    elseif ($lowerItem.Contains("volunteer")) { $cat = "volunteers" }
    elseif ($lowerItem.Contains("card")) { $cat = "cards" }
    elseif ($lowerItem.Contains("team")) { $cat = "teams" }
    elseif ($lowerItem.Contains("financ") -or $lowerItem.Contains("invoice")) { $cat = "finances" }
    elseif ($lowerItem.Contains("letter")) { $cat = "letters" }

    $catDir = Join-Path $outDir $cat
    if (-not (Test-Path $catDir)) { [void](New-Item -ItemType Directory -Path $catDir) }

    $fullUrl = ""
    $isExternal = $false

    if ($urlItem.StartsWith("http://") -or $urlItem.StartsWith("https://")) {
        try {
            $uri = [System.Uri]$urlItem
            if ($allowedHosts -contains $uri.Host.ToLower()) {
                $fullUrl = $urlItem
            } else {
                $isExternal = $true
            }
        } catch {
            $isExternal = $true
        }
    } else {
        $cleanPath = if ($urlItem.StartsWith("/")) { $urlItem } else { "/$urlItem" }
        $fullUrl = "$serverBase$cleanPath"
    }

    $fileName = [System.IO.Path]::GetFileName($urlItem.Split('?')[0])
    $fileName = [regex]::Replace($fileName, '[\\/:*?"<>|\r\n]', '_').Trim()
    if ([string]::IsNullOrWhiteSpace($fileName)) { $fileName = "attachment_$i.bin" }

    $destPath = Join-Path $catDir $fileName
    $cleanReportUrl = $fullUrl.Split('?')[0]

    if ($isExternal) {
        $externalCount++
        $shortUrl = if ($urlItem.Length -gt 50) { $urlItem.Substring(0, 50) + "..." } else { $urlItem }
        Write-Host "[$i/$($discovered.Count)] [تخطي رابط خارجي] $shortUrl (محظور للحماية)" -ForegroundColor Yellow
        $reportList += [PSCustomObject]@{
            Index = $i; FileName = $fileName; Category = $cat; Url = $urlItem.Split('?')[0]; Status = "EXTERNAL_BLOCKED"; Sha256 = ""
        }
        continue
    }

    if (Test-Path $destPath) {
        $skippedCount++
        $hashVal = (Get-FileHash -Path $destPath -Algorithm SHA256).Hash
        $size = (Get-Item $destPath).Length
        Write-Host "[$i/$($discovered.Count)] [موجود مسبقاً] $cat/$fileName ($size بايت - $($hashVal.Substring(0, 10))...)" -ForegroundColor Cyan
        $reportList += [PSCustomObject]@{
            Index = $i; FileName = $fileName; Category = $cat; Url = $cleanReportUrl; Status = "SKIPPED_ALREADY_EXISTS"; Sha256 = $hashVal; Size = $size
        }
        continue
    }

    # تنزيل مع محاولة الإعادة وفحص التوقيع الرقمي
    $ext = [System.IO.Path]::GetExtension($destPath)
    for ($attempt = 1; $attempt -le 2; $attempt++) {
        try {
            if (-not $fullUrl.ToLower().StartsWith("https://")) {
                throw "الاتصال غير مشفر عبر HTTPS"
            }

            Invoke-WebRequest -Uri $fullUrl -OutFile $destPath -Headers $headers -TimeoutSec $requestTimeoutSec -MaximumRedirection 3 -UseBasicParsing -ErrorAction Stop

            # التحقق من الحجم
            $size = (Get-Item $destPath).Length
            if ($size -gt $maxFileSize) {
                Remove-Item $destPath -Force
                throw "حجم الملف يتجاوز الحد الأقصى 50 ميغابايت"
            }

            # التحقق من التوقيع الرقمي (Magic Bytes)
            $isValid = Test-ValidMagicBytes -filePath $destPath -extension $ext
            if (-not $isValid) {
                Remove-Item $destPath -Force
                throw "المحتوى المستلم هو صفحة خطأ أو شاشة تسجيل دخول وليس ملفاً حقيقياً"
            }

            $hashVal = (Get-FileHash -Path $destPath -Algorithm SHA256).Hash
            $successCount++
            $downloadSuccess = $true
            Write-Host "✔ نجح ($size بايت) [$($hashVal.Substring(0, 8))...]" -ForegroundColor Green
            $reportList += [PSCustomObject]@{
                Index = $i; FileName = $fileName; Category = $cat; Url = $cleanReportUrl; Status = "DOWNLOADED_SUCCESS"; Sha256 = $hashVal; Size = $size
            }
            break
        } catch {
            if ($attempt -lt 2) {
                Start-Sleep -Milliseconds 800
            } else {
                $failedCount++
                if (Test-Path $destPath) { Remove-Item $destPath -Force }
                Write-Host "✖ فشل: $($_.Exception.Message)" -ForegroundColor Red
                $reportList += [PSCustomObject]@{
                    Index = $i; FileName = $fileName; Category = $cat; Url = $cleanReportUrl; Status = "DOWNLOAD_FAILED"; Error = $_.Exception.Message
                }
            }
        }
    }

    Start-Sleep -Milliseconds 200
}

# 5. حفظ التقرير
$reportFile = Join-Path $PSScriptRoot "extraction_report.json"
$reportList | ConvertTo-Json -Depth 5 | Set-Content -Path $reportFile -Encoding UTF8

$isComplete = ($failedCount -eq 0 -and $discovered.Count -gt 0)

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "   اكتملت عملية الاستخراج! الحالة: $(if ($isComplete) { 'مكتملة وموثقة تماماً ✔' } else { 'جزئية (راجع التقارير) ⚠' })" -ForegroundColor $(if ($isComplete) { "Green" } else { "Yellow" })
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "- الملفات الناجحة: $successCount" -ForegroundColor Green
Write-Host "- الملفات الموجودة مسبقاً: $skippedCount" -ForegroundColor Cyan
Write-Host "- الملفات غير المتوفرة (أو فشلت): $failedCount" -ForegroundColor Red
Write-Host "- الروابط الخارجية المحظورة: $externalCount" -ForegroundColor Yellow
Write-Host "- مجلد الحفظ المحلي: $outDir" -ForegroundColor White
Write-Host "- تقرير البصمات الكامل (SHA-256): $reportFile`n" -ForegroundColor White

Pause
