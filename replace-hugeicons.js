const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/landing');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const mapping = {
  'solar:quote-right-bold': 'hugeicons:quote-down',
  'solar:map-point-linear': 'hugeicons:location-01',
  'solar:church-linear': 'hugeicons:church',
  'solar:hand-stars-linear': 'hugeicons:sparkles',
  'solar:book-linear': 'hugeicons:book-open-01',
  'solar:close-circle-linear': 'hugeicons:cancel-circle',
  'solar:heart-linear': 'hugeicons:favorite',
  'solar:check-circle-linear': 'hugeicons:tick-circle',
  'solar:check-circle-bold': 'hugeicons:tick-circle',
  'solar:crown-linear': 'hugeicons:crown',
  'solar:gallery-wide-linear': 'hugeicons:image-01',
  'solar:music-note-linear': 'hugeicons:music-note-01',
  'solar:hands-praying-linear': 'hugeicons:pray',
  'solar:alt-arrow-right-linear': 'hugeicons:arrow-right-01',
  'solar:arrow-right-linear': 'hugeicons:arrow-right-01',
  'solar:heart-bold': 'hugeicons:favorite',
  'solar:heart-angle-bold': 'hugeicons:favorite'
};

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const [solar, huge] of Object.entries(mapping)) {
    // Replace all occurrences
    const regex = new RegExp(`icon="${solar}"`, 'g');
    content = content.replace(regex, `icon="${huge}"`);
  }
  
  if (originalContent !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated icons in ${file}`);
  }
});
