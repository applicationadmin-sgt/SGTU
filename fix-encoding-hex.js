const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'liveclass', 'CodeTantraLiveClass.js');

console.log('🔧 Reading file...');
let content = fs.readFileSync(filePath, 'utf8');

const originalSize = content.length;

console.log('🔨 Fixing encoding issues using hex codes...');

// Replace smart quotes using Unicode codes
// U+2018: '  (LEFT SINGLE QUOTATION MARK)
// U+2019: '  (RIGHT SINGLE QUOTATION MARK)
// U+201C: "  (LEFT DOUBLE QUOTATION MARK)
// U+201D: "  (RIGHT DOUBLE QUOTATION MARK)

content = content.replace(/\u2018/g, "'");  // Left single quote
content = content.replace(/\u2019/g, "'");  // Right single quote
content = content.replace(/\u201C/g, '"');  // Left double quote
content = content.replace(/\u201D/g, '"');  // Right double quote

// Also replace grave accent if misused
content = content.replace(/\u0060\u0060/g, '"');  // Double grave to double quote

const newSize = content.length;

console.log('💾 Creating backup...');
const backupPath = filePath + '.backup-encoding-' + Date.now();
fs.writeFileSync(backupPath, fs.readFileSync(filePath));

console.log('✍️ Writing fixed content...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed encoding issues!');
console.log(`📊 Original size: ${originalSize} bytes`);
console.log(`📊 New size: ${newSize} bytes`);
console.log(`📊 Change: ${newSize - originalSize} bytes`);
console.log(`💾 Backup saved to: ${backupPath}`);
