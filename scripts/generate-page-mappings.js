#!/usr/bin/env node
/**
 * Generate page image mappings for React Native
 * This creates the data/pages.ts file with all require() statements
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../assets/pages');
const OUTPUT_FILE = path.join(__dirname, '../data/pages.ts');

function generatePageMappings() {
  console.log('📄 Generating page image mappings...');
  
  // Get all WebP files
  const files = fs.readdirSync(PAGES_DIR)
    .filter(f => f.endsWith('.webp'))
    .sort();
  
  console.log(`✅ Found ${files.length} images`);
  
  // Generate TypeScript code
  let code = `// Auto-generated page image mappings
// Generated on: ${new Date().toISOString()}
// Total pages: ${files.length}

export const PAGE_IMAGES: Record<number, any> = {\n`;
  
  files.forEach((file, index) => {
    const pageNum = parseInt(file.match(/page-(\d+)\.webp/)[1]);
    code += `  ${pageNum}: require("../assets/pages/${file}"),\n`;
  });
  
  code += `};

export function getPageImage(pageNum: number): any {
  return PAGE_IMAGES[pageNum] || null;
}
`;
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, code, 'utf8');
  
  console.log(`✅ Generated ${OUTPUT_FILE}`);
  console.log(`📊 Total mappings: ${files.length}`);
}

generatePageMappings();
