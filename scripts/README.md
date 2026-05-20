# PDF to Images Conversion

This script converts the Shifa Shareef PDF into optimized WebP images for smooth mobile reading.

## Prerequisites

### Install Python dependencies:
```bash
pip install pdf2image pillow
```

### Install system dependencies:

**macOS:**
```bash
brew install poppler
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install poppler-utils
```

**Windows:**
1. Download poppler from: https://github.com/oschwartz10612/poppler-windows/releases
2. Extract and add `bin` folder to PATH

## Usage

```bash
cd shifa-shareef/scripts
python convert-pdf-to-images.py
```

## Output

- Creates `assets/pages/` directory
- Generates 310 WebP images: `page-001.webp` to `page-310.webp`
- Each image: ~50-100 KB
- Total size: ~15-30 MB

## Configuration

Edit the script to adjust:
- `DPI`: Image resolution (default: 150)
- `QUALITY`: WebP quality 0-100 (default: 85)
- `MAX_WIDTH`: Max image width in pixels (default: 1080)
