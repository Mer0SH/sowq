@echo off
cd /d "%~dp0"
set NODE_ENV=development
node node_modules\vite\bin\vite.js --port 5190 --open /?onboarding

