/**
 * POST /api/compare
 * Compare two papers across 7 dimensions using Groq.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPaper } from "@/lib/store";
import { groqJson } from "@/lib/groq";
import { comparePrompt, buildPaperContext } from "@/lib/prompts";
import type { CompareResponse } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { paperId1, paperId2 } = await req.json();

    if (!paperId1 || !paperId2) {
      return NextResponse.json(
        { error: "Both paperId1 and paperId2 are required." },
        { status: 400 }
      );
    }
    if (paperId1 === paperId2) {
      return NextResponse.json(
        { error: "Cannot compare a paper with itself." },
        { status: 400 }
      );
    }

    const [paper1, paper2] = await Promise.all([
      getPaper(paperId1),
      getPaper(paperId2),
    ]);

    if (!paper1) return NextResponse.json({ error: "Paper 1 not found." }, { status: 404 });
    if (!paper2) return NextResponse.json({ error: "Paper 2 not found." }, { status: 404 });

    const ctx1 = buildPaperContext(paper1.title, paper1.abstract, [], 3000);
    const ctx2 = buildPaperContext(paper2.title, paper2.abstract, [], 3000);

    const result = await groqJson<CompareResponse>(
      comparePrompt(paper1.title, ctx1, paper2.title, ctx2),
      4096,
      0.3
    );

    return NextResponse.json({
      paper_1_title: paper1.title,
      paper_2_title: paper2.title,
      dimensions: result.dimensions ?? [],
      verdict: result.verdict ?? "",
    } satisfies CompareResponse);
  } catch (err) {
    console.error("[compare] Error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Comparison failed." },
      { status: 500 }
    );
  }
}
