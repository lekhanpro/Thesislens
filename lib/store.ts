/**
 * Vercel KV store wrapper for ThesisLens.
 * All metadata, chunks, chat history, and cached analysis live here.
 *
 * Priority:
 *  1. Vercel KV (if KV_REST_API_URL + KV_REST_API_TOKEN are set)
 *  2. Vercel Blob JSON storage (if BLOB_READ_WRITE_TOKEN is set) — persistent, serverless-safe
 *  3. In-process Map — local dev only (lost on restart, fine for dev)
 */

import type { Paper, Chunk, ChatMessage, AnalysisType } from "@/lib/types";

// ─── Local fallback (dev with no KV or Blob configured) ────────────────────

const LOCAL_STORE = new Map<string, unknown>();

function isKvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ─── Blob-based JSON persistence ───────────────────────────────────────────
// Each "key" becomes a JSON file in Vercel Blob at thesislens-store/<key>.json

const BLOB_PREFIX = "thesislens-store";

async function blobGet<T>(key: string): Promise<T | null> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `${BLOB_PREFIX}/${key}.json` });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function blobSet(key: string, value: unknown): Promise<void> {
  const { put } = await import("@vercel/blob");
  const json = JSON.stringify(value);
  await put(`${BLOB_PREFIX}/${key}.json`, json, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false, // stable URL for overwrite
  });
}

async function blobDel(key: string): Promise<void> {
  try {
    const { list, del } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `${BLOB_PREFIX}/${key}.json` });
    if (blobs.length > 0) {
      await del(blobs.map((b) => b.url));
    }
  } catch {
    // Non-fatal
  }
}

async function blobSmembers(key: string): Promise<string[]> {
  return (await blobGet<string[]>(key)) ?? [];
}

async function blobSadd(key: string, member: string): Promise<void> {
  const existing = await blobSmembers(key);
  if (!existing.includes(member)) {
    existing.push(member);
    await blobSet(key, existing);
  }
}

async function blobSrem(key: string, member: string): Promise<void> {
  const existing = await blobSmembers(key);
  await blobSet(key, existing.filter((m) => m !== member));
}

// ─── Unified KV / Blob / Local wrappers ────────────────────────────────────

async function kvGet<T>(key: string): Promise<T | null> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    return kv.get<T>(key);
  }
  if (isBlobConfigured()) {
    return blobGet<T>(key);
  }
  return (LOCAL_STORE.get(key) as T) ?? null;
}

async function kvSet(key: string, value: unknown, exSeconds?: number): Promise<void> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    if (exSeconds) {
      await kv.set(key, value, { ex: exSeconds });
    } else {
      await kv.set(key, value);
    }
    return;
  }
  if (isBlobConfigured()) {
    await blobSet(key, value);
    return;
  }
  LOCAL_STORE.set(key, value);
}

async function kvDel(key: string): Promise<void> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    await kv.del(key);
    return;
  }
  if (isBlobConfigured()) {
    await blobDel(key);
    return;
  }
  LOCAL_STORE.delete(key);
}

async function kvSmembers(key: string): Promise<string[]> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    return (await kv.smembers(key)) ?? [];
  }
  if (isBlobConfigured()) {
    return blobSmembers(key);
  }
  return (LOCAL_STORE.get(key) as string[]) ?? [];
}

async function kvSadd(key: string, member: string): Promise<void> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    await kv.sadd(key, member);
    return;
  }
  if (isBlobConfigured()) {
    await blobSadd(key, member);
    return;
  }
  const existing = (LOCAL_STORE.get(key) as string[]) ?? [];
  if (!existing.includes(member)) existing.push(member);
  LOCAL_STORE.set(key, existing);
}

async function kvSrem(key: string, member: string): Promise<void> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    await kv.srem(key, member);
    return;
  }
  if (isBlobConfigured()) {
    await blobSrem(key, member);
    return;
  }
  const existing = (LOCAL_STORE.get(key) as string[]) ?? [];
  LOCAL_STORE.set(key, existing.filter((m) => m !== member));
}

// ─── Keys ──────────────────────────────────────────────────────────────────

const keys = {
  paperSet: () => "papers:all",
  paper: (id: string) => `paper:${id}`,
  chunks: (id: string) => `chunks:${id}`,
  chatHistory: (id: string) => `chat:${id}`,
  analysis: (id: string, type: AnalysisType) => `analysis:${id}:${type}`,
};

// ─── Papers ────────────────────────────────────────────────────────────────

export async function savePaper(paper: Paper): Promise<void> {
  await kvSet(keys.paper(paper.id), paper);
  await kvSadd(keys.paperSet(), paper.id);
}

export async function getPaper(id: string): Promise<Paper | null> {
  return kvGet<Paper>(keys.paper(id));
}

export async function getAllPapers(): Promise<Paper[]> {
  const ids = await kvSmembers(keys.paperSet());
  if (!ids.length) return [];
  const papers = await Promise.all(ids.map((id) => getPaper(id)));
  return (papers.filter(Boolean) as Paper[]).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

export async function deletePaper(id: string): Promise<void> {
  await kvDel(keys.paper(id));
  await kvDel(keys.chunks(id));
  await kvDel(keys.chatHistory(id));
  await kvDel(keys.analysis(id, "summary"));
  await kvDel(keys.analysis(id, "glossary"));
  await kvDel(keys.analysis(id, "viva"));
  await kvDel(keys.analysis(id, "related_work"));
  await kvSrem(keys.paperSet(), id);
}

// ─── Chunks ────────────────────────────────────────────────────────────────

export async function saveChunks(paperId: string, chunks: Chunk[]): Promise<void> {
  await kvSet(keys.chunks(paperId), chunks);
}

export async function getChunks(paperId: string): Promise<Chunk[]> {
  return (await kvGet<Chunk[]>(keys.chunks(paperId))) ?? [];
}

// ─── Chat History ──────────────────────────────────────────────────────────

export async function getChatHistory(paperId: string): Promise<ChatMessage[]> {
  return (await kvGet<ChatMessage[]>(keys.chatHistory(paperId))) ?? [];
}

export async function appendChatMessage(paperId: string, msg: ChatMessage): Promise<void> {
  const history = await getChatHistory(paperId);
  history.push({ ...msg, createdAt: new Date().toISOString() });
  // Keep last 100 messages
  await kvSet(keys.chatHistory(paperId), history.slice(-100));
}

export async function clearChatHistory(paperId: string): Promise<void> {
  await kvDel(keys.chatHistory(paperId));
}

// ─── Analysis Cache ────────────────────────────────────────────────────────

export async function getAnalysis<T>(
  paperId: string,
  type: AnalysisType
): Promise<T | null> {
  return kvGet<T>(keys.analysis(paperId, type));
}

export async function saveAnalysis(
  paperId: string,
  type: AnalysisType,
  data: unknown
): Promise<void> {
  // Cache for 7 days (only KV honours TTL; Blob doesn't expire)
  await kvSet(keys.analysis(paperId, type), data, 7 * 24 * 3600);
}
