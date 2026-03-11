/**
 * POST /api/compare
 * Stateless: client sends both papers' titles + full text from localStorage.
 * Groq compares them and returns the result. No DB needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { groqJson } from "@/lib/groq";
import { comparePrompt } from "@/lib/prompts";
import type { CompareResponse } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { title1, text1, title2, text2, paperId1, paperId2 } = await req.json();

    if (paperId1 && paperId1 === paperId2) {
      return NextResponse.json(
        { error: "Cannot compare a paper with itself." },
        { status: 400 }
      );
    }

    if (!title1 || !title2) {
      return NextResponse.json(
        { error: "Both title1 and title2 are required." },
        { status: 400 }
      );
    }

    const ctx1 = `Title: ${title1}\n\n${(text1 ?? "").slice(0, 6000)}`;
    const ctx2 = `Title: ${title2}\n\n${(text2 ?? "").slice(0, 6000)}`;

    const result = await groqJson<CompareResponse>(
      comparePrompt(title1, ctx1, title2, ctx2),
      4096,
      0.3
    );

    return NextResponse.json({
      paper_1_title: title1,
      paper_2_title: title2,
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
