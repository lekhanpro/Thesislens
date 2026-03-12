/**
 * POST /api/chat/[id] — Stateless RAG chat with a paper.
 * Client sends pre-retrieved top-k chunks + the question.
 * Groq generates the answer. No database needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { groqJson, groqText } from "@/lib/groq";
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
          "I couldn't find relevant information in this paper to answer your question. " +
          "Try rephrasing or asking about a specific section.",
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

    // Try JSON response first, fall back to text
    let result: ChatResponse;
    try {
      result = await groqJson<ChatResponse>(prompt, 2048, 0.2);
      // Validate we got an answer
      if (!result?.answer) {
        throw new Error("No answer field in response");
      }
    } catch (jsonErr) {
      console.warn("[chat] JSON parse failed, falling back to text:", jsonErr);
      // Fallback: plain text response
      const textAnswer = await groqText(
        "You are a helpful academic research assistant. Answer the user's question based on the provided paper context. Be clear and concise.",
        `Context from paper:\n${context}\n\nQuestion: ${message}`,
        1024,
        0.3
      );
      result = {
        answer: textAnswer || "I was unable to generate a response. Please try again.",
        citations: [],
        confidence: "medium",
      };
    }

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
