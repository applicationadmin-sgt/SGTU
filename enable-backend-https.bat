@echo off
echo 🔐 Enabling HTTPS on Backend Server...
echo.

cd /d "C:\Users\MY\Desktop\final\SGT\backend"

echo Adding HTTPS configuration to .env file...

REM Create a new .env with HTTPS enabled
echo HTTPS_ENABLED=true > temp_env.txt
type .env | findstr /v "HTTPS_ENABLED" >> temp_env.txt
move temp_env.txt .env

echo.
echo ✅ Backend HTTPS configuration enabled!
echo.
echo 📋 Configuration added:
echo    - HTTPS_ENABLED=true
echo    - SSL certificates: localhost+3.pem / localhost+3-key.pem
echo.
echo 🚀 Backend will now start in HTTPS mode when you run:
echo    npm start
echo.
echo 🌐 Backend will be accessible at: https://10.20.49.165:5000
echo.
pause