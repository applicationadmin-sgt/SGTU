@echo off
echo 🚀 SGT Application Startup Script
echo.
echo Choose your setup:
echo 1. HTTP Frontend + HTTP Backend (Development)
echo 2. HTTPS Frontend + HTTP Backend (Recommended for WebRTC)
echo 3. HTTPS Frontend + HTTPS Backend (Full HTTPS)
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" goto :http_setup
if "%choice%"=="2" goto :https_frontend_setup
if "%choice%"=="3" goto :full_https_setup
echo Invalid choice. Exiting...
pause
exit /b 1

:http_setup
echo.
echo 🔧 Starting HTTP Frontend + HTTP Backend...
echo.
echo Updating backend to HTTP mode...
cd /d "C:\Users\MY\Desktop\final\SGT\backend"
echo HTTPS_ENABLED=false > temp_env.txt
type .env | findstr /v "HTTPS_ENABLED" >> temp_env.txt
move temp_env.txt .env

echo Updating .env for HTTP mode...
cd /d "C:\Users\MY\Desktop\final\SGT\frontend"
echo DISABLE_ESLINT_PLUGIN=true > .env.development
echo REACT_APP_API_URL=http://localhost:5000 >> .env.development
echo HTTPS=false >> .env.development
echo HOST=10.20.50.12 >> .env.development
echo PORT=3000 >> .env.development

echo Starting Backend Server (HTTP on port 5000)...
cd /d "C:\Users\MY\Desktop\final\SGT\backend"
start "Backend HTTP Server" cmd /k "npm start"

echo.
echo Starting Frontend Server (HTTP on port 3000)...
cd /d "C:\Users\MY\Desktop\final\SGT\frontend"
start "Frontend HTTP Server" cmd /k "npm start"

echo.
echo ✅ Both servers are starting in HTTP mode...
echo 🌐 Frontend: http://10.20.50.12:3000
echo 🌐 Backend:  http://10.20.50.12:5000
goto :end

:https_frontend_setup
echo.
echo 🔧 Starting HTTPS Frontend + HTTP Backend...
echo.
echo Updating backend to HTTP mode...
cd /d "C:\Users\MY\Desktop\final\SGT\backend"
echo HTTPS_ENABLED=false > temp_env.txt
type .env | findstr /v "HTTPS_ENABLED" >> temp_env.txt
move temp_env.txt .env

echo Updating .env for HTTPS frontend mode...
cd /d "C:\Users\MY\Desktop\final\SGT\frontend"
echo DISABLE_ESLINT_PLUGIN=true > .env.development
echo REACT_APP_API_URL=http://localhost:5000 >> .env.development
echo HTTPS=true >> .env.development
echo SSL_CRT_FILE=localhost+3.pem >> .env.development
echo SSL_KEY_FILE=localhost+3-key.pem >> .env.development
echo HOST=10.20.50.12 >> .env.development
echo PORT=3000 >> .env.development

echo Starting Backend Server (HTTP on port 5000)...
cd /d "C:\Users\MY\Desktop\final\SGT\backend"
start "Backend HTTP Server" cmd /k "npm start"

echo.
echo Starting Frontend Server (HTTPS on port 3000)...
cd /d "C:\Users\MY\Desktop\final\SGT\frontend"
start "Frontend HTTPS Server" cmd /k "npm start"

echo.
echo ✅ Frontend HTTPS + Backend HTTP setup starting...
echo 🌐 Frontend: https://10.20.50.12:3000 (SECURE)
echo 🌐 Backend:  http://10.20.50.12:5000
goto :end

:full_https_setup
echo.
echo 🔧 Starting Full HTTPS Setup...
echo.
echo Updating backend to HTTPS mode...
cd /d "C:\Users\MY\Desktop\final\SGT\backend"
echo HTTPS_ENABLED=true > temp_env.txt
type .env | findstr /v "HTTPS_ENABLED" >> temp_env.txt
move temp_env.txt .env

echo Updating .env for full HTTPS mode...
cd /d "C:\Users\MY\Desktop\final\SGT\frontend"
echo DISABLE_ESLINT_PLUGIN=true > .env.development
echo REACT_APP_API_URL=https://localhost:5000 >> .env.development
echo HTTPS=true >> .env.development
echo SSL_CRT_FILE=localhost+3.pem >> .env.development
echo SSL_KEY_FILE=localhost+3-key.pem >> .env.development
echo HOST=10.20.50.12 >> .env.development
echo PORT=3000 >> .env.development

echo Starting Backend Server (HTTPS on port 5000)...
cd /d "C:\Users\MY\Desktop\final\SGT\backend"
start "Backend HTTPS Server" cmd /k "npm start"

echo.
echo Starting Frontend Server (HTTPS on port 3000)...
cd /d "C:\Users\MY\Desktop\final\SGT\frontend"
start "Frontend HTTPS Server" cmd /k "npm start"

echo.
echo ✅ Both servers are starting in full HTTPS mode...
echo 🌐 Frontend: https://10.20.50.12:3000 (SECURE)
echo 🌐 Backend:  https://10.20.50.12:5000 (SECURE)
goto :end

:end
echo.
echo 📋 Setup Information:
echo - Wait for both servers to fully start
echo - Check terminal windows for any errors
echo - Accept SSL certificates if prompted in browser
echo - For WebRTC features (live classes), use HTTPS frontend (option 2 or 3)
echo.
echo 🔐 SSL Certificate Info:
echo - Certificates are valid for localhost, 127.0.0.1, and 10.20.50.12
echo - Certificates expire on December 26, 2027
echo - Browser may show "Not Secure" warning - click Advanced → Proceed
echo.
pause