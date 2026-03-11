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
      const isBlobConfigured = typeof window !== "undefined"; // always true client-side

      // ── Phase 1: Try Vercel Blob client upload (bypasses 4.5MB limit) ──
      if (isBlobConfigured) {
        try {
          // Check if server supports blob upload
          const { upload } = await import("@vercel/blob/client");
          const blob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/upload/blob",
          });

          // ── Phase 2: Process the uploaded PDF ──
          const paper = await apiFetch<Paper>("/api/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blobUrl: blob.url,
              filename: file.name,
            }),
          });
          return paper;
        } catch (blobErr: any) {
          // If blob upload fails (e.g. no BLOB_READ_WRITE_TOKEN), fall through to local path
          console.warn("[upload] Blob upload failed, trying local path:", blobErr.message);
        }
      }

      // ── Fallback: base64 encode and send to /api/process (for local dev) ──
      const arrayBuf = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuf).reduce((acc, byte) => acc + String.fromCharCode(byte), "")
      );
      return apiFetch<Paper>("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localData: base64,
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
