const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'liveclass', 'CodeTantraLiveClass.js');

console.log('📝 Verifying CodeTantraLiveClass.js...\n');

// Read the file
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Check specific lines that were problematic
const checks = [
  { line: 415, description: 'roleEmoji assignment', expected: /const roleEmoji = activeRole === 'teacher' \? '.*?' : activeRole === 'hod' \? '.*?' : '.*?';/ },
  { line: 416, description: 'toast.success with template literal', expected: /toast\.success\(`.*?\$\{.*?\}.*?`\);/ },
  { line: 1141, description: 'Camera notification with backticks', expected: /addNotification\(`.*?Camera.*?`/ },
  { line: 1142, description: 'Camera toast with backticks', expected: /toast\.success\(`.*?Camera.*?`\);/ },
  { line: 2227, description: 'Chip label with template literal', expected: /label=\{`.*?FOCUS:.*?`\}/ }
];

let allGood = true;

checks.forEach(check => {
  const lineContent = lines[check.line - 1];
  const matches = check.expected.test(lineContent);
  const status = matches ? '✅' : '❌';
  
  console.log(`${status} Line ${check.line}: ${check.description}`);
  if (!matches) {
    console.log(`   Content: ${lineContent.trim()}`);
    allGood = false;
  }
});

console.log('\n' + (allGood ? '✅ All checks passed!' : '⚠️  Some issues found'));

// Additional verification
const issues = [];

// Check for smart quotes in template literals
if (content.includes("'")) {
  const count = (content.match(/'/g) || []).length;
  issues.push(`⚠️  Found ${count} smart quotes (') that should be regular quotes`);
}

// Check for corrupted emoji patterns
if (/''[^\w\s]/.test(content)) {
  issues.push(`⚠️  Found potentially corrupted emoji characters`);
}

if (issues.length > 0) {
  console.log('\n📋 Additional issues:');
  issues.forEach(issue => console.log(issue));
} else {
  console.log('\n✨ No additional issues found');
}

console.log('\n🔨 Ready to build!');
