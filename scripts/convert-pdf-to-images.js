#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { convert } = require("pdf-poppler");
const sharp = require("sharp");

function getArgument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index === process.argv.length - 1) {
    return fallback;
  }

  return process.argv[index + 1];
}

const volumeId = getArgument("volume", "volume1");
const defaultPdfFile =
  volumeId === "volume2" ? "shifa-shareef-v2.pdf" : "shifa-shareef-v1.pdf";
const pdfFileName = getArgument("pdf", defaultPdfFile);
const PDF_PATH = path.join(__dirname, "../assets/pdf", pdfFileName);
const OUTPUT_DIR = path.join(__dirname, "../assets/pages", volumeId);
const TEMP_DIR = path.join(__dirname, `../temp-pages-${volumeId}`);
const QUALITY = 85;
const MAX_WIDTH = 1080;

async function convertPdfToImages() {
  console.log("Converting PDF to images...");
  console.log(`Volume: ${volumeId}`);
  console.log(`PDF: ${PDF_PATH}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  if (!fs.existsSync(PDF_PATH)) {
    console.error(`PDF file not found: ${PDF_PATH}`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  try {
    await convert(PDF_PATH, {
      format: "png",
      out_dir: TEMP_DIR,
      out_prefix: "page",
      page: null,
      scale: 2048,
    });

    const pngFiles = fs
      .readdirSync(TEMP_DIR)
      .filter((file) => file.endsWith(".png"))
      .sort();

    let totalSize = 0;

    for (let index = 0; index < pngFiles.length; index += 1) {
      const pngFile = pngFiles[index];
      const pageNum = String(index + 1).padStart(3, "0");
      const inputPath = path.join(TEMP_DIR, pngFile);
      const outputPath = path.join(OUTPUT_DIR, `page-${pageNum}.webp`);
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      if (metadata.width && metadata.width > MAX_WIDTH && metadata.height) {
        const ratio = MAX_WIDTH / metadata.width;
        image.resize(MAX_WIDTH, Math.round(metadata.height * ratio), {
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      await image.webp({ quality: QUALITY, effort: 6 }).toFile(outputPath);
      totalSize += fs.statSync(outputPath).size / 1024;
      fs.unlinkSync(inputPath);
      console.log(`Page ${pageNum}/${pngFiles.length}`);
    }

    fs.rmdirSync(TEMP_DIR);

    console.log("Conversion complete.");
    console.log(`Pages: ${pngFiles.length}`);
    console.log(`Total size: ${(totalSize / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error("Conversion failed:", error.message);
    process.exit(1);
  }
}

convertPdfToImages();
