/**
 * POST /api/chat/[id]      — RAG-powered chat with a paper
 * GET  /api/chat/[id]      — get chat history
 * DELETE /api/chat/[id]    — clear chat history
 */

import { NextRequest, NextResponse } from "next/server";
import { getPaper, getChunks, getChatHistory, appendChatMessage, clearChatHistory } from "@/lib/store";
import { groqJson } from "@/lib/groq";
import { searchChunks } from "@/lib/rag";
import { chatPrompt } from "@/lib/prompts";
import type { ChatResponse, ChatMessage } from "@/lib/types";

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paper = await getPaper(params.id);
    if (!paper) {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }

    const body = await req.json();
    const { message, chatHistory = [] }: { message: string; chatHistory: ChatMessage[] } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Retrieve relevant chunks
    const chunks = await getChunks(params.id);
    const topChunks = searchChunks(chunks, message, 5);

    if (topChunks.length === 0) {
      const fallback: ChatResponse = {
        answer:
          "I couldn't find relevant information in this paper to answer your question. Try rephrasing or asking about a specific section.",
        citations: [],
        confidence: "low",
      };
      await appendChatMessage(params.id, { role: "user", content: message });
      await appendChatMessage(params.id, { role: "assistant", content: fallback.answer, citations: [] });
      return NextResponse.json(fallback);
    }

    // Build context string
    const context = topChunks
      .map((c, i) => `[Context ${i + 1} — ${c.section}]\n${c.text}`)
      .join("\n\n");

    const historyStr = chatHistory
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const prompt = chatPrompt(context, historyStr, message);
    const result = await groqJson<ChatResponse>(prompt, 2048, 0.2);

    // Persist messages to history
    await appendChatMessage(params.id, { role: "user", content: message });
    await appendChatMessage(params.id, {
      role: "assistant",
      content: result.answer,
      citations: result.citations ?? [],
    });

    return NextResponse.json({
      answer: result.answer,
      citations: result.citations ?? [],
      confidence: result.confidence ?? "medium",
    } satisfies ChatResponse);
  } catch (err) {
    console.error("[chat] POST error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Chat failed." },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const history = await getChatHistory(params.id);
    return NextResponse.json({ paperId: params.id, messages: history });
  } catch {
    return NextResponse.json({ error: "Failed to fetch chat history." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await clearChatHistory(params.id);
    return NextResponse.json({ message: "Chat history cleared." });
  } catch {
    return NextResponse.json({ error: "Failed to clear chat history." }, { status: 500 });
  }
}
