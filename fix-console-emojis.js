const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'liveclass', 'CodeTantraLiveClass.js');

console.log('🔧 Fixing console.log statements with emoji issues...\n');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Fix pattern: console.log(emoji text'); -> console.log('emoji text');
// Match console.log/warn/error with emoji at start (no quote before emoji)
content = content.replace(/console\.(log|warn|error)\((✅|❌|📌|💬|👥|📝|📢|📊|⚙️|📤|🎥|📋|⚠️|🔑|🚪) ([^)]+)\);/g, 
  "console.$1('$2 $3);");

// Fix similar pattern for toast
content = content.replace(/toast\.(info|success|error|warning)\((✅|❌|📌|💬|👥|📝|📢|📊|⚙️|📤|🎥|📋|⚠️|🔑|🚪) ([^)]+)\);/g,
  "toast.$1('$2 $3);");

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed console.log emoji issues!');
console.log('🔨 Ready to test!');
