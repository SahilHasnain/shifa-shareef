#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function getArgument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index === process.argv.length - 1) {
    return fallback;
  }

  return process.argv[index + 1];
}

const volumeId = getArgument("volume", "volume1");
const pagesDir = path.join(__dirname, "../assets/pages", volumeId);
const outputFile = path.join(__dirname, `../data/volumes/${volumeId}/pages.ts`);

function generatePageMappings() {
  const files = fs
    .readdirSync(pagesDir)
    .filter((file) => file.endsWith(".webp"))
    .sort();

  let code = `// Auto-generated page image mappings
// Generated on: ${new Date().toISOString()}
// Total pages: ${files.length}

export const PAGE_IMAGES: Record<number, any> = {\n`;

  for (const file of files) {
    const match = file.match(/page-(\d+)\.webp/);
    if (!match) {
      continue;
    }

    const pageNum = Number(match[1]);
    code += `  ${pageNum}: require("../../../assets/pages/${volumeId}/${file}"),\n`;
  }

  code += `};

export function getPageImage(pageNum: number) {
  return PAGE_IMAGES[pageNum] || null;
}
`;

  fs.writeFileSync(outputFile, code, "utf8");
  console.log(`Generated ${outputFile}`);
}

generatePageMappings();
