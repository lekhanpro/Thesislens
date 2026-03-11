/**
 * Pure-JS RAG engine using TF-IDF-style scoring + cosine similarity.
 * No external vector DB or Python needed — runs entirely in Node.js.
 * Chunks are stored in Vercel KV and scored at query time.
 */

import type { Chunk, Section } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const CHUNK_WORDS = 400;
const OVERLAP_WORDS = 60;

// ─── Chunking ──────────────────────────────────────────────────────────────

export function chunkSections(paperId: string, sections: Section[]): Chunk[] {
  const chunks: Chunk[] = [];

  for (const section of sections) {
    const words = section.content.split(/\s+/);
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + CHUNK_WORDS, words.length);
      const text = `[Section: ${section.heading}]\n${words.slice(start, end).join(" ")}`;

      chunks.push({
        id: uuidv4(),
        paperId,
        section: section.heading,
        text,
        pageNumbers: section.pageNumbers,
        embedding: computeTfIdfVector(text),
      });

      if (end === words.length) break;
      start = end - OVERLAP_WORDS;
    }
  }

  return chunks;
}

// ─── TF-IDF lightweight vector ─────────────────────────────────────────────

const STOPWORDS = new Set([
  "a","an","the","in","on","at","to","for","of","with","by","from","is","are",
  "was","were","be","been","being","have","has","had","do","does","did","will",
  "would","could","should","may","might","shall","and","or","but","not","this",
  "that","these","those","as","it","its","we","our","they","their","i","my",
  "he","she","his","her","you","your","us","them","than","then","when","where",
  "which","who","how","what","more","also","can","into","if","so","up","about",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .filter((v, i, a) => a.indexOf(v) !== -1);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const total = tokens.length || 1;
  for (const [k, v] of tf) tf.set(k, v / total);
  return tf;
}

/**
 * Create a sparse TF-IDF-inspired vector for a text.
 * Returns a flat array where each value corresponds to a term weight.
 * We encode this as an object internally and convert for cosine sim.
 */
function computeTfIdfVector(text: string): number[] {
  // We store as a sparse representation encoded into the chunk object.
  // For comparison we use the sparse map approach in cosineSimilarity.
  // This returns a placeholder; actual similarity uses the map.
  const tokens = tokenize(text);
  // Encode as a deterministic float array via hashing for storage
  const tf = termFrequency(tokens);
  const entries = [...tf.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  // Pack into a flat number array: [hash, weight, hash, weight, ...]
  const vec: number[] = [];
  for (const [term, weight] of entries) {
    vec.push(simpleHash(term), weight);
  }
  return vec;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 1_000_000;
}

// ─── Retrieval ─────────────────────────────────────────────────────────────

/**
 * Score chunks against a query using BM25-inspired term matching.
 * Fast, no external dependencies, works in serverless.
 */
export function searchChunks(chunks: Chunk[], query: string, topK = 5): Chunk[] {
  const queryTokensArr = tokenize(query);

  const scored = chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.text);
    const chunkTokenSet = new Set(chunkTokens);
    const total = chunkTokens.length || 1;

    // Count query term hits, weighted by frequency
    let score = 0;
    for (const qt of queryTokensArr) {
      if (chunkTokenSet.has(qt)) {
        const freq = chunkTokens.filter((t) => t === qt).length;
        // BM25-inspired: tf * idf-proxy
        const tf = freq / total;
        const boost = qt.length > 5 ? 2.0 : 1.0;
        score += tf * boost;
      }
    }

    // Small bonus for section name matching query
    for (const qt of queryTokensArr) {
      if (chunk.section.toLowerCase().includes(qt)) score += 0.05;
    }

    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.chunk);
}
