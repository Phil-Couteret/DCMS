# Logo Placement Instructions

## Where to Place Your Deep Blue Logo

To generate PWA icons, please save your Deep Blue logo file in one of these locations:

### Preferred Location:
```
public-website/public/logo.png
```

### Alternative Locations (script will find these too):
- `public-website/public/deep-blue-logo.png`
- `public-website/public/logo-deep-blue.png`
- `public-website/logo.png` (root directory)

## Supported Formats
- PNG (recommended)
- JPG/JPEG
- SVG

## After Placing the Logo

Once you've saved the logo file, you can generate all PWA icons automatically:

```bash
cd public-website
npm install --save-dev sharp
npm run generate-icons
```

Or use the online tool at https://realfavicongenerator.net/

## Logo Requirements
- **Recommended size**: 512x512 pixels or larger
- **Format**: Square (1:1 aspect ratio) works best
- **Background**: Transparent or solid color
- **Content**: Keep important elements in the center 80% (safe zone)

