const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      searchDir(full, pattern);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      if (pattern.test(content)) {
        console.log(`Matched in: ${full}`);
      }
    }
  }
}

console.log('Searching for fake IDs:');
searchDir('./src', /(usr-leader-|usr-servant-|srv-peter|مارك مجدي|بيتر ناصر)/);
