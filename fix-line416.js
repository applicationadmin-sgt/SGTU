const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'liveclass', 'CodeTantraLiveClass.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

console.log('Searching for line 416 issue...');

// Fix line 416 - the template literal has incorrect quote placement
// Current: toast.success(`"${roleEmoji} `${isLocal ? 'Your video' : name + "'s video'"} is now in focus`);
// Should be: toast.success(`${roleEmoji} ${isLocal ? 'Your video' : name + "'s video"} is now in focus`);

// Pattern 1: Extra quotes before ${roleEmoji}
if (content.includes('toast.success(`"${roleEmoji}')) {
  content = content.replace(/toast\.success\(`"\$\{roleEmoji\} `\$\{isLocal \? 'Your video' : name \+ "'s video'"\} is now in focus`\)/g,
    "toast.success(`${roleEmoji} ${isLocal ? 'Your video' : name + \"'s video\"} is now in focus`)");
  console.log('✅ Fixed pattern 1');
}

// Pattern 2: Extra backtick inside template
if (content.includes('toast.success(`${roleEmoji} `${isLocal')) {
  content = content.replace(/toast\.success\(`\$\{roleEmoji\} `\$\{isLocal \? 'Your video' : name \+ "'s video'"\} is now in focus`\)/g,
    "toast.success(`${roleEmoji} ${isLocal ? 'Your video' : name + \"'s video\"} is now in focus`)");
  console.log('✅ Fixed pattern 2');
}

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Completed line 416 fix in CodeTantraLiveClass.js');
