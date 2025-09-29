@echo off
echo 🔄 Restarting servers with HTTPS configuration...
echo.

echo 🔧 Setting backend to HTTPS mode...
cd /d "C:\Users\MY\Desktop\final\SGT\backend"
echo HTTPS_ENABLED=true >> .env

echo 🔧 Starting Backend Server (HTTPS on port 5000)...
start "Backend HTTPS Server" cmd /k "npm start"

echo.
echo 🔧 Starting Frontend Server (HTTPS on port 3000)...
cd /d "C:\Users\MY\Desktop\final\SGT\frontend"
start "Frontend HTTPS Server" cmd /k "npm start"

echo.
echo ✅ Both servers are starting in HTTPS mode...
echo.
echo 🌐 Frontend: https://10.20.50.12:3000
echo 🌐 Backend:  https://10.20.50.12:5000
echo.
echo 📋 Wait for both servers to fully start, then test the URLs above.
echo 🔐 Both should now show as SECURE (with lock icon)
echo.
pause