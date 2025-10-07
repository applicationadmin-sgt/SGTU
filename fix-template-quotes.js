const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'liveclass', 'CodeTantraLiveClass.js');

console.log('🔧 Reading file...');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('🔨 Scanning for template literals with smart quotes...\n');

let fixCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Check if line contains template literal (has backticks and ${})
  if (line.includes('`') && line.includes('${')) {
    // Check for smart quotes/apostrophes within the template literal
    const hasSmartQuotes = /[\u2018\u2019\u201C\u201D]/.test(line);
    
    if (hasSmartQuotes) {
      console.log(`Line ${lineNum}: Found smart quotes in template literal`);
      console.log(`  Before: ${line.trim().substring(0, 100)}`);
      
      // Replace smart quotes with regular ones
      let fixed = line;
      fixed = fixed.replace(/\u2018/g, "'");  // ' -> '
      fixed = fixed.replace(/\u2019/g, "'");  // ' -> '
      fixed = fixed.replace(/\u201C/g, '"');  // " -> "
      fixed = fixed.replace(/\u201D/g, '"');  // " -> "
      
      lines[i] = fixed;
      console.log(`  After:  ${fixed.trim().substring(0, 100)}`);
      console.log('');
      fixCount++;
    }
  }
}

if (fixCount > 0) {
  const newContent = lines.join('\n');
  
  console.log(`💾 Creating backup...`);
  const backupPath = filePath + '.backup-template-' + Date.now();
  fs.writeFileSync(backupPath, content);
  
  console.log('✍️ Writing fixed content...');
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  console.log(`\n✅ Fixed ${fixCount} template literals with smart quotes!`);
  console.log(`💾 Backup saved to: ${backupPath}`);
} else {
  console.log('✅ No smart quotes found in template literals!');
}
