/**
 * Shared TypeScript types used across the entire ThesisLens application.
 */

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  authors: string;
  filename: string;
  blobUrl: string;
  totalPages: number;
  totalSections: number;
  uploadedAt: string;
  status: "ready" | "processing" | "error";
  references: Reference[];
}

export interface Section {
  heading: string;
  content: string;
  pageNumbers: number[];
}

export interface Reference {
  index: number;
  text: string;
}

export interface Chunk {
  id: string;
  paperId: string;
  section: string;
  text: string;
  pageNumbers: number[];
  embedding: number[];
}

// ─── Analysis ───────────────────────────────────────────────────────────────

export interface SimplifiedSummary {
  overview: string;
  problem_statement: string;
  methodology: string;
  key_contributions: string[];
  limitations: string[];
  practical_implications: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  context: string;
}

export interface VivaQuestion {
  question: string;
  suggested_answer: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface RelatedWorkNotes {
  summary: string;
  themes: string[];
  key_references: { reference: string; relevance: string; relationship: string }[];
  gaps: string;
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export interface Citation {
  section: string;
  excerpt: string;
  page: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  createdAt?: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  confidence: "high" | "medium" | "low";
}

// ─── Compare ────────────────────────────────────────────────────────────────

export interface ComparisonDimension {
  dimension: string;
  paper_1: string;
  paper_2: string;
}

export interface CompareResponse {
  paper_1_title: string;
  paper_2_title: string;
  dimensions: ComparisonDimension[];
  verdict: string;
}

// ─── Analysis cache keys (used in KV) ──────────────────────────────────────

export type AnalysisType = "summary" | "glossary" | "viva" | "related_work";
