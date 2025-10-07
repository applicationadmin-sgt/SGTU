const fs = require('fs');

const filePath = './frontend/src/components/liveclass/CodeTantraLiveClass.js';

console.log('Reading file...');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);

// Fix line 473 (index 472) - corrupted teacher emoji
if (lines[472]) {
  console.log('Line 473 before:', lines[472]);
  lines[472] = lines[472].replace(/console\.log\('.*? Teacher updated permissions locally:'/, "console.log('\u{1F468}\u{200D}\u{1F3EB} Teacher updated permissions locally:'");
  console.log('Line 473 after:', lines[472]);
}

// Fix line 2278 (index 2277) - corrupted emojis in startIcon
if (lines[2277]) {
  console.log('Line 2278 before:', lines[2277]);
  lines[2277] = lines[2277].replace(/startIcon=\{participant\.role === 'teacher' \? '.*?' : '.*?'\}/, "startIcon={participant.role === 'teacher' ? '\u{1F468}\u{200D}\u{1F3EB}' : '\u{1F468}\u{200D}\u{1F4BC}'}");
  console.log('Line 2278 after:', lines[2277]);
}

// Write back
content = lines.join('\n');
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ Fixed corrupted emojis on lines 473 and 2278');
console.log('File size:', fs.statSync(filePath).size, 'bytes');
