@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\restore-db.ps1"
pause