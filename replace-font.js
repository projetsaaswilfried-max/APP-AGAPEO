const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/landing');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const lines = content.split('\n');
  const newLines = lines.map(line => {
    // Si c'est un titre h1, h2, h3, h4, on ne touche pas
    if (line.includes('<h1') || line.includes('<h2') || line.includes('<h3') || line.includes('<h4')) {
      return line;
    }
    // Sinon, on remplace font-medium et font-semibold par font-satoshi font-light
    return line
      .replace(/font-medium/g, 'font-satoshi font-light')
      .replace(/font-semibold/g, 'font-satoshi font-light');
  });
  
  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
});
console.log('Fonts updated successfully!');
