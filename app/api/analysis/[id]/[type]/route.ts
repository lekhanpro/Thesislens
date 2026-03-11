/**
 * POST /api/analysis/[id]/[type]
 * type = summary | glossary | viva | related_work
 *
 * Stateless: client sends the paper text/chunks, Groq generates the analysis,
 * result is returned for client to cache in localStorage. No DB needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { groqJson } from "@/lib/groq";
import {
  summaryPrompt,
  glossaryPrompt,
  vivaPrompt,
  relatedWorkPrompt,
} from "@/lib/prompts";
import type { Reference, Chunk } from "@/lib/types";

export const maxDuration = 60;

const VALID_TYPES = new Set(["summary", "glossary", "viva", "related_work"]);
const MAX_TEXT = 12_000; // chars sent to Groq (roughly 3k tokens)

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; type: string } }
) {
  const { id, type } = params;

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      { error: `Invalid analysis type. Must be one of: ${Array.from(VALID_TYPES).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const {
      title = "Untitled",
      abstract = "",
      fullText = "",
      references = [] as Reference[],
      chunks = [] as Pick<Chunk, "section" | "text">[],
    } = body;

    // Build context string for Groq — combine abstract + first portion of full text
    const paperContext =
      `Title: ${title}\n\nAbstract: ${abstract}\n\n` +
      (fullText
        ? fullText.slice(0, MAX_TEXT)
        : chunks.map((c: Pick<Chunk, "section" | "text">) => `[${c.section}]\n${c.text}`).join("\n\n").slice(0, MAX_TEXT));

    let data: unknown;

    switch (type) {
      case "summary":
        data = await groqJson(summaryPrompt(paperContext), 2048, 0.3);
        break;

      case "glossary":
        data = await groqJson(glossaryPrompt(paperContext), 3000, 0.2);
        break;

      case "viva":
        data = await groqJson(vivaPrompt(paperContext), 4096, 0.4);
        break;

      case "related_work": {
        const refsText = (references as Reference[])
          .map((r) => `[${r.index}] ${r.text}`)
          .join("\n")
          .slice(0, 3000);
        data = await groqJson(relatedWorkPrompt(paperContext, refsText), 3000, 0.3);
        break;
      }
    }

    return NextResponse.json({ paperId: id, type, data });
  } catch (err) {
    console.error(`[analysis/${type}] Error:`, err);
    return NextResponse.json(
      { error: (err as Error).message || "Analysis generation failed." },
      { status: 500 }
    );
  }
}
