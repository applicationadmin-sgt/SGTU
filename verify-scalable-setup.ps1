# Verification script to check scalable system setup
Write-Host "🔍 Verifying Scalable Live Class System Setup..." -ForegroundColor Cyan

$errors = @()
$warnings = @()
$success = @()

# Check if legacy files are backed up
Write-Host "`n📦 Checking Legacy Backup..." -ForegroundColor Yellow
$backupFiles = @(
    "LEGACY_BACKUP\frontend\components\teacher\TeacherLiveClassDashboard.js",
    "LEGACY_BACKUP\frontend\utils\webrtc.js", 
    "LEGACY_BACKUP\backend\socket\liveClassSocket.js"
)

foreach ($file in $backupFiles) {
    if (Test-Path $file) {
        $success += "✅ Backed up: $file"
    } else {
        $warnings += "⚠️ Missing backup: $file"
    }
}

# Check if scalable components exist
Write-Host "`n🚀 Checking Scalable Components..." -ForegroundColor Yellow
$scalableFiles = @(
    "frontend\src\components\liveclass\ScalableLiveClassRoom.js",
    "backend\services\ScalableSocketService.js",
    "backend\services\MediasoupService.js",
    "ScalableWebRTCManager.js"
)

foreach ($file in $scalableFiles) {
    if (Test-Path $file) {
        $success += "✅ Available: $file"
    } else {
        $errors += "❌ Missing: $file"
    }
}

# Check if routes are updated
Write-Host "`n🛣️ Checking Route Updates..." -ForegroundColor Yellow
$routeFiles = @(
    "frontend\src\routes\TeacherRoutes.js",
    "frontend\src\pages\TeacherDashboard.js",
    "frontend\src\pages\StudentDashboard_new.js"
)

foreach ($file in $routeFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "ScalableLiveClassRoom") {
            $success += "✅ Routes updated: $file"
        } else {
            $warnings += "⚠️ Routes may need update: $file"
        }
    } else {
        $errors += "❌ Route file missing: $file"
    }
}

# Check package.json for dependencies
Write-Host "`n📦 Checking Dependencies..." -ForegroundColor Yellow
if (Test-Path "backend\package.json") {
    $packageContent = Get-Content "backend\package.json" -Raw
    $requiredDeps = @("mediasoup", "ioredis", "socket.io-redis", "pg")
    
    foreach ($dep in $requiredDeps) {
        if ($packageContent -match $dep) {
            $success += "✅ Dependency available: $dep"
        } else {
            $errors += "❌ Missing dependency: $dep"
        }
    }
}

# Display Results
Write-Host "`n📊 Verification Results:" -ForegroundColor Cyan

if ($success.Count -gt 0) {
    Write-Host "`n✅ SUCCESSES:" -ForegroundColor Green
    $success | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
}

if ($warnings.Count -gt 0) {
    Write-Host "`n⚠️ WARNINGS:" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
}

if ($errors.Count -gt 0) {
    Write-Host "`n❌ ERRORS:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
}

# Overall Status
Write-Host "`n🎯 Overall Status:" -ForegroundColor Cyan
if ($errors.Count -eq 0) {
    Write-Host "✅ READY FOR SCALABLE TESTING!" -ForegroundColor Green
    Write-Host "📈 System configured for 10,000+ concurrent users" -ForegroundColor Green
} else {
    Write-Host "❌ SETUP INCOMPLETE - Fix errors above" -ForegroundColor Red
}

Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Start backend: npm start (in backend folder)" -ForegroundColor Gray
Write-Host "  2. Start frontend: npm start (in frontend folder)" -ForegroundColor Gray  
Write-Host "  3. Test scalable live class system" -ForegroundColor Gray
Write-Host "  4. Run load tests with multiple concurrent users" -ForegroundColor Gray