const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'liveclass', 'CodeTantraLiveClass.js');

console.log('🔧 Reading file...');
let content = fs.readFileSync(filePath, 'utf8');

const originalSize = content.length;

console.log('🔨 Fixing quote issues...');

// Fix all smart quotes to regular quotes
content = content.replace(/'/g, "'");  // Left single quote
content = content.replace(/'/g, "'");  // Right single quote
content = content.replace(/"/g, '"');  // Left double quote
content = content.replace(/"/g, '"');  // Right double quote

// Fix specific corrupted emoji patterns that appear in the errors
content = content.replace(/''¨â€«'/g, '👨‍🏫');  // Teacher emoji
content = content.replace(/''¤'/g, '👔');  // Tie emoji (HOD)
content = content.replace(/''¨â€Ž"'/g, '👨‍💼');  // Business person emoji
content = content.replace(/''"¹'/g, '📹');  // Video camera emoji
content = content.replace(/''Ž¤'/g, '🎤');  // Microphone emoji
content = content.replace(/''¬'/g, '💬');  // Speech bubble emoji
content = content.replace(/'"Œ'/g, '📌');  // Pushpin emoji
content = content.replace(/'"Š'/g, '🎙️');  // Studio microphone emoji
content = content.replace(/''¥'/g, '👥');  // Busts in silhouette emoji

// Fix specific problematic lines from the errors
// Line 396 area - console.log with corrupted quotes
content = content.replace(/console\.log\(['""]Œ Pinning video:/g, "console.log('📌 Pinning video:");
content = content.replace(/console\.log\(['""]Œ Unpinning video['"]/g, "console.log('📌 Unpinning video')");

// Line 579 area - console.log with corrupted quotes
content = content.replace(/console\.log\(['""]Š Class media permissions:/g, "console.log('🎙️ Class media permissions:");

// Line 668 area - emoji in toast messages
content = content.replace(/console\.log\(''¥ Participants list updated:/g, "console.log('👥 Participants list updated:");

// Line 690 area - emoji variables in toast messages
content = content.replace(/const roleEmoji = data\.pinnedByRole === ['"]teacher['"] \? ''¨â€«' : data\.pinnedByRole === ['"]hod['"] \? ''¤' : ''¨â€Ž"';/g, 
  "const roleEmoji = data.pinnedByRole === 'teacher' ? '👨‍🏫' : data.pinnedByRole === 'hod' ? '👔' : '👨‍💼';");

content = content.replace(/const roleEmoji = data\.unpinnedByRole === ['"]teacher['"] \? ''¨â€«' : data\.unpinnedByRole === ['"]hod['"] \? ''¤' : ''¨â€Ž"';/g,
  "const roleEmoji = data.unpinnedByRole === 'teacher' ? '👨‍🏫' : data.unpinnedByRole === 'hod' ? '👔' : '👨‍💼';");

// Line 772, 808, 836 - Disconnected messages with corrupted quotes
content = content.replace(/console\.log\(['"]"Œ Disconnected - attempting to reconnect in['"] \+ /g, "console.log('📌 Disconnected - attempting to reconnect in ' + ");

// Line 1230 - Chat messages with corrupted quotes
content = content.replace(/console\.log\(''¬ Chat message received:/g, "console.log('💬 Chat message received:");

// Line 1627 - Error messages
content = content.replace(/console\.log\(['"]âŒ Error loading class:/g, "console.log('❌ Error loading class:");

// Fix any remaining console.log with corrupted emoji patterns
content = content.replace(/console\.log\(['"]âŒ /g, "console.log('❌ ");
content = content.replace(/console\.log\(['"]âœ… /g, "console.log('✅ ");

// Additional cleanup for any remaining malformed patterns
console.log('🧹 Additional cleanup...');

const newSize = content.length;

console.log('💾 Creating backup...');
const backupPath = filePath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, fs.readFileSync(filePath));

console.log('✍️ Writing fixed content...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed all quote and emoji issues!');
console.log(`📊 Original size: ${originalSize} bytes`);
console.log(`📊 New size: ${newSize} bytes`);
console.log(`📊 Change: ${newSize - originalSize} bytes`);
console.log(`💾 Backup saved to: ${backupPath}`);
console.log('');
console.log('🔨 Now run: cd frontend && npm run build');
