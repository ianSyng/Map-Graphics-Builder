@echo off
title Map Graphics Builder
cd /d "%~dp0"
echo Starting Map Graphics Builder...
echo Keep this window open while you use the app.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
if errorlevel 1 pause
