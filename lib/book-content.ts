import type { SQLiteDatabase } from "expo-sqlite";
import type { Section, Volume } from "../data/types";

export type BookChapter = {
  id: number;
  title: string;
  html: string;
  startProgressPercent: number;
  endProgressPercent: number;
};

type BookRecord = { id: number };
type SectionRecord = { id: number; section_no: number; title: string };
type BlockRecord = {
  section_id: number;
  sequence_no: number;
  block_type: string;
  text: string;
  content_format: string;
};

const BOOK_SLUGS: Record<string, Record<string, string>> = {
  english: { volume1: "shifa-shareef-english" },
  "roman-urdu": { volume1: "shifa-shareef-roman-urdu" },
  urdu: {
    volume1: "shifa-shareef-urdu-vol-1",
    volume2: "shifa-shareef-urdu-vol-2",
  },
};

function getBookSlug(languageId: string, volumeId: string): string | undefined {
  return BOOK_SLUGS[languageId]?.[volumeId];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownInline(value: string): string {
  let html = escapeHtml(value);
  html = html
    .replace(/&lt;(\/?)sup&gt;/gi, "<$1sup>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
  return html;
}

function renderBlock(block: BlockRecord): string {
  if (block.content_format === "html") return block.text;

  const text = block.text.trim();
  if (!text) return "";
  const heading = text.match(/^(#{1,6})\s+(.+)$/);
  if (heading) {
    const level = Math.min(4, heading[1].length + 1);
    return `<h${level}>${markdownInline(heading[2])}</h${level}>`;
  }
  return `<p>${markdownInline(text).replace(/\n/g, "<br>")}</p>`;
}

export async function loadBookChapters(
  database: SQLiteDatabase,
  languageId: string,
  volumeId: string,
): Promise<BookChapter[]> {
  const bookSlug = getBookSlug(languageId, volumeId);
  if (!bookSlug) return [];

  const book = await database.getFirstAsync<BookRecord>(
    "SELECT id FROM book WHERE slug = ?",
    bookSlug,
  );
  if (!book) return [];

  const sections = await database.getAllAsync<SectionRecord>(
    "SELECT id, section_no, title FROM section WHERE book_id = ? ORDER BY section_no",
    book.id,
  );
  if (sections.length === 0) return [];

  const blocks = await database.getAllAsync<BlockRecord>(
    `SELECT b.section_id, b.sequence_no, b.block_type, b.text, b.content_format
     FROM block b JOIN section s ON s.id = b.section_id
     WHERE s.book_id = ? ORDER BY s.section_no, b.sequence_no`,
    book.id,
  );
  const blocksBySection = new Map<number, BlockRecord[]>();
  for (const block of blocks) {
    const sectionBlocks = blocksBySection.get(block.section_id) ?? [];
    sectionBlocks.push(block);
    blocksBySection.set(block.section_id, sectionBlocks);
  }

  const count = sections.length;
  return sections.map((section, index) => {
    const title = section.title.replace(/^\d{2}\s+/, "");
    const renderedBlocks = (blocksBySection.get(section.id) ?? [])
      .map(renderBlock)
      .join("\n");
    return {
      id: section.id,
      title,
      html: `<h2>${escapeHtml(title)}</h2>${renderedBlocks}`,
      startProgressPercent: index / count,
      endProgressPercent: (index + 1) / count,
    };
  });
}

export async function loadBookSections(
  database: SQLiteDatabase,
  languageId: string,
  volume: Volume,
): Promise<Section[]> {
  const bookSlug = getBookSlug(languageId, volume.id);
  if (!bookSlug) return [];
  const book = await database.getFirstAsync<BookRecord>(
    "SELECT id FROM book WHERE slug = ?",
    bookSlug,
  );
  if (!book) return [];

  const sections = await database.getAllAsync<SectionRecord>(
    "SELECT id, section_no, title FROM section WHERE book_id = ? ORDER BY section_no",
    book.id,
  );
  const count = sections.length;
  return sections.map((section, index) => {
    const startProgressPercent = index / count;
    const endProgressPercent = (index + 1) / count;
    return {
      id: String(section.id),
      title: section.title.replace(/^\d{2}\s+/, ""),
      startPage: Math.floor(startProgressPercent * volume.totalPages) + 1,
      endPage: Math.max(
        Math.floor(startProgressPercent * volume.totalPages) + 1,
        Math.floor(endProgressPercent * volume.totalPages),
      ),
      estimatedMinutes: 30,
      description: "",
      startProgressPercent,
      endProgressPercent,
    };
  });
}
