#!/usr/bin/env node
/**
 * Extract per-page labels and TOC from source PDFs using pdfjs-dist.
 * Outputs page-meta.ts and toc.ts for each language/volume.
 */
const fs = require("fs");
const path = require("path");
const pdfjs = require("pdfjs-dist/legacy/build/pdf.mjs");

const ROOT = path.join(__dirname, "..");

const VOLUMES = [
  {
    languageId: "urdu",
    volumeId: "volume1",
    pdfFile: "shifa-shareef-v1.pdf",
    sectionsFile: "data/volumes/volume1/sections.ts",
    totalPagesConst: "VOLUME1_TOTAL_PAGES",
  },
  {
    languageId: "urdu",
    volumeId: "volume2",
    pdfFile: "shifa-shareef-v2.pdf",
    sectionsFile: "data/volumes/volume2/sections.ts",
    totalPagesConst: "VOLUME2_TOTAL_PAGES",
  },
  {
    languageId: "roman-urdu",
    volumeId: "volume1",
    pdfFile: "shifa-shareef-roman_urdu.pdf",
    sectionsFile: "data/languages/roman-urdu/volume1/sections.ts",
    totalPagesConst: "ROMAN_URDU_VOLUME1_TOTAL_PAGES",
  },
];

const ARABIC_INDIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const WESTERN_DIGITS = "0123456789";

function normalizeDigits(value) {
  return value.replace(/[۰-۹]/g, (char) => {
    const index = ARABIC_INDIC_DIGITS.indexOf(char);
    return index >= 0 ? String(index) : char;
  });
}

function parseSections(sectionsSource) {
  const sections = [];
  const blockPattern =
    /id:\s*"([^"]+)"[\s\S]*?title:\s*"((?:\\.|[^"\\])*)"[\s\S]*?startPage:\s*(\d+)[\s\S]*?endPage:\s*(\d+)/g;

  let match = blockPattern.exec(sectionsSource);
  while (match) {
    sections.push({
      id: match[1],
      title: match[2].replace(/\\"/g, '"'),
      startPage: Number(match[3]),
      endPage: Number(match[4]),
    });
    match = blockPattern.exec(sectionsSource);
  }

  return sections;
}

function getFrontMatterEndPage(sections) {
  const first = sections[0];
  if (!first) {
    return 0;
  }

  const isFrontMatterSection =
    /front|intro|muqaddima|publisher/i.test(first.id) ||
    /front|intro|muqaddima|publisher|فہرست/i.test(first.title);

  if (isFrontMatterSection || first.startPage === 1) {
    return first.endPage;
  }

  return 0;
}

function extractPrintedPageNumber(textItems, pageHeight) {
  const footerThreshold = pageHeight * 0.12;
  const candidates = textItems
    .map((item) => ({
      str: item.str.trim(),
      x: item.transform[4],
      y: item.transform[5],
    }))
    .filter((item) => item.str.length > 0 && item.y <= footerThreshold)
    .sort((a, b) => a.y - b.y || b.x - a.x);

  for (const item of candidates) {
    const normalized = normalizeDigits(item.str);
    if (/^\d{1,4}$/.test(normalized)) {
      return normalized;
    }
  }

  return undefined;
}

async function extractVolumeMeta(volumeConfig) {
  const pdfPath = path.join(ROOT, "assets/pdf", volumeConfig.pdfFile);
  const sectionsSource = fs.readFileSync(
    path.join(ROOT, volumeConfig.sectionsFile),
    "utf8",
  );
  const sections = parseSections(sectionsSource);
  const totalPagesMatch = sectionsSource.match(
    new RegExp(`${volumeConfig.totalPagesConst}\\s*=\\s*(\\d+)`),
  );
  const totalPages = totalPagesMatch
    ? Number(totalPagesMatch[1])
    : sections.at(-1)?.endPage ?? 0;
  const frontMatterEndPage = getFrontMatterEndPage(sections);
  const bodyPageCount = totalPages - frontMatterEndPage;

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  if (doc.numPages !== totalPages) {
    console.warn(
      `Warning: ${volumeConfig.languageId}/${volumeConfig.volumeId} PDF pages (${doc.numPages}) != totalPages (${totalPages})`,
    );
  }

  const pages = [];

  for (let pdfPage = 1; pdfPage <= doc.numPages; pdfPage += 1) {
    const page = await doc.getPage(pdfPage);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const printedLabel = extractPrintedPageNumber(
      content.items,
      viewport.height,
    );

    if (pdfPage <= frontMatterEndPage) {
      pages.push({
        pdfPage,
        region: "front-matter",
        displayIndex: pdfPage,
        printedLabel,
      });
      continue;
    }

    const displayIndex = pdfPage - frontMatterEndPage;
    pages.push({
      pdfPage,
      region: "body",
      displayIndex,
      printedLabel: printedLabel ?? String(displayIndex),
    });
  }

  const toc = sections.map((section) => ({
    id: section.id,
    title: section.title,
    pdfPage: section.startPage,
    depth: 0,
  }));

  return {
    frontMatterPageCount: frontMatterEndPage,
    bodyPageCount,
    totalPages,
    pages,
    toc,
  };
}

function serializePageMeta(meta) {
  return `import type { VolumePageMeta } from "../../../types";

export const PAGE_META: VolumePageMeta = ${JSON.stringify(
    {
      frontMatterPageCount: meta.frontMatterPageCount,
      bodyPageCount: meta.bodyPageCount,
      totalPages: meta.totalPages,
      pages: meta.pages,
    },
    null,
    2,
  )};
`;
}

function serializeToc(toc) {
  return `import type { TocEntry } from "../../../types";

export const VOLUME_TOC: TocEntry[] = ${JSON.stringify(toc, null, 2)};
`;
}

async function main() {
  for (const volume of VOLUMES) {
    console.log(`Extracting ${volume.languageId}/${volume.volumeId}...`);
    const meta = await extractVolumeMeta(volume);
    const outputDir = path.join(
      ROOT,
      "data/languages",
      volume.languageId,
      volume.volumeId,
    );
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(
      path.join(outputDir, "page-meta.ts"),
      serializePageMeta(meta),
    );
    fs.writeFileSync(path.join(outputDir, "toc.ts"), serializeToc(meta.toc));
    console.log(
      `  front matter: ${meta.frontMatterPageCount}, body pages: ${meta.bodyPageCount}, toc entries: ${meta.toc.length}`,
    );
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
