# Restart Frontend for Streaming Fix
Write-Host "🔄 Restarting Frontend with Streaming Fix..." -ForegroundColor Cyan

# Kill existing node processes
Write-Host "⏹️  Stopping existing processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Navigate and start frontend
Write-Host "🚀 Starting frontend..." -ForegroundColor Green
cd "c:\Users\Administrator\Desktop\test\Private\deployment-sgtlms\frontend"
npm start
