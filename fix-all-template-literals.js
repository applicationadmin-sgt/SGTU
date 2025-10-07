const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'liveclass', 'CodeTantraLiveClass.js');

console.log('🔧 Fixing all template literal corruptions in CodeTantraLiveClass.js...\n');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');
const originalLength = content.length;

// Fix all smart quotes in template literals - replace with regular backticks
// This handles the pattern where single quotes are used instead of backticks
content = content.replace(/console\.log\('([^']*\$\{[^']*\}[^']*)'\);/g, 'console.log(`$1`);');
content = content.replace(/console\.warn\('([^']*\$\{[^']*\}[^']*)'\);/g, 'console.warn(`$1`);');
content = content.replace(/console\.error\('([^']*\$\{[^']*\}[^']*)'\);/g, 'console.error(`$1`);');
content = content.replace(/toast\.info\('([^']*\$\{[^']*\}[^']*)'\);/g, 'toast.info(`$1`);');
content = content.replace(/toast\.success\('([^']*\$\{[^']*\}[^']*)'\);/g, 'toast.success(`$1`);');
content = content.replace(/toast\.error\('([^']*\$\{[^']*\}[^']*)'\);/g, 'toast.error(`$1`);');
content = content.replace(/toast\.warning\('([^']*\$\{[^']*\}[^']*)'\);/g, 'toast.warning(`$1`);');
content = content.replace(/addNotification\('([^']*\$\{[^']*\}[^']*)'/g, 'addNotification(`$1`');

// Fix all smart quotes (left and right single quotes)
content = content.replace(/'/g, "'");
content = content.replace(/'/g, "'");
content = content.replace(/"/g, '"');
content = content.replace(/"/g, '"');

// Fix specific corrupted emoji patterns
content = content.replace(/''¨â€«'/g, "'👨‍🏫'");
content = content.replace(/''¤'/g, "'👔'");
content = content.replace(/''¨â€Ž"'/g, "'👨‍💼'");
content = content.replace(/''"¹'/g, "'📹'");
content = content.replace(/''Ž¤'/g, "'🎤'");
content = content.replace(/'"Œ/g, '📌');
content = content.replace(/''¬/g, '💬');
content = content.replace(/''¥/g, '👥');
content = content.replace(/''"„/g, '📝');
content = content.replace(/''¡/g, '📢');
content = content.replace(/''Š/g, '📊');
content = content.replace(/'"—/g, '⚙️');
content = content.replace(/'"¤/g, '📤');
content = content.replace(/'"Ž¥/g, '🎥');
content = content.replace(/'"„/g, '📋');
content = content.replace(/''¨/g, '⚠️');
content = content.replace(/'"†/g, '🔑');
content = content.replace(/'šª/g, '🚪');
content = content.replace(/'âœ…/g, '✅');
content = content.replace(/'âŒ/g, '❌');

// Backup the original file
const backupPath = filePath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, fs.readFileSync(filePath));

// Write the fixed content
fs.writeFileSync(filePath, content, 'utf8');

const newLength = content.length;
const changeCount = originalLength !== newLength ? Math.abs(originalLength - newLength) : 0;

console.log('✅ Fixed template literal corruptions!');
console.log(`📊 Original size: ${originalLength} bytes`);
console.log(`📊 New size: ${newLength} bytes`);
console.log(`📊 Change: ${changeCount} bytes`);
console.log(`💾 Backup saved to: ${path.basename(backupPath)}`);
console.log('\n🔨 Ready to test build!');
