@echo off
chcp 65001 >nul
title ORGANA — تشغيل الرابط العام للمنظومة على الإنترنت (أونلاين)
cd /d "C:\MADAAR\ORGANA"
cls
echo ====================================================================
echo  ORGANA — رابط الإنترنت العام (Cloudflare Secure Tunnel)
echo  كنيسة الشهيد العظيم مارجرجس بسندبيس
echo ====================================================================
echo.
echo  [✓] جاري إنشاء رابط HTTPS آمن ومباشر للوصول من أي هاتف في العالم...
echo.
bin\cloudflared.exe tunnel --url http://127.0.0.1:3000
pause
