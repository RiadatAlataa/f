@echo off
chcp 65001 > nul
title أداة استخراج مرفقات جمعية ريادة العطاء لخدمة الإنسان بالعسيلة

echo ================================================================================
echo    أداة استخراج المرفقات المحلية الآمنة - جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
echo    نسخة نظام التشغيل Windows المعتمدة (الإصدار 2.0 الآمن)
echo ================================================================================
echo.

:: التحقق من توفر Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [إشعار] لم يتم العثور على Node.js في بيئة النظام الحالية.
    echo.
    echo يمكنك تشغيل أداة PowerShell الأصلية المرفقة مباشرة بدون الحاجة لتثبيت أي برامج:
    echo 1. اضغط حرف P ثم Enter لتشغيل سكريبت PowerShell الآن تلقائياً.
    echo 2. أو انقر بزر الفأرة الأيمن على extract_attachments.ps1 واختر:
    echo    "Run with PowerShell" (أو تشغيل بواسطة PowerShell).
    echo.
    set /p CHOICE="هل تريد تشغيل نسخة PowerShell الآن؟ (P = نعم / أي زر آخر للإلغاء): "
    if /i "%CHOICE%"=="P" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0extract_attachments.ps1"
        pause
        exit /b 0
    )
    pause
    exit /b 1
)

:: تشغيل محرك Node.js المعتمد
if exist "%~dp0extract_attachments.cjs" (
    node "%~dp0extract_attachments.cjs"
) else (
    if exist "%~dp0extract_attachments.js" (
        node "%~dp0extract_attachments.js"
    ) else (
        echo [خطأ فادح] لم يتم العثور على ملف المحرك: extract_attachments.cjs
        echo يرجى التأكد من وجود كافة ملفات الأداة داخل نفس المجلد.
    )
)

echo.
echo ================================================================================
echo انتهى التنفيذ. اضغط أي زر لإغلاق هذه النافذة.
echo ================================================================================
pause > nul
