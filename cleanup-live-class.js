#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up live class files from main LMS project...\n');

// Files and directories to remove
const filesToRemove = [
  // Frontend live class components
  'frontend/src/components/liveclass',
  
  // Backend live class files
  'backend/controllers/liveClassController.js',
  'backend/routes/liveClass.js',
  'backend/models/LiveClass.js',
  'backend/socket/liveClassSocket.js',
  'backend/services/MediasoupService.js',
  'backend/services/ScalableSocketService.js',
  'backend/services/scalableLiveClassSocket.js',
  
  // Docker mediasoup file
  'Dockerfile.mediasoup',
  
  // Test files
  'backend/test-live-class-api.js',
  
  // Legacy backup files (if you want to remove them)
  'LEGACY_BACKUP'
];

// Directories to check for imports/references
const filesToCheckForReferences = [
  'frontend/src/App.js',
  'frontend/src/routes',
  'backend/server.js',
  'backend/app.js',
  'backend/routes/index.js'
];

function removeFileOrDirectory(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  
  try {
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ Removed directory: ${relativePath}`);
      } else {
        fs.unlinkSync(fullPath);
        console.log(`✅ Removed file: ${relativePath}`);
      }
    } else {
      console.log(`⚠️  File/directory not found: ${relativePath}`);
    }
  } catch (error) {
    console.error(`❌ Error removing ${relativePath}:`, error.message);
  }
}

function checkFileForReferences(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  
  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const liveClassReferences = [
        'liveclass',
        'live-class',
        'LiveClass',
        'mediasoup',
        'ScalableWebRTC',
        'CodeTantraLiveClass'
      ];
      
      const foundReferences = [];
      
      liveClassReferences.forEach(ref => {
        if (content.toLowerCase().includes(ref.toLowerCase())) {
          foundReferences.push(ref);
        }
      });
      
      if (foundReferences.length > 0) {
        console.log(`🔍 Found live class references in ${relativePath}:`);
        foundReferences.forEach(ref => {
          console.log(`   - ${ref}`);
        });
        console.log(`   👉 Please manually review and remove these references\n`);
      }
    }
  } catch (error) {
    console.error(`❌ Error checking ${relativePath}:`, error.message);
  }
}

// Remove files and directories
console.log('📂 Removing live class files and directories...\n');
filesToRemove.forEach(removeFileOrDirectory);

console.log('\n🔍 Checking for remaining references...\n');
filesToCheckForReferences.forEach(checkFileForReferences);

// Create a summary report
const reportContent = `# Live Class Cleanup Report

## Files Removed
${filesToRemove.map(file => `- ${file}`).join('\n')}

## Next Steps

### 1. Update package.json dependencies
Remove these dependencies from backend/package.json if no longer needed:
- mediasoup
- @socket.io/redis-adapter (if not using Redis elsewhere)

### 2. Update server.js/app.js
Remove any imports and initialization code for:
- MediasoupService
- ScalableSocketService
- Live class routes

### 3. Update frontend routes
Remove any routes pointing to live class components in:
- frontend/src/App.js
- frontend/src/routes/

### 4. Update navigation menus
Remove live class menu items from:
- Navigation components
- Dashboard components
- Teacher/Student menus

### 5. Database cleanup (optional)
If using MongoDB, consider removing:
- LiveClass collection
- Any live class related fields in User model

### 6. Environment variables
Remove live class related environment variables:
- MEDIASOUP_* variables
- Live class specific configurations

## Video Call Module Location
All live class functionality has been moved to:
\`video-call-module/\`

This module can be deployed independently or integrated into other applications.
`;

fs.writeFileSync(path.join(__dirname, 'LIVE_CLASS_CLEANUP_REPORT.md'), reportContent);

console.log('📋 Cleanup complete! Check LIVE_CLASS_CLEANUP_REPORT.md for next steps.');
console.log('\n🎯 All live class functionality has been moved to the video-call-module directory.');
console.log('   You can now develop and deploy the video call system independently.');