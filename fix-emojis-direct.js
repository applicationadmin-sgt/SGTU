const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'liveclass', 'CodeTantraLiveClass.js');

console.log('🔧 Reading file...');
let content = fs.readFileSync(filePath, 'utf8');

const originalSize = content.length;

console.log('🔨 Scanning for corrupted emoji patterns...\n');

//Search for lines containing roleEmoji and fix them
const lines = content.split('\n');
let fixCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if line has role emoji assignment with corrupted characters
  if (line.includes('roleEmoji') && line.includes('teacher') && line.includes('hod')) {
    console.log(`Line ${i + 1}: Found corrupted roleEmoji assignment`);
    console.log(`  Before: ${line.trim()}`);
    
    // Replace with correct version
    const fixed = "    const roleEmoji = activeRole === 'teacher' ? '👨‍🏫' : activeRole === 'hod' ? '👔' : '👨‍💼';";
    
    lines[i] = line.replace(/const roleEmoji = .*teacher.*hod.*/, fixed.trim());
    
    console.log(`  After: ${lines[i].trim()}`);
    fixCount++;
  }
  
  // Fix console.log lines with corrupted emojis at the start
  if (line.includes('console.log(') && /console\.log\([^'"a-zA-Z0-9]/.test(line)) {
    const corrupted = line;
    let fixed = line;
    
    // Common console.log emoji fixes
    fixed = fixed.replace(/console\.log\(.[^a-zA-Z0-9'"` ]+ /, "console.log('📌 ");
    fixed = fixed.replace(/console\.log\(.[^a-zA-Z0-9'"` ]+ /, "console.log('🎙️ ");
    fixed = fixed.replace(/console\.log\(.[^a-zA-Z0-9'"` ]+ /, "console.log('👥 ");
    fixed = fixed.replace(/console\.log\(.[^a-zA-Z0-9'"` ]+ /, "console.log('💬 ");
    fixed = fixed.replace(/console\.log\(.[^a-zA-Z0-9'"` ]+ /, "console.log('❌ ");
    fixed = fixed.replace(/console\.log\(.[^a-zA-Z0-9'"` ]+ /, "console.log('✅ ");
    
    if (fixed !== corrupted) {
      console.log(`Line ${i + 1}: Fixed console.log emoji`);
      lines[i] = fixed;
      fixCount++;
    }
  }
}

if (fixCount > 0) {
  const newContent = lines.join('\n');
  
  console.log(`\n💾 Creating backup...`);
  const backupPath = filePath + '.backup-emoji-direct-' + Date.now();
  fs.writeFileSync(backupPath, content);

  console.log('✍️ Writing fixed content...');
  fs.writeFileSync(filePath, newContent, 'utf8');

  console.log(`\n✅ Fixed ${fixCount} corrupted emojis!`);
  console.log(`📊 Original size: ${originalSize} bytes`);
  console.log(`📊 New size: ${newContent.length} bytes`);
  console.log(`📊 Change: ${newContent.length - originalSize} bytes`);
  console.log(`💾 Backup saved to: ${backupPath}`);
} else {
  console.log('\n✅ No corrupted emojis found to fix!');
}
