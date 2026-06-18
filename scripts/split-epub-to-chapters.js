const fs = require("fs");
const path = require("path");

const AdmZip = require("adm-zip");
const { XMLParser } = require("fast-xml-parser");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "text",
});

function usage() {
  console.error("Usage: node split-epub-to-chapters.js <input.epub> <output-dir>");
  process.exit(1);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function cleanOutputDir(outputDir) {
  fs.rmSync(outputDir, { recursive: true, force: true });
  ensureDir(outputDir);
}

function readZipText(zip, entryName) {
  const entry = zip.getEntry(entryName);
  if (!entry) {
    throw new Error(`Missing EPUB entry: ${entryName}`);
  }

  return entry.getData().toString("utf8");
}

function getOpfPath(zip) {
  const containerXml = readZipText(zip, "META-INF/container.xml");
  const parsed = parser.parse(containerXml);
  const rootfiles = asArray(parsed.container?.rootfiles?.rootfile);
  const opfPath = rootfiles[0]?.["full-path"];

  if (!opfPath) {
    throw new Error("Could not find OPF path in META-INF/container.xml");
  }

  return opfPath.replace(/\\/g, "/");
}

function resolveRelative(basePath, relativePath) {
  return path.posix.normalize(path.posix.join(path.posix.dirname(basePath), relativePath));
}

function getManifestTitle(pkg) {
  const metadata = pkg?.metadata ?? {};
  const title = metadata["dc:title"] ?? metadata.title;

  if (typeof title === "string") return title;
  if (title?.text) return title.text;
  return undefined;
}

function getChapterTitle(item, index) {
  if (item?.title) return String(item.title);
  if (index === 0 || /cover/i.test(item?.href ?? "")) return "Cover";
  if (index === 1) return "Introduction";
  if (item?.href) {
    const basename = path.posix.basename(item.href, path.posix.extname(item.href));
    return basename.replace(/[-_]+/g, " ").trim() || `Chapter ${index + 1}`;
  }
  return `Chapter ${index + 1}`;
}

function normalizeContentHref(basePath, href) {
  return resolveRelative(basePath, href.split("#")[0]);
}

function decodeXmlEntities(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractFirst(pattern, source) {
  const match = source.match(pattern);
  return match?.[1] ?? "";
}

function getNcxPath(pkg, manifestById, opfPath) {
  const tocId = pkg?.spine?.toc;
  const ncxItem = tocId ? manifestById.get(tocId) : null;
  if (!ncxItem?.href) return null;

  return resolveRelative(opfPath, ncxItem.href);
}

function extractNcxTocEntries(zip, opfPath, pkg, manifestById) {
  const ncxPath = getNcxPath(pkg, manifestById, opfPath);
  if (!ncxPath) return [];

  const ncxXml = readZipText(zip, ncxPath);
  const tokenPattern = /<navPoint\b[^>]*>|<\/navPoint>/gi;
  const stack = [];
  const entries = [];
  let token;

  while ((token = tokenPattern.exec(ncxXml)) != null) {
    if (token[0].startsWith("</")) {
      const opened = stack.pop();
      if (!opened) continue;

      const block = ncxXml.slice(opened.start, tokenPattern.lastIndex);
      const rawLabel = extractFirst(/<navLabel>[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<\/navLabel>/i, block);
      const src = extractFirst(/<content\s+[^>]*src=["']([^"']+)["'][^>]*>/i, block);
      const label = decodeXmlEntities(rawLabel.replace(/<[^>]*>/g, "").trim());

      if (label && src) {
        const href = normalizeContentHref(ncxPath, src);
        entries.push({
          label,
          href,
          src,
          level: opened.level,
          order: opened.start,
        });
      }
    } else {
      stack.push({ start: token.index, level: stack.length });
    }
  }

  return entries.sort((a, b) => a.order - b.order);
}

function buildTocTitleMap(tocEntries) {
  const titleByHref = new Map();

  for (const entry of tocEntries) {
    const { href, label } = entry;
    if (!titleByHref.has(href)) {
      titleByHref.set(href, label);
    }
  }

  return titleByHref;
}

function extractEpub(inputPath, outputDir) {
  const zip = new AdmZip(inputPath);
  const opfPath = getOpfPath(zip);
  const opfXml = readZipText(zip, opfPath);
  const opf = parser.parse(opfXml);
  const pkg = opf.package;
  const manifestItems = asArray(pkg?.manifest?.item);
  const spineItems = asArray(pkg?.spine?.itemref);
  const manifestById = new Map(manifestItems.map((item) => [item.id, item]));
  const rawTocEntries = extractNcxTocEntries(zip, opfPath, pkg, manifestById);
  const tocTitleByHref = buildTocTitleMap(rawTocEntries);

  cleanOutputDir(outputDir);
  zip.extractAllTo(outputDir, true);

  const chapters = spineItems
    .map((spineItem, index) => {
      const item = manifestById.get(spineItem.idref);
      if (!item?.href) return null;

      const href = resolveRelative(opfPath, item.href);
      const mediaType = item["media-type"] ?? "";
      if (!/xhtml|html/i.test(mediaType) && !/\.x?html?$/i.test(href)) {
        return null;
      }

      return {
        id: spineItem.idref ?? item.id ?? `chapter-${index + 1}`,
        title: tocTitleByHref.get(href) ?? getChapterTitle(item, index),
        href,
        startProgressPercent: index / spineItems.length,
        endProgressPercent: (index + 1) / spineItems.length,
      };
    })
    .filter(Boolean);

  if (chapters.length === 0) {
    throw new Error("No XHTML/HTML spine chapters found in EPUB");
  }

  const chapterIndexByHref = new Map(chapters.map((chapter, index) => [chapter.href, index]));
  const toc = rawTocEntries
    .map((entry) => {
      const chapterIndex = chapterIndexByHref.get(entry.href);
      if (chapterIndex == null) return null;

      return {
        label: entry.label,
        href: entry.href,
        src: entry.src,
        level: entry.level,
        chapterIndex,
      };
    })
    .filter(Boolean);

  const manifest = {
    version: 1,
    source: path.basename(inputPath),
    title: getManifestTitle(pkg),
    opfPath,
    generatedAt: new Date().toISOString(),
    chapters,
    toc,
  };

  fs.writeFileSync(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  return manifest;
}

const [inputPath, outputDir] = process.argv.slice(2);
if (!inputPath || !outputDir) usage();

const resolvedInput = path.resolve(inputPath);
const resolvedOutput = path.resolve(outputDir);

if (!fs.existsSync(resolvedInput)) {
  throw new Error(`Input EPUB does not exist: ${resolvedInput}`);
}

const manifest = extractEpub(resolvedInput, resolvedOutput);
console.log(`Wrote ${manifest.chapters.length} chapters to ${resolvedOutput}`);
console.log(`Manifest: ${path.join(resolvedOutput, "manifest.json")}`);
