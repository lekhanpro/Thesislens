/**
 * GET /api/analysis/[id]/[type]
 * type = summary | glossary | viva | related_work
 * ?regenerate=true to force refresh
 */

import { NextRequest, NextResponse } from "next/server";
import { getPaper, getAnalysis, saveAnalysis } from "@/lib/store";
import { groqJson } from "@/lib/groq";
import {
  summaryPrompt,
  glossaryPrompt,
  vivaPrompt,
  relatedWorkPrompt,
  buildPaperContext,
} from "@/lib/prompts";
import type { AnalysisType } from "@/lib/types";

export const maxDuration = 60;

const VALID_TYPES = new Set(["summary", "glossary", "viva", "related_work"]);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; type: string } }
) {
  const { id, type } = params;
  const regenerate = req.nextUrl.searchParams.get("regenerate") === "true";

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      { error: `Invalid analysis type. Must be one of: ${Array.from(VALID_TYPES).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const paper = await getPaper(id);
    if (!paper) {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }

    // Return cached result if available
    if (!regenerate) {
      const cached = await getAnalysis(id, type as AnalysisType);
      if (cached) {
        return NextResponse.json({ paperId: id, type, data: cached });
      }
    }

    // Build paper context using stored paper data (title + abstract)
    const ctx = buildPaperContext(paper.title, paper.abstract, [], 4000);

    let data: unknown;

    switch (type) {
      case "summary":
        data = await groqJson(summaryPrompt(ctx), 2048, 0.3);
        break;

      case "glossary":
        data = await groqJson(glossaryPrompt(ctx), 3000, 0.2);
        break;

      case "viva":
        data = await groqJson(vivaPrompt(ctx), 4096, 0.4);
        break;

      case "related_work": {
        const refsText = paper.references
          .map((r) => `[${r.index}] ${r.text}`)
          .join("\n")
          .slice(0, 3000);
        data = await groqJson(relatedWorkPrompt(ctx, refsText), 3000, 0.3);
        break;
      }
    }

    await saveAnalysis(id, type as AnalysisType, data);
    return NextResponse.json({ paperId: id, type, data });
  } catch (err) {
    console.error(`[analysis/${type}] Error:`, err);
    return NextResponse.json(
      { error: (err as Error).message || "Analysis generation failed." },
      { status: 500 }
    );
  }
}
