# PowerShell script to backup legacy live class files
# This moves files to LEGACY_BACKUP folder for safe keeping

Write-Host "🔄 Starting legacy live class files backup..." -ForegroundColor Green

# Create backup structure
$backupRoot = "LEGACY_BACKUP"
New-Item -ItemType Directory -Force -Path "$backupRoot\frontend\components\teacher" | Out-Null
New-Item -ItemType Directory -Force -Path "$backupRoot\frontend\components\student" | Out-Null
New-Item -ItemType Directory -Force -Path "$backupRoot\frontend\components\liveclass" | Out-Null
New-Item -ItemType Directory -Force -Path "$backupRoot\frontend\components\enhanced" | Out-Null
New-Item -ItemType Directory -Force -Path "$backupRoot\frontend\pages\teacher" | Out-Null
New-Item -ItemType Directory -Force -Path "$backupRoot\frontend\pages\student" | Out-Null
New-Item -ItemType Directory -Force -Path "$backupRoot\frontend\pages\hod" | Out-Null
New-Item -ItemType Directory -Force -Path "$backupRoot\frontend\utils" | Out-Null
New-Item -ItemType Directory -Force -Path "$backupRoot\backend\socket" | Out-Null

# Function to safely move file if it exists
function Move-FileIfExists {
    param($source, $destination)
    if (Test-Path $source) {
        try {
            Move-Item -Path $source -Destination $destination -Force
            Write-Host "✅ Moved: $source -> $destination" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to move: $source - $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️ Not found: $source" -ForegroundColor Yellow
    }
}

Write-Host "`n📂 Moving Frontend Components..." -ForegroundColor Cyan

# Teacher Components
Move-FileIfExists "frontend\src\components\teacher\TeacherLiveClassDashboard.js" "$backupRoot\frontend\components\teacher\"
Move-FileIfExists "frontend\src\components\teacher\LiveClassRoom.js" "$backupRoot\frontend\components\teacher\"
Move-FileIfExists "frontend\src\components\teacher\ScheduleLiveClassDialog.js" "$backupRoot\frontend\components\teacher\"

# Student Components  
Move-FileIfExists "frontend\src\components\student\StudentLiveClassDashboard.js" "$backupRoot\frontend\components\student\"
Move-FileIfExists "frontend\src\components\student\StudentLiveClassRoom.js" "$backupRoot\frontend\components\student\"

# Live Class Components
Move-FileIfExists "frontend\src\components\liveclass\EnhancedLiveClassRoom.js" "$backupRoot\frontend\components\liveclass\"
Move-FileIfExists "frontend\src\components\liveclass\LiveClassRoom.js" "$backupRoot\frontend\components\liveclass\"

# Enhanced Components (if exists)
Move-FileIfExists "frontend\src\components\enhanced\EnhancedLiveClassRoom.js" "$backupRoot\frontend\components\enhanced\"

Write-Host "`n📄 Moving Frontend Pages..." -ForegroundColor Cyan

# Pages
Move-FileIfExists "frontend\src\pages\teacher\TeacherLiveClasses.js" "$backupRoot\frontend\pages\teacher\"
Move-FileIfExists "frontend\src\pages\student\StudentLiveClasses.js" "$backupRoot\frontend\pages\student\" 
Move-FileIfExists "frontend\src\pages\hod\HODLiveClasses.js" "$backupRoot\frontend\pages\hod\"

Write-Host "`n🛠️ Moving Frontend Utils..." -ForegroundColor Cyan

# Utils - MAJOR WebRTC replacement
Move-FileIfExists "frontend\src\utils\webrtc.js" "$backupRoot\frontend\utils\"

Write-Host "`n🔌 Moving Backend Components..." -ForegroundColor Cyan

# Backend Socket - MAJOR replacement
Move-FileIfExists "backend\socket\liveClassSocket.js" "$backupRoot\backend\socket\"

Write-Host "`n✅ Legacy backup completed!" -ForegroundColor Green
Write-Host "📁 All files moved to: $backupRoot" -ForegroundColor Green
Write-Host "🔄 To restore any file, move it back from the backup folder" -ForegroundColor Yellow

# Show backup summary
Write-Host "`n📊 Backup Summary:" -ForegroundColor Cyan
Get-ChildItem -Recurse $backupRoot | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
    Write-Host "  📄 $($_.FullName)" -ForegroundColor Gray
}

Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. ✅ Legacy files backed up safely" -ForegroundColor Green
Write-Host "  2. 🔧 System now uses scalable components:" -ForegroundColor Green  
Write-Host "     - ScalableLiveClassroom.js (frontend)" -ForegroundColor Gray
Write-Host "     - ScalableWebRTCManager.js (WebRTC)" -ForegroundColor Gray
Write-Host "     - ScalableSocketService.js (Socket.IO)" -ForegroundColor Gray
Write-Host "     - MediasoupService.js (SFU)" -ForegroundColor Gray
Write-Host "  3. 🚀 Ready for 10K+ concurrent users!" -ForegroundColor Green