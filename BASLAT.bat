@echo off
chcp 65001 >nul
title KA-CMS
cd /d "%~dp0cms"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js bulunamadi. Once https://nodejs.org adresinden "LTS" surumunu kur,
  echo  sonra bu dosyayi tekrar calistir.
  echo.
  start https://nodejs.org
  pause
  exit /b
)
node server.js
pause
