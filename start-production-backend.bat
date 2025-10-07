@echo off
echo =================================================
echo   SGT Live Class System - Production Startup
echo   Scalable Backend for 10,000+ Concurrent Users
echo =================================================
echo.

REM Check if Redis is needed
set USE_REDIS=false
set NODE_ENV=production
set HOST=192.168.7.20
set PORT=5000
set USE_HTTPS=false

echo Starting SGT Production Backend...
echo - Host: %HOST%:%PORT%
echo - Environment: %NODE_ENV%
echo - Redis: %USE_REDIS%
echo - HTTPS: %USE_HTTPS%
echo.

REM Start with cluster for production scaling
node cluster.js

pause