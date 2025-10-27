@echo off
echo ========================================
echo Certificate Fix Migration Script
echo ========================================
echo.
echo This will fix all existing certificates by adding:
echo - Certificate numbers (SGTLMS-YYYY-XXXXXX)
echo - Verification hashes (SHA-256)
echo - QR codes
echo - Verification URLs
echo.
echo ========================================
echo.

cd backend

echo Running migration...
echo.

node scripts/fix-existing-certificates.js

echo.
echo ========================================
echo Migration completed!
echo ========================================
echo.
pause
