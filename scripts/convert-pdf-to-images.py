#!/usr/bin/env python3
"""
Convert PDF to optimized WebP images for smooth mobile reading experience.

Requirements:
    pip install pdf2image pillow

System dependencies:
    - poppler-utils (Linux/Mac: brew install poppler)
    - Windows: Download poppler binaries
"""

import os
from pathlib import Path
from pdf2image import convert_from_path
from PIL import Image

# Configuration
PDF_PATH = "../assets/pdf/shifa-shareef-v1.pdf"
OUTPUT_DIR = "../assets/pages"
IMAGE_FORMAT = "webp"
QUALITY = 85
DPI = 150  # Good balance between quality and file size
MAX_WIDTH = 1080  # Mobile screen width

def convert_pdf_to_images():
    """Convert PDF pages to optimized WebP images."""
    
    # Create output directory
    output_path = Path(__file__).parent / OUTPUT_DIR
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Get PDF path
    pdf_path = Path(__file__).parent / PDF_PATH
    
    if not pdf_path.exists():
        print(f"❌ PDF not found: {pdf_path}")
        return
    
    print(f"📄 Converting PDF: {pdf_path}")
    print(f"📁 Output directory: {output_path}")
    print(f"⚙️  Settings: DPI={DPI}, Quality={QUALITY}%, Format={IMAGE_FORMAT.upper()}")
    print()
    
    try:
        # Convert PDF to images
        print("🔄 Converting PDF pages to images...")
        images = convert_from_path(
            pdf_path,
            dpi=DPI,
            fmt='png',  # Intermediate format
            thread_count=4  # Use multiple threads for speed
        )
        
        total_pages = len(images)
        print(f"✅ Extracted {total_pages} pages")
        print()
        
        # Process and save each page
        total_size = 0
        for i, image in enumerate(images, start=1):
            page_num = str(i).zfill(3)  # 001, 002, etc.
            output_file = output_path / f"page-{page_num}.{IMAGE_FORMAT}"
            
            # Resize if needed (maintain aspect ratio)
            if image.width > MAX_WIDTH:
                ratio = MAX_WIDTH / image.width
                new_height = int(image.height * ratio)
                image = image.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)
            
            # Save as WebP with optimization
            image.save(
                output_file,
                format=IMAGE_FORMAT.upper(),
                quality=QUALITY,
                method=6  # Maximum compression effort
            )
            
            file_size = output_file.stat().st_size / 1024  # KB
            total_size += file_size
            
            print(f"✓ Page {page_num}/{total_pages} → {file_size:.1f} KB")
        
        print()
        print(f"🎉 Conversion complete!")
        print(f"📊 Total size: {total_size / 1024:.2f} MB")
        print(f"📊 Average per page: {total_size / total_pages:.1f} KB")
        print(f"📁 Images saved to: {output_path}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("💡 Make sure you have installed:")
        print("   pip install pdf2image pillow")
        print("   brew install poppler  # Mac")
        print("   apt install poppler-utils  # Linux")

if __name__ == "__main__":
    convert_pdf_to_images()
