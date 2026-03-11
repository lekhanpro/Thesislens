/**
 * Vercel KV store wrapper for ThesisLens.
 * All metadata, chunks, chat history, and cached analysis live here.
 * Falls back to an in-process Map for local dev without KV credentials.
 */

import type { Paper, Chunk, ChatMessage, AnalysisType } from "@/lib/types";

// ─── Local fallback (dev with no KV configured) ────────────────────────────

const LOCAL_STORE = new Map<string, unknown>();

function isKvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvGet<T>(key: string): Promise<T | null> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    return kv.get<T>(key);
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
  LOCAL_STORE.set(key, value);
}

async function kvDel(key: string): Promise<void> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    await kv.del(key);
    return;
  }
  LOCAL_STORE.delete(key);
}

async function kvSmembers(key: string): Promise<string[]> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    return (await kv.smembers(key)) ?? [];
  }
  return (LOCAL_STORE.get(key) as string[]) ?? [];
}

async function kvSadd(key: string, member: string): Promise<void> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    await kv.sadd(key, member);
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
  // Cache for 7 days
  await kvSet(keys.analysis(paperId, type), data, 7 * 24 * 3600);
}
