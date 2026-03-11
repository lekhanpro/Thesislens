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
      const fd = new FormData();
      fd.append("file", file);
      return apiFetch<Paper>("/api/upload", { method: "POST", body: fd });
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
