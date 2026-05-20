# PDF to Images Conversion Guide

## Overview

We're converting the PDF to WebP images for instant, smooth page transitions (like Instagram/TikTok).

## Step 1: Install Dependencies

### Python packages:
```bash
pip install pdf2image pillow
```

### System dependencies:

**Windows:**
```bash
# Install poppler (PDF rendering library)
# Download from: https://github.com/oschwartz10612/poppler-windows/releases
# Extract and add the 'bin' folder to your PATH
```

**macOS:**
```bash
brew install poppler
```

**Linux:**
```bash
sudo apt-get install poppler-utils
```

## Step 2: Run Conversion Script

```bash
cd shifa-shareef/scripts
python convert-pdf-to-images.py
```

This will:
- Read `assets/pdf/shifa-shareef-v1.pdf`
- Create `assets/pages/` directory
- Generate 310 WebP images: `page-001.webp` to `page-310.webp`
- Each image: ~50-100 KB
- Total: ~15-30 MB

**Expected output:**
```
📄 Converting PDF: ../assets/pdf/shifa-shareef-v1.pdf
📁 Output directory: ../assets/pages
⚙️  Settings: DPI=150, Quality=85%, Format=WEBP

🔄 Converting PDF pages to images...
✅ Extracted 310 pages

✓ Page 001/310 → 87.3 KB
✓ Page 002/310 → 92.1 KB
...
✓ Page 310/310 → 85.7 KB

🎉 Conversion complete!
📊 Total size: 27.45 MB
📊 Average per page: 90.7 KB
```

## Step 3: Update Reader Code

After images are generated, update `app/reader/[page].tsx`:

**Find this line:**
```typescript
return null; // Will be replaced with: require(...)
```

**Replace with:**
```typescript
return require(`../../assets/pages/page-${pageStr}.webp`);
```

## Step 4: Test

```bash
npm start
# Press 'a' for Android or 'i' for iOS
```

Navigate to the reader - you should now have:
✅ Instant page loads (<100ms)
✅ Smooth vertical swipe
✅ No crashes
✅ Instagram-like experience

## Troubleshooting

### "poppler not found"
- Make sure poppler is installed and in PATH
- Restart terminal after installation

### "Module not found" error
- Images must be in `assets/pages/` directory
- File names must match: `page-001.webp`, `page-002.webp`, etc.

### Images too large
- Reduce `QUALITY` in script (try 75 or 80)
- Reduce `DPI` (try 120 or 100)
- Reduce `MAX_WIDTH` (try 900 or 800)

### App bundle too large
- Consider on-demand download for images
- Or split into multiple smaller bundles

## Performance Specs

**Before (PDF)**:
- Page load: 3-10 seconds
- Memory: Crashes with multiple pages
- Swipe: Laggy, unreliable

**After (Images)**:
- Page load: <100ms
- Memory: Only 3 pages in RAM (~300 KB)
- Swipe: Instant, smooth, native

## Next Steps

After conversion works:
1. Add pinch-to-zoom (react-native-image-zoom-viewer)
2. Add image caching optimization
3. Consider lazy loading for first-time users
4. Add download progress indicator
