/**
 * React Query hooks for all ThesisLens API operations.
 * All hooks call the Next.js API routes — no separate backend needed.
 */

"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  Paper,
  ChatMessage,
  ChatResponse,
  CompareResponse,
  SimplifiedSummary,
  GlossaryTerm,
  VivaQuestion,
  RelatedWorkNotes,
} from "@/lib/types";

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
    queryFn: () => apiFetch<Paper[]>("/api/papers"),
  });
}

export function usePaper(id: string) {
  return useQuery<Paper>({
    queryKey: ["paper", id],
    queryFn: () => apiFetch<Paper>(`/api/papers/${id}`),
    enabled: !!id,
  });
}

export function useUploadPaper() {
  const qc = useQueryClient();
  return useMutation<Paper, Error, File>({
    mutationFn: async (file: File) => {
      // ── Phase 1: Client-Side Text Extraction (Solves 4.5MB & CPU timeouts) ──
      const { text, numPages } = await new Promise<{ text: string; numPages: number }>((resolve, reject) => {
        if ((window as any).pdfjsLib) {
          extract((window as any).pdfjsLib);
        } else {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = () => extract((window as any).pdfjsLib);
          script.onerror = () => reject(new Error("Failed to load PDF engine"));
          document.head.appendChild(script);
        }

        async function extract(pdfjsLib: any) {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({
              data: arrayBuffer,
              cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
              cMapPacked: true,
            }).promise;
            
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const pageText = content.items.map((item: any) => item.str).join(" ");
              fullText += pageText + "\n\n";
            }
            resolve({ text: fullText, numPages: pdf.numPages });
          } catch (err) {
            console.error("PDF extraction error:", err);
            reject(new Error("Failed to read PDF. It might be encrypted or corrupted."));
          }
        }
      });

      // ── Phase 2: Send purely extracted logic to server ──
      // This is blazing fast and never hits Vercel's 4.5MB limit.
      return await apiFetch<Paper>("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientText: text,
          clientTotalPages: numPages,
          filename: file.name,
        }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["papers"] }),
  });
}


export function useDeletePaper() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/papers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["papers"] }),
  });
}

// ─── Analysis ───────────────────────────────────────────────────────────────

function useAnalysis<T>(paperId: string, type: string, enabled = true) {
  return useQuery<{ paperId: string; type: string; data: T }>({
    queryKey: ["analysis", paperId, type],
    queryFn: () =>
      apiFetch<{ paperId: string; type: string; data: T }>(
        `/api/analysis/${paperId}/${type}`
      ),
    enabled: !!paperId && enabled,
    staleTime: 5 * 60 * 1000,   // 5 min
    gcTime: 30 * 60 * 1000,     // 30 min
  });
}

export const useSummary = (id: string) =>
  useAnalysis<SimplifiedSummary>(id, "summary");

export const useGlossary = (id: string) =>
  useAnalysis<GlossaryTerm[]>(id, "glossary");

export const useViva = (id: string) =>
  useAnalysis<VivaQuestion[]>(id, "viva");

export const useRelatedWork = (id: string) =>
  useAnalysis<RelatedWorkNotes>(id, "related_work");

// ─── Chat ───────────────────────────────────────────────────────────────────

export function useChatHistory(paperId: string) {
  return useQuery<{ paperId: string; messages: ChatMessage[] }>({
    queryKey: ["chat-history", paperId],
    queryFn: () =>
      apiFetch<{ paperId: string; messages: ChatMessage[] }>(
        `/api/chat/${paperId}`
      ),
    enabled: !!paperId,
  });
}

export function useSendMessage(paperId: string) {
  return useMutation<
    ChatResponse,
    Error,
    { message: string; chatHistory: ChatMessage[] }
  >({
    mutationFn: ({ message, chatHistory }) =>
      apiFetch<ChatResponse>(`/api/chat/${paperId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, chatHistory }),
      }),
  });
}

// ─── Compare ─────────────────────────────────────────────────────────────────

export function useComparePapers() {
  return useMutation<
    CompareResponse,
    Error,
    { paperId1: string; paperId2: string }
  >({
    mutationFn: (data) =>
      apiFetch<CompareResponse>("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
