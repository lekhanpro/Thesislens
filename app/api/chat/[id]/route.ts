/**
 * POST /api/chat/[id] — Stateless RAG chat with a paper.
 * Client sends pre-retrieved top-k chunks + the question.
 * Groq generates the answer. No database needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { groqJson } from "@/lib/groq";
import { chatPrompt } from "@/lib/prompts";
import type { ChatResponse, ChatMessage } from "@/lib/types";

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params: _params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      message,
      chatHistory = [],
      chunks = [],
    }: {
      message: string;
      chatHistory: ChatMessage[];
      chunks: { section: string; text: string }[];
    } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (chunks.length === 0) {
      return NextResponse.json({
        answer:
          "I couldn't find relevant information in this paper to answer your question. Try rephrasing or asking about a specific section.",
        citations: [],
        confidence: "low",
      } satisfies ChatResponse);
    }

    // Build context from client-provided top-k chunks
    const context = chunks
      .map((c, i) => `[Context ${i + 1} — ${c.section}]\n${c.text}`)
      .join("\n\n");

    const historyStr = chatHistory
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const prompt = chatPrompt(context, historyStr, message);
    const result = await groqJson<ChatResponse>(prompt, 2048, 0.2);

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

// Kept for API compatibility — history is now client-managed (localStorage)
export async function GET() {
  return NextResponse.json({ messages: [] });
}

export async function DELETE() {
  return NextResponse.json({ message: "Chat history cleared." });
}
