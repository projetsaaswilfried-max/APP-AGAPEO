const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/landing');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/font-satoshi /g, '');
  content = content.replace(/font-satoshi/g, '');
  fs.writeFileSync(filePath, content, 'utf8');
});
console.log('Removed font-satoshi');
