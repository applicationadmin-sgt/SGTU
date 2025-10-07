const fs = require('fs');
const path = require('path');

const filePath = './frontend/src/components/liveclass/CodeTantraLiveClass.js';

console.log('🔧 Starting comprehensive character encoding fix...\n');

// Read file
let content = fs.readFileSync(filePath, 'utf8');
const originalSize = content.length;

console.log(`Original file size: ${originalSize} bytes\n`);

// Store original for comparison
const original = content;

// Fix 1: Line 473 - Corrupted teacher emoji
console.log('Fixing line 473: Corrupted teacher emoji');
content = content.replace(
  /console\.log\((['"])[\s\S]{1,10}Teacher updated permissions locally:/,
  "console.log('👨‍🏫 Teacher updated permissions locally:"
);

// Fix 2: Line 559 - Template literal with wrong quotes
console.log('Fixing line 559: Template literal quote');
content = content.replace(
  /console\.log\(['"]✅ canUseMedia\(\$\{permissionType\}\):['`],/,
  "console.log(`✅ canUseMedia(\${permissionType}):`,"
);

// Fix 3: Line 2278 - Corrupted emojis in JSX startIcon
console.log('Fixing line 2278: JSX startIcon emojis');
content = content.replace(
  /startIcon=\{participant\.role === ['"]teacher['"] \? ['"][\s\S]{1,20}['"] : ['"][\s\S]{1,20}['"]\}/,
  "startIcon={participant.role === 'teacher' ? '👨‍🏫' : '👨‍💼'}"
);

// Additional comprehensive fixes for any remaining corrupted emojis
console.log('\nApplying comprehensive emoji fixes...');

// Replace various corrupted emoji patterns with proper emojis
const emojiReplacements = [
  // Teacher emoji corruptions
  { pattern: /['"]['\u0080-\u00FF]{2,10}\s*Teacher/g, replacement: "'👨‍🏫 Teacher" },
  { pattern: /['"]['\u0080-\u00FF]{2,10}['"][\s,\)]/g, replacement: "'👨‍🏫'" },
  
  // Generic corrupted emoji patterns at start of strings
  { pattern: /(['"])[\u0080-\u00FF]{2,10}\s+/g, replacement: "$1👥 " },
  
  // Fix any remaining template literal issues
  { pattern: /console\.log\(['"]([^'"`]+)\$\{([^}]+)\}([^'"`]*)['"]/g, replacement: "console.log(`$1\${$2}$3`" }
];

emojiReplacements.forEach((fix, index) => {
  const before = content.length;
  content = content.replace(fix.pattern, fix.replacement);
  const after = content.length;
  if (before !== after) {
    console.log(`  ✓ Applied fix ${index + 1}: ${before - after} bytes changed`);
  }
});

// Write the fixed content
fs.writeFileSync(filePath, content, 'utf8');

const newSize = content.length;
const diff = originalSize - newSize;

console.log(`\n✅ Fix complete!`);
console.log(`New file size: ${newSize} bytes`);
console.log(`Size difference: ${diff} bytes`);
console.log(`\nChanges made: ${original === content ? 'None (no matches found)' : 'File updated'}`);

// Show sample of changes
if (original !== content) {
  console.log('\n📝 Verifying changes...');
  
  const lines = content.split('\n');
  
  if (lines[472]) {
    console.log(`Line 473: ${lines[472].substring(0, 100)}...`);
  }
  if (lines[558]) {
    console.log(`Line 559: ${lines[558].substring(0, 100)}...`);
  }
  if (lines[2277]) {
    console.log(`Line 2278: ${lines[2277].substring(0, 100)}...`);
  }
}
