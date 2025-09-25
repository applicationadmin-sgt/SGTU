@echo off
echo 🔄 Restarting servers with updated SSL certificates...
echo.

echo 🔧 Starting Backend Server (HTTPS on port 5000)...
cd /d "C:\Users\MY\Desktop\New folder\backend"
start "Backend Server" cmd /k "npm start"

echo.
echo 🔧 Starting Frontend Server (HTTPS on port 3000)...
cd /d "C:\Users\MY\Desktop\New folder\frontend"
start "Frontend Server" cmd /k "npm start"

echo.
echo ✅ Both servers are starting...
echo.
echo 🌐 Frontend: https://10.20.58.236:3000
echo 🌐 Backend:  https://10.20.58.236:5000
echo.
echo 📋 Wait for both servers to fully start, then test the URLs above.
echo 🔐 Both should now show as SECURE (with lock icon)
echo.
pause