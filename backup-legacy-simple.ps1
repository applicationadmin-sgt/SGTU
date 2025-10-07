# PowerShell script to backup legacy live class files
Write-Host "Starting legacy live class files backup..." -ForegroundColor Green

# Create backup structure
$backupRoot = "LEGACY_BACKUP"
New-Item -ItemType Directory -Force -Path "$backupRoot\frontend\components\teacher" | Out-Null
New-Item -ItemType Directory -Force -Path "$backupRoot\frontend\components\student" | Out-Null
New-Item -ItemType Directory -Force -Path "$backupRoot\frontend\components\liveclass" | Out-Null
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
            Write-Host "Moved: $source" -ForegroundColor Green
        } catch {
            Write-Host "Failed to move: $source" -ForegroundColor Red
        }
    } else {
        Write-Host "Not found: $source" -ForegroundColor Yellow
    }
}

Write-Host "Moving Frontend Components..."

# Teacher Components
Move-FileIfExists "frontend\src\components\teacher\TeacherLiveClassDashboard.js" "$backupRoot\frontend\components\teacher\"
Move-FileIfExists "frontend\src\components\teacher\LiveClassRoom.js" "$backupRoot\frontend\components\teacher\"

# Student Components  
Move-FileIfExists "frontend\src\components\student\StudentLiveClassDashboard.js" "$backupRoot\frontend\components\student\"
Move-FileIfExists "frontend\src\components\student\StudentLiveClassRoom.js" "$backupRoot\frontend\components\student\"

# Live Class Components
Move-FileIfExists "frontend\src\components\liveclass\EnhancedLiveClassRoom.js" "$backupRoot\frontend\components\liveclass\"

Write-Host "Moving Frontend Pages..."

# Pages
Move-FileIfExists "frontend\src\pages\teacher\TeacherLiveClasses.js" "$backupRoot\frontend\pages\teacher\"
Move-FileIfExists "frontend\src\pages\student\StudentLiveClasses.js" "$backupRoot\frontend\pages\student\" 
Move-FileIfExists "frontend\src\pages\hod\HODLiveClasses.js" "$backupRoot\frontend\pages\hod\"

Write-Host "Moving Frontend Utils..."

# Utils - MAJOR WebRTC replacement
Move-FileIfExists "frontend\src\utils\webrtc.js" "$backupRoot\frontend\utils\"

Write-Host "Moving Backend Components..."

# Backend Socket - MAJOR replacement
Move-FileIfExists "backend\socket\liveClassSocket.js" "$backupRoot\backend\socket\"

Write-Host "Legacy backup completed!" -ForegroundColor Green
Write-Host "All files moved to: $backupRoot" -ForegroundColor Green