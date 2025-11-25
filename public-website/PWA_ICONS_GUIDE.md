# PWA Icons Setup Guide

## Required Icons

The PWA requires the following icon sizes in the `/public/pwa-icons/` directory:

- `icon-72x72.png` (72x72 pixels)
- `icon-96x96.png` (96x96 pixels)
- `icon-128x128.png` (128x128 pixels)
- `icon-144x144.png` (144x144 pixels)
- `icon-152x152.png` (152x152 pixels)
- `icon-192x192.png` (192x192 pixels) - **Required for Android**
- `icon-384x384.png` (384x384 pixels)
- `icon-512x512.png` (512x512 pixels) - **Required for Android**

## Quick Setup Options

### Option 1: Use an Online Icon Generator
1. Visit https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload your logo (recommended: 512x512px or larger)
3. Generate all required sizes
4. Download and place them in `/public/pwa-icons/`

### Option 2: Create Icons Manually
1. Start with a high-resolution logo (at least 512x512px)
2. Use image editing software (Photoshop, GIMP, Figma) to create each size
3. Ensure icons are square and centered
4. Save as PNG with transparent background (if applicable)

### Option 3: Use a Script (Node.js)
If you have ImageMagick or similar installed:
```bash
# Create directory
mkdir -p public/pwa-icons

# Generate icons from a source image (source.png should be 512x512 or larger)
convert source.png -resize 72x72 public/pwa-icons/icon-72x72.png
convert source.png -resize 96x96 public/pwa-icons/icon-96x96.png
convert source.png -resize 128x128 public/pwa-icons/icon-128x128.png
convert source.png -resize 144x144 public/pwa-icons/icon-144x144.png
convert source.png -resize 152x152 public/pwa-icons/icon-152x152.png
convert source.png -resize 192x192 public/pwa-icons/icon-192x192.png
convert source.png -resize 384x384 public/pwa-icons/icon-384x384.png
convert source.png -resize 512x512 public/pwa-icons/icon-512x512.png
```

### Option 4: Placeholder Icons (For Testing)
For development/testing, you can create simple colored squares:

```bash
mkdir -p public/pwa-icons
# Create a simple blue square as placeholder (requires ImageMagick)
convert -size 512x512 xc:#1976d2 public/pwa-icons/icon-512x512.png
# Then resize to other sizes...
```

## Icon Design Guidelines

- **Square format**: All icons must be square (1:1 aspect ratio)
- **Safe zone**: Keep important content within 80% of the icon (to avoid cropping on some devices)
- **Maskable icons**: The 192x192 and 512x512 icons should be "maskable" - meaning they look good when cropped to a circle or rounded square
- **Background**: Use a solid color background or ensure transparency works well
- **Branding**: Include your logo/name clearly visible at all sizes

## Testing

After adding icons:
1. Build the app: `npm run build`
2. Serve the build folder with HTTPS (required for PWA)
3. Open in Chrome DevTools > Application > Manifest
4. Verify all icons are loading correctly
5. Test installation on mobile device

## Notes

- Icons are referenced in `public/manifest.json`
- The service worker will cache these icons for offline use
- iOS requires specific Apple Touch Icon sizes (handled in `index.html`)

