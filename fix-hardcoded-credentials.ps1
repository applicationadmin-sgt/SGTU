# PowerShell Script to Fix Hardcoded MongoDB Credentials
# This script will replace hardcoded MongoDB connection strings with environment variables

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SECURITY FIX: Hardcoded Credentials  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# List of files with hardcoded credentials
$files = @(
    "backend\check-dean-locks.js",
    "backend\check-unlock-status.js",
    "backend\check-security-lock.js",
    "backend\test-announcement-filtering.js",
    "backend\test-dean-endpoint.js",
    "backend\test-controller-direct.js",
    "backend\test-availability-endpoint.js",
    "backend\quick-check-sections.js",
    "backend\final-verification-test.js",
    "backend\diagnose-permanent-issue.js",
    "backend\debug-teacher-student.js",
    "backend\debug-student-section-assignment.js",
    "backend\debug-quiz-locks.js",
    "backend\debug-query-execution.js",
    "backend\debug-hod-unlock.js",
    "backend\debug-availability.js",
    "backend\debug-announcement-issue.js",
    "backend\test-unlock-endpoint.js",
    "backend\test-fixed-unlock.js"
)

# Hardcoded connection strings to replace (anonymized)
$patterns = @(
    "mongodb\+srv://sourav092002_db_user:[^@'""]+@cluster0\.nvkrxcx\.mongodb\.net/[^'""]*",
    "mongodb\+srv://dipanwitakundu02_db_user:[^@'""]+@cluster0\.ak3b8nt\.mongodb\.net/[^'""]*",
    "mongodb\+srv://Cluster37906:[^@'""]+@cluster0\.flx5j\.mongodb\.net/[^'""]*"
)

# Replacement string
$replacement = "process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/sgtlms'"

$totalFixed = 0
$filesFixed = 0

Write-Host "Starting credential remediation..." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing: $file" -ForegroundColor White
        
        $content = Get-Content $file -Raw
        $originalContent = $content
        $fixedInFile = 0
        
        foreach ($pattern in $patterns) {
            $matches = [regex]::Matches($content, $pattern)
            if ($matches.Count -gt 0) {
                $content = $content -replace $pattern, $replacement
                $fixedInFile += $matches.Count
            }
        }
        
        if ($fixedInFile -gt 0) {
            Set-Content -Path $file -Value $content -NoNewline
            Write-Host "  ✓ Fixed $fixedInFile hardcoded credential(s)" -ForegroundColor Green
            $totalFixed += $fixedInFile
            $filesFixed++
        } else {
            Write-Host "  - No hardcoded credentials found (already secure)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Files Processed: $($files.Count)" -ForegroundColor White
Write-Host "  Files Fixed: $filesFixed" -ForegroundColor Green
Write-Host "  Total Credentials Removed: $totalFixed" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($filesFixed -gt 0) {
    Write-Host "⚠️  IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Create backend/.env file with:" -ForegroundColor Yellow
    Write-Host "   MONGODB_URI=your_new_secure_connection_string" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. IMMEDIATELY revoke the exposed MongoDB credentials:" -ForegroundColor Yellow
    Write-Host "   - Log into MongoDB Atlas" -ForegroundColor Gray
    Write-Host "   - Delete exposed database users" -ForegroundColor Gray
    Write-Host "   - Create new users with strong passwords" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Review and test all modified files" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "4. Commit the changes:" -ForegroundColor Yellow
    Write-Host "   git add ." -ForegroundColor Gray
    Write-Host "   git commit -m 'security: Remove hardcoded database credentials'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Clean Git history to remove exposed credentials" -ForegroundColor Yellow
    Write-Host "   (See SECURITY_AUDIT_REPORT.md for instructions)" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "✓ All files are already secure!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "For detailed security guidance, see:" -ForegroundColor Cyan
Write-Host "  SECURITY_AUDIT_REPORT.md" -ForegroundColor White
Write-Host ""
