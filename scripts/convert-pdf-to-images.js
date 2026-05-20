#!/usr/bin/env node
/**
 * Convert PDF to optimized WebP images using Node.js
 * 
 * Requirements:
 *   npm install pdf-poppler sharp
 * 
 * System dependencies:
 *   - poppler (brew install poppler on Mac, or download for Windows)
 */

const fs = require('fs');
const path = require('path');
const { convert } = require('pdf-poppler');
const sharp = require('sharp');

// Configuration
const PDF_PATH = path.join(__dirname, '../assets/pdf/shifa-shareef-v1.pdf');
const OUTPUT_DIR = path.join(__dirname, '../assets/pages');
const QUALITY = 85;
const MAX_WIDTH = 1080;

async function convertPdfToImages() {
  console.log('📄 Converting PDF to images...');
  console.log(`📁 PDF: ${PDF_PATH}`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log();

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check if PDF exists
  if (!fs.existsSync(PDF_PATH)) {
    console.error('❌ PDF file not found:', PDF_PATH);
    process.exit(1);
  }

  try {
    // Convert PDF to PNG images first (pdf-poppler output)
    const tempDir = path.join(__dirname, '../temp-pages');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log('🔄 Extracting pages from PDF...');
    
    const options = {
      format: 'png',
      out_dir: tempDir,
      out_prefix: 'page',
      page: null, // Convert all pages
      scale: 2048, // High quality
    };

    await convert(PDF_PATH, options);
    
    // Get all generated PNG files
    const pngFiles = fs.readdirSync(tempDir)
      .filter(f => f.endsWith('.png'))
      .sort();

    console.log(`✅ Extracted ${pngFiles.length} pages`);
    console.log();

    let totalSize = 0;

    // Convert each PNG to optimized WebP
    for (let i = 0; i < pngFiles.length; i++) {
      const pngFile = pngFiles[i];
      const pageNum = String(i + 1).padStart(3, '0');
      const inputPath = path.join(tempDir, pngFile);
      const outputPath = path.join(OUTPUT_DIR, `page-${pageNum}.webp`);

      try {
        // Resize and convert to WebP
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        // Resize if needed
        if (metadata.width > MAX_WIDTH) {
          const ratio = MAX_WIDTH / metadata.width;
          const newHeight = Math.round(metadata.height * ratio);
          image.resize(MAX_WIDTH, newHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }

        // Save as WebP
        await image
          .webp({ quality: QUALITY, effort: 6 })
          .toFile(outputPath);

        const stats = fs.statSync(outputPath);
        const sizeKB = stats.size / 1024;
        totalSize += sizeKB;

        console.log(`✓ Page ${pageNum}/${pngFiles.length} → ${sizeKB.toFixed(1)} KB`);
      } catch (error) {
        console.log(`✗ Page ${pageNum}/${pngFiles.length} → SKIPPED (corrupted)`);
      }

      // Clean up temp PNG
      try {
        fs.unlinkSync(inputPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // Clean up temp directory
    fs.rmdirSync(tempDir);

    console.log();
    console.log('🎉 Conversion complete!');
    console.log(`📊 Total size: ${(totalSize / 1024).toFixed(2)} MB`);
    console.log(`📊 Average per page: ${(totalSize / pngFiles.length).toFixed(1)} KB`);
    console.log(`📁 Images saved to: ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log();
    console.log('💡 Make sure you have installed:');
    console.log('   npm install pdf-poppler sharp');
    console.log('   brew install poppler  # Mac');
    console.log('   apt install poppler-utils  # Linux');
    process.exit(1);
  }
}

convertPdfToImages();
