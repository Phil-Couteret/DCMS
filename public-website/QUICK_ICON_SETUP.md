# Quick PWA Icon Setup Guide

## Option 1: Online Tool (Easiest - Recommended) ⭐

1. **Go to**: https://realfavicongenerator.net/
2. **Upload** your Deep Blue logo image
3. **Configure**:
   - Select "I don't want any favicon for this device" for desktop favicons (optional)
   - Focus on Android Chrome and iOS
4. **Generate** and download the package
5. **Extract** the PNG files to `/public/pwa-icons/`
6. **Rename** files to match:
   - `icon-72x72.png`
   - `icon-96x96.png`
   - `icon-128x128.png`
   - `icon-144x144.png`
   - `icon-152x152.png`
   - `icon-192x192.png`
   - `icon-384x384.png`
   - `icon-512x512.png`

**Alternative Online Tools:**
- https://www.pwabuilder.com/imageGenerator
- https://favicon.io/favicon-generator/

---

## Option 2: Node.js Script (Automated)

### Step 1: Install Sharp
```bash
cd public-website
npm install --save-dev sharp
```

### Step 2: Add Your Logo
Place your Deep Blue logo file in one of these locations:
- `public/logo.png`
- `public/deep-blue-logo.png`
- `public/logo-deep-blue.png`
- `logo.png` (root directory)

### Step 3: Run the Script
```bash
node scripts/generate-pwa-icons.js
```

The script will automatically:
- Find your logo
- Generate all required icon sizes
- Save them to `public/pwa-icons/`

---

## Option 3: Manual (Using Image Editor)

1. Open your logo in Photoshop, GIMP, Figma, or similar
2. Create a square canvas (512x512px recommended)
3. Center your logo with padding (keep important content within 80% of canvas)
4. Export at each size:
   - 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
5. Save all files to `/public/pwa-icons/` with the naming convention above

**Design Tips:**
- Use square format (1:1 aspect ratio)
- Keep important content in the center 80% (safe zone)
- Use transparent background if possible
- Ensure logo is readable at small sizes (72x72)

---

## Option 4: Command Line (ImageMagick)

If you have ImageMagick installed:

```bash
cd public-website/public
mkdir -p pwa-icons

# Replace 'logo.png' with your actual logo filename
convert logo.png -resize 72x72 pwa-icons/icon-72x72.png
convert logo.png -resize 96x96 pwa-icons/icon-96x96.png
convert logo.png -resize 128x128 pwa-icons/icon-128x128.png
convert logo.png -resize 144x144 pwa-icons/icon-144x144.png
convert logo.png -resize 152x152 pwa-icons/icon-152x152.png
convert logo.png -resize 192x192 pwa-icons/icon-192x192.png
convert logo.png -resize 384x384 pwa-icons/icon-384x384.png
convert logo.png -resize 512x512 pwa-icons/icon-512x512.png
```

---

## Verify Icons Are Working

After adding icons:

1. **Build the app**: `npm run build`
2. **Start local server**: `npm start`
3. **Open Chrome DevTools** → Application tab
4. **Check Manifest**: Should show all 8 icons loaded
5. **Test Install**: Visit `/my-account` or `/book-dive` to see install prompt

---

## Icon Requirements Summary

| Size | Purpose | Required |
|------|---------|----------|
| 72x72 | Small Android | ✅ |
| 96x96 | Android | ✅ |
| 128x128 | Android | ✅ |
| 144x144 | Android | ✅ |
| 152x152 | iOS | ✅ |
| 192x192 | Android (maskable) | ✅ **Critical** |
| 384x384 | Android | ✅ |
| 512x512 | Android (maskable) | ✅ **Critical** |

**Note**: The 192x192 and 512x512 icons are the most important and must be "maskable" (look good when cropped to a circle).

---

## Need Help?

If you're having trouble:
1. Check that all 8 icon files exist in `/public/pwa-icons/`
2. Verify file names match exactly (case-sensitive)
3. Ensure files are valid PNG images
4. Check browser console for errors
5. Clear browser cache and service worker cache

