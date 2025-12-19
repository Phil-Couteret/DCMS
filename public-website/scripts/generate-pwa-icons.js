#!/usr/bin/env node

/**
 * Generate PWA Icons from Logo
 * 
 * Usage:
 *   1. Place your logo file (logo.png or logo.jpg) in the public-website/public/ directory
 *   2. Install sharp: npm install --save-dev sharp
 *   3. Run: node scripts/generate-pwa-icons.js
 * 
 * Or use online tool: https://realfavicongenerator.net/
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('\n❌ Error: "sharp" package not found.');
  console.log('\n📦 To install: npm install --save-dev sharp');
  console.log('\n💡 Alternative: Use online tool at https://realfavicongenerator.net/');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'pwa-icons');

// Icon sizes required
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Find logo file
const logoExtensions = ['.svg', '.png', '.jpg', '.jpeg']; // SVG first since we just downloaded it
let logoPath = null;

for (const ext of logoExtensions) {
  const possiblePaths = [
    path.join(publicDir, `logo${ext}`),
    path.join(publicDir, `deep-blue-logo${ext}`),
    path.join(publicDir, `logo-deep-blue${ext}`),
    path.join(__dirname, '..', `logo${ext}`),
  ];
  
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      logoPath = possiblePath;
      break;
    }
  }
  if (logoPath) break;
}

if (!logoPath) {
  console.error('\n❌ Logo file not found!');
  console.log('\n📁 Please place your logo file in one of these locations:');
  console.log('   - public/logo.png');
  console.log('   - public/deep-blue-logo.png');
  console.log('   - public/logo-deep-blue.png');
  console.log('   - logo.png (root directory)');
  console.log('\n💡 Supported formats: PNG, JPG, JPEG, SVG');
  process.exit(1);
}

console.log(`\n✅ Found logo: ${path.basename(logoPath)}`);
console.log(`📁 Output directory: ${iconsDir}\n`);

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('📂 Created pwa-icons directory\n');
}

// Generate icons
async function generateIcons() {
  try {
    console.log('🎨 Generating PWA icons...\n');
    
    for (const size of iconSizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);
      
      console.log(`   ✅ Created icon-${size}x${size}.png`);
    }
    
    console.log('\n✨ All icons generated successfully!');
    console.log(`\n📱 Icons are ready in: ${iconsDir}`);
    console.log('\n🚀 Your PWA is now ready to use!');
    
  } catch (error) {
    console.error('\n❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

