@echo off
chcp 65001 >nul
title Code Collector

cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
    python collect_codes.py
    pause
    exit /b
)

where py >nul 2>nul
if %errorlevel%==0 (
    py collect_codes.py
    pause
    exit /b
)

echo Python نصب نیست یا در PATH شناسایی نشد.
echo لطفاً Python را نصب کنید:
echo https://www.python.org/downloads/
pause
