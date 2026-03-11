/**
 * GET /api/papers        — list all papers
 */

import { NextResponse } from "next/server";
import { getAllPapers } from "@/lib/store";

export async function GET() {
  try {
    const papers = await getAllPapers();
    return NextResponse.json(papers);
  } catch (err) {
    console.error("[papers] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch papers." }, { status: 500 });
  }
}
