#!/bin/bash
# Package DCMS for Windows transfer
# Removes unnecessary files and creates a zip package

echo "📦 Packaging DCMS for Windows..."
echo ""

# Create temporary directory with date stamp
TEMP_DIR="../DCMS-for-windows-$(date +%Y%m%d)"
if [ -d "$TEMP_DIR" ]; then
    echo "⚠️  Directory $TEMP_DIR already exists"
    read -p "Delete and recreate? (y/n): " RECREATE
    if [ "$RECREATE" = "y" ]; then
        rm -rf "$TEMP_DIR"
    else
        echo "Exiting..."
        exit 1
    fi
fi

mkdir -p "$TEMP_DIR"

echo "📂 Copying files (excluding node_modules, .git, logs)..."
rsync -av --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude '*.bak' \
  --exclude '.DS_Store' \
  --exclude 'backend/.env' \
  --exclude '.env' \
  --exclude 'dist' \
  --exclude 'build' \
  --exclude 'coverage' \
  ./ "$TEMP_DIR/"

echo ""
echo "🗜️  Creating zip archive..."
cd ..
ZIP_FILE="DCMS-for-windows-$(date +%Y%m%d).zip"

if [ -f "$ZIP_FILE" ]; then
    echo "⚠️  Zip file $ZIP_FILE already exists"
    read -p "Overwrite? (y/n): " OVERWRITE
    if [ "$OVERWRITE" != "y" ]; then
        echo "Exiting..."
        exit 1
    fi
    rm -f "$ZIP_FILE"
fi

zip -r "$ZIP_FILE" "$(basename $TEMP_DIR)" -x "*.git*" "*/node_modules/*" "*.log" "*.bak" > /dev/null

# Calculate sizes
TEMP_SIZE=$(du -sh "$TEMP_DIR" | cut -f1)
ZIP_SIZE=$(du -sh "$ZIP_FILE" | cut -f1)

echo ""
echo "===================================="
echo "✅ Package created successfully!"
echo "===================================="
echo ""
echo "📁 Package: $(pwd)/$ZIP_FILE"
echo "📏 Size: $ZIP_SIZE (uncompressed: $TEMP_SIZE)"
echo ""
echo "📋 Contents:"
echo "   ✅ Frontend source code"
echo "   ✅ Backend source code"
echo "   ✅ Database schema"
echo "   ✅ Windows startup scripts (.bat, .ps1)"
echo "   ✅ Setup documentation"
echo ""
echo "❌ Excluded (will be installed on Windows):"
echo "   - node_modules/"
echo "   - .git/"
echo "   - Log files"
echo ""
echo "🚀 Next steps:"
echo "   1. Transfer $ZIP_FILE to Windows computer"
echo "   2. Extract the zip file"
echo "   3. Follow WINDOWS_SETUP.md instructions"
echo ""

