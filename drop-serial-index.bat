@echo off
echo ========================================
echo Drop Serial Index from Certificates
echo ========================================
echo.
echo This will remove the old serial_1 index
echo that is causing duplicate key errors.
echo.
echo ========================================
echo.

cd backend

echo Running script...
echo.

node scripts/drop-serial-index.js

echo.
echo ========================================
echo Script completed!
echo ========================================
echo.
pause
