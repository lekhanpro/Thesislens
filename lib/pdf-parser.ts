/**
 * PDF Parser — extracts structured text from PDF buffers using pdf-parse.
 * Server-side only. Returns title, abstract, authors, sections, references.
 */

// pdf-parse needs to be dynamically imported to avoid Next.js edge runtime issues
import type { Section, Reference } from "@/lib/types";

interface ParsedPdf {
  title: string;
  abstract: string;
  authors: string;
  sections: Section[];
  references: Reference[];
  totalPages: number;
  fullText: string;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  // Dynamic import so Next.js doesn't try to bundle it for the edge
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);

  const fullText: string = data.text || "";
  const totalPages: number = data.numpages || 0;

  const pageTexts = splitIntoPages(fullText, totalPages);

  const title = extractTitle(pageTexts);
  const authors = extractAuthors(pageTexts);
  const abstract = extractAbstract(fullText);
  const sections = extractSections(fullText);
  const references = extractReferences(fullText);

  return { title, abstract, authors, sections, references, totalPages, fullText };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function splitIntoPages(text: string, totalPages: number): string[] {
  // pdf-parse doesn't give page-by-page, so we approximate
  if (totalPages <= 1) return [text];
  const chunkSize = Math.ceil(text.length / totalPages);
  const pages: string[] = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(text.slice(i * chunkSize, (i + 1) * chunkSize));
  }
  return pages;
}

function extractTitle(pageTexts: string[]): string {
  const firstPage = pageTexts[0] || "";
  const lines = firstPage
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const titleLines: string[] = [];
  for (const line of lines.slice(0, 6)) {
    if (/abstract|@|university|department|institute|introduction/i.test(line)) break;
    if (line.length >= 8) {
      titleLines.push(line);
      if (titleLines.length >= 2) break;
    }
  }
  return titleLines.join(" ").trim() || "Untitled Paper";
}

function extractAuthors(pageTexts: string[]): string {
  const firstPage = pageTexts[0] || "";
  const lines = firstPage
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const authorLines: string[] = [];
  let passedTitle = false;

  for (const line of lines.slice(0, 15)) {
    if (/^abstract/i.test(line)) break;
    if (!passedTitle && line.length > 20) { passedTitle = true; continue; }
    if (!passedTitle) continue;
    if (/abstract|introduction|keywords/i.test(line)) break;
    if (line.length > 3) {
      authorLines.push(line);
      if (authorLines.length >= 3) break;
    }
  }
  return authorLines.join(", ").trim() || "Unknown Authors";
}

function extractAbstract(text: string): string {
  const patterns = [
    /abstract[\s\S]{0,5}\n([\s\S]{100,3000}?)(?=\n\s*(?:1[.\s]|i[.\s]|introduction|keywords|index terms))/i,
    /abstract[:\-—]?\s*([\s\S]{100,3000}?)(?=\n\n)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\s+/g, " ").trim().slice(0, 3000);
    }
  }

  // Fallback: first big paragraph
  const paras = text.split(/\n\n+/);
  for (const para of paras.slice(1, 5)) {
    if (para.trim().length > 150) {
      return para.replace(/\s+/g, " ").trim().slice(0, 3000);
    }
  }
  return "";
}

function extractSections(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let currentHeading = "Introduction";
  let currentContent: string[] = [];

  const headingRe = /^(\d+\.?\d*\.?\s+[A-Z][^\n]{2,80}|[IVX]+\.\s+[A-Z][^\n]{2,80}|[A-Z][A-Z\s]{4,60})$/;

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) { currentContent.push(""); continue; }

    if (headingRe.test(stripped)) {
      const body = currentContent.join("\n").trim();
      if (body.length > 20) {
        sections.push({ heading: currentHeading, content: body, pageNumbers: [] });
      }
      currentHeading = stripped;
      currentContent = [];
    } else {
      currentContent.push(stripped);
    }
  }

  const lastBody = currentContent.join("\n").trim();
  if (lastBody.length > 20) {
    sections.push({ heading: currentHeading, content: lastBody, pageNumbers: [] });
  }

  if (sections.length === 0) {
    sections.push({ heading: "Full Text", content: text.slice(0, 50000), pageNumbers: [] });
  }

  return sections;
}

function extractReferences(text: string): Reference[] {
  const refStart = text.search(/\n(?:references|bibliography|works cited)\s*\n/i);
  if (refStart === -1) return [];

  const refText = text.slice(refStart).slice(0, 8000);

  // [1] style
  const numbered = Array.from(refText.matchAll(/\[(\d+)\]\s+(.+?)(?=\[\d+\]|\n\n|\Z)/gs));
  if (numbered.length > 0) {
    return numbered.slice(0, 80).map((m) => ({
      index: parseInt(m[1]),
      text: m[2].replace(/\s+/g, " ").trim().slice(0, 500),
    }));
  }

  // Line-based fallback
  const refs: Reference[] = [];
  let idx = 1;
  for (const line of refText.split("\n").filter((l) => l.trim().length > 20)) {
    refs.push({ index: idx++, text: line.trim().slice(0, 500) });
    if (refs.length >= 80) break;
  }
  return refs;
}
