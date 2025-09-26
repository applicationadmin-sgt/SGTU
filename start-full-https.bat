@echo off
echo 🔄 Starting both servers in HTTPS mode...
echo.

echo 🔧 Starting Backend Server (HTTPS on port 5000)...
cd /d "C:\Users\MY\Desktop\final\SGT\backend"
start "Backend HTTPS Server" cmd /k "npm start"

echo.
echo 🔧 Starting Frontend Server (HTTPS on port 3000)...
cd /d "C:\Users\MY\Desktop\final\SGT\frontend"
start "Frontend HTTPS Server" cmd /k "npm start"

echo.
echo ✅ Both servers are starting in HTTPS mode...
echo.
echo 🌐 Frontend: https://10.20.49.165:3000
echo 🌐 Backend:  https://10.20.49.165:5000
echo.
echo 📋 Wait for both servers to fully start, then test the URLs above.
echo 🔐 Both should now show as SECURE (with lock icon)
echo.
echo ℹ️  Note: You may need to accept the SSL certificate in your browser
echo    Click "Advanced" → "Proceed to site (unsafe)" when prompted
echo.
pause