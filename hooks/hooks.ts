/**
 * React Query hooks for all ThesisLens API operations.
 * 
 * STORAGE STRATEGY: Zero database — everything lives in localStorage.
 *   - Papers & chunks saved locally after upload.
 *   - All AI API routes are stateless: client sends the text/chunks each request.
 *   - Works reliably on Vercel with no KV or Blob required.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { searchChunks } from "@/lib/rag";
import type {
  Paper,
  Chunk,
  ChatMessage,
  ChatResponse,
  CompareResponse,
  SimplifiedSummary,
  GlossaryTerm,
  VivaQuestion,
  RelatedWorkNotes,
} from "@/lib/types";

// ─── LocalStorage Keys ───────────────────────────────────────────────────────

const LS_PAPERS_KEY = "thesislens_papers";
const lsChunksKey = (id: string) => `thesislens_chunks_${id}`;
const lsAnalysisKey = (id: string, type: string) => `thesislens_analysis_${id}_${type}`;

// ─── LocalStorage helpers (safe: works SSR + handles parse errors) ───────────

function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage.setItem failed:", e);
  }
}

function lsDel(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Papers ─────────────────────────────────────────────────────────────────

export function usePapers() {
  return useQuery<Paper[]>({
    queryKey: ["papers"],
    queryFn: () => {
      const papers = lsGet<Paper[]>(LS_PAPERS_KEY) ?? [];
      return Promise.resolve(papers.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      ));
    },
    staleTime: 0,
  });
}

export function usePaper(id: string) {
  return useQuery<Paper>({
    queryKey: ["paper", id],
    queryFn: () => {
      const papers = lsGet<Paper[]>(LS_PAPERS_KEY) ?? [];
      const paper = papers.find((p) => p.id === id);
      if (!paper) throw new Error("Paper not found.");
      return Promise.resolve(paper);
    },
    enabled: !!id,
    retry: false,
  });
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export function useUploadPaper() {
  const qc = useQueryClient();

  return useMutation<Paper, Error, File>({
    mutationFn: async (file: File) => {
      const MAX_MB = 10;
      if (file.size > MAX_MB * 1024 * 1024) {
        throw new Error(`File too large. Maximum size is ${MAX_MB} MB.`);
      }

      // ── Phase 1: Client-Side Text Extraction with PDF.js ──────────────────
      const { text, numPages } = await new Promise<{ text: string; numPages: number }>(
        (resolve, reject) => {
          const doExtract = (lib: any) => {
            lib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

            file.arrayBuffer().then((buf) => {
              lib.getDocument({
                data: buf,
                cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
                cMapPacked: true,
              }).promise.then(async (pdf: any) => {
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                  const page = await pdf.getPage(i);
                  const content = await page.getTextContent();
                  fullText += content.items.map((item: any) => item.str).join(" ") + "\n\n";
                }
                // Strip BOM and other problematic chars
                fullText = fullText.replace(/[\uFEFF\u200B-\u200D\uFFFF]/g, "");
                resolve({ text: fullText, numPages: pdf.numPages });
              }).catch((err: any) => reject(new Error(err?.message ?? "PDF parse failed")));
            }).catch(reject);
          };

          const w = window as any;
          if (w.pdfjsLib) {
            doExtract(w.pdfjsLib);
          } else {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            s.onload = () => doExtract(w.pdfjsLib);
            s.onerror = () => reject(new Error("Failed to load PDF engine. Check your internet connection."));
            document.head.appendChild(s);
          }
        }
      );

      if (!text.trim()) {
        throw new Error("Could not extract text from this PDF. It may be scanned/image-only.");
      }

      // ── Phase 2: Server processes text → Groq extracts metadata + chunks ──
      const result = await apiFetch<{ paper: Paper; chunks: Chunk[] }>("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientText: text,
          clientTotalPages: numPages,
          filename: file.name,
        }),
      });

      // ── Phase 3: Save paper + chunks in localStorage (zero database) ───────
      const existing = lsGet<Paper[]>(LS_PAPERS_KEY) ?? [];
      const updated = [result.paper, ...existing.filter((p) => p.id !== result.paper.id)];
      lsSet(LS_PAPERS_KEY, updated);
      lsSet(lsChunksKey(result.paper.id), result.chunks);

      return result.paper;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["papers"] }),
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export function useDeletePaper() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const papers = lsGet<Paper[]>(LS_PAPERS_KEY) ?? [];
      lsSet(LS_PAPERS_KEY, papers.filter((p) => p.id !== id));
      lsDel(lsChunksKey(id));
      // Clear cached analyses
      ["summary", "glossary", "viva", "related_work"].forEach((t) =>
        lsDel(lsAnalysisKey(id, t))
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["papers"] }),
  });
}

// ─── Analysis (Summary / Glossary / Viva / Related Work) ─────────────────────
// Client sends the paper's fullText directly to Groq — no server DB needed.

function useAnalysisStateless<T>(paperId: string, type: string, enabled = true) {
  return useQuery<{ paperId: string; type: string; data: T }>({
    queryKey: ["analysis", paperId, type],
    queryFn: async () => {
      // Check localStorage cache first
      const cached = lsGet<T>(lsAnalysisKey(paperId, type));
      if (cached) return { paperId, type, data: cached };

      // Get paper from localStorage
      const papers = lsGet<Paper[]>(LS_PAPERS_KEY) ?? [];
      const paper = papers.find((p) => p.id === paperId);
      if (!paper) throw new Error("Paper not found in local storage.");

      const chunks = lsGet<Chunk[]>(lsChunksKey(paperId)) ?? [];

      // Call stateless API — send text context, get AI result back
      const result = await apiFetch<{ paperId: string; type: string; data: T }>(
        `/api/analysis/${paperId}/${type}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: paper.title,
            abstract: paper.abstract,
            fullText: paper.fullText ?? "",
            references: paper.references ?? [],
            chunks: chunks.slice(0, 30).map((c) => ({ section: c.section, text: c.text })),
          }),
        }
      );

      // Cache in localStorage
      lsSet(lsAnalysisKey(paperId, type), result.data);
      return result;
    },
    enabled: !!paperId && enabled,
    staleTime: 30 * 60 * 1000, // 30 min
    gcTime: 60 * 60 * 1000,    // 1 hr
    retry: 1,
  });
}

export const useSummary = (id: string) =>
  useAnalysisStateless<SimplifiedSummary>(id, "summary");

export const useGlossary = (id: string) =>
  useAnalysisStateless<GlossaryTerm[]>(id, "glossary");

export const useViva = (id: string) =>
  useAnalysisStateless<VivaQuestion[]>(id, "viva");

export const useRelatedWork = (id: string) =>
  useAnalysisStateless<RelatedWorkNotes>(id, "related_work");

// ─── Chat ───────────────────────────────────────────────────────────────────
// Client does BM25 retrieval locally, sends top-5 chunks + question to Groq.

export function useSendMessage(paperId: string) {
  return useMutation<
    ChatResponse,
    Error,
    { message: string; chatHistory: ChatMessage[] }
  >({
    mutationFn: async ({ message, chatHistory }) => {
      const allChunks = lsGet<Chunk[]>(lsChunksKey(paperId)) ?? [];
      const topChunks = searchChunks(allChunks, message, 5);

      return apiFetch<ChatResponse>(`/api/chat/${paperId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          chatHistory,
          chunks: topChunks.map((c) => ({ section: c.section, text: c.text })),
        }),
      });
    },
  });
}

// useChatHistory is unused in the new stateless arch, but kept for API compat
export function useChatHistory(paperId: string) {
  return useQuery({
    queryKey: ["chat-history", paperId],
    queryFn: () => Promise.resolve({ paperId, messages: [] as ChatMessage[] }),
    enabled: false,
  });
}

// ─── Compare ─────────────────────────────────────────────────────────────────
// Client sends both papers' text from localStorage.

export function useComparePapers() {
  return useMutation<
    CompareResponse,
    Error,
    { paperId1: string; paperId2: string }
  >({
    mutationFn: async ({ paperId1, paperId2 }) => {
      const papers = lsGet<Paper[]>(LS_PAPERS_KEY) ?? [];
      const p1 = papers.find((p) => p.id === paperId1);
      const p2 = papers.find((p) => p.id === paperId2);
      if (!p1 || !p2) throw new Error("One or both papers not found in local storage.");

      return apiFetch<CompareResponse>("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title1: p1.title,
          text1: (p1.fullText ?? p1.abstract).slice(0, 8000),
          title2: p2.title,
          text2: (p2.fullText ?? p2.abstract).slice(0, 8000),
        }),
      });
    },
  });
}
