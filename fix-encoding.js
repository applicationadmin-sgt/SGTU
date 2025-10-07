const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'liveclass', 'CodeTantraLiveClass.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Fix line 415: corrupted emoji characters
content = content.replace(
  /const roleEmoji = activeRole === 'teacher' \? '.*?' : activeRole === 'hod' \? '.*?' : '.*?';/,
  "const roleEmoji = activeRole === 'teacher' ? '\ud83d\udc68\u200d\ud83c\udfeb' : activeRole === 'hod' ? '\ud83d\udc54' : '\ud83d\udc68\u200d\ud83d\udcbc';"
);

// Fix line 416: corrupted template literal - handle the specific corrupted apostrophe
content = content.replace(
  /toast\.success\(`\$\{roleEmoji\} \$\{isLocal \? 'Your video' : name \+ [''][\u0080-\uFFFF]*s video'\} is now in focus`\);/g,
  "toast.success(`${roleEmoji} ${isLocal ? 'Your video' : name + \"'s video\"} is now in focus`);"
);

// Also try a more general pattern for the toast.success line
content = content.split('\n').map(line => {
  if (line.includes('toast.success') && line.includes('Your video') && line.includes('is now in focus')) {
    return "    toast.success(`${roleEmoji} ${isLocal ? 'Your video' : name + \"'s video\"} is now in focus`);";
  }
  return line;
}).join('\n');

// Fix line 1141: corrupted camera notification (single quotes to backticks)
content = content.replace(
  /addNotification\('.*? Camera \$\{newEnabled \? 'enabled' : 'disabled'\}', 'success'\);/g,
  "addNotification(`\ud83d\udcf9 Camera ${newEnabled ? 'enabled' : 'disabled'}`, 'success');"
);

// Fix line 1142: corrupted camera toast (single quotes to backticks)
content = content.replace(
  /toast\.success\('.*? Camera \$\{newEnabled \? 'enabled' : 'disabled'\}'\);/g,
  "toast.success(`\ud83d\udcf9 Camera ${newEnabled ? 'enabled' : 'disabled'}`);"
);

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed character encoding issues in CodeTantraLiveClass.js');
console.log('Fixed issues:');
console.log('  - Line 415: Emoji characters');
console.log('  - Line 416: Template literal with possessive apostrophe');
console.log('  - Line 1141: Camera notification template literal');
console.log('  - Line 1142: Camera toast template literal');
