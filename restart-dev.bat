@echo off
echo Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Cleaning Next.js cache...
if exist .next rmdir /s /q .next
timeout /t 1 /nobreak >nul

echo Starting development server...
npm run dev
