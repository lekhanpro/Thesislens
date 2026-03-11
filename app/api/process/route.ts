/**
 * POST /api/process
 * Receives client-extracted PDF text, parses it, chunks it, and returns
 * the full result to the client (which saves it in localStorage).
 * Zero database — completely stateless.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parseExtractedText } from "@/lib/pdf-parser";
import { chunkSections } from "@/lib/rag";
import type { Paper, Chunk } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientText, clientTotalPages, filename } = body as {
      clientText: string;
      clientTotalPages: number;
      filename: string;
    };

    if (!filename?.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    }
    if (!clientText?.trim()) {
      return NextResponse.json({ error: "No text was extracted from the PDF." }, { status: 400 });
    }

    const paperId = uuidv4();

    // Parse structured data from extracted text
    const parsed = parseExtractedText(clientText, Number(clientTotalPages) || 1);

    // Chunk sections for RAG (returned to client, stored in localStorage)
    const chunks: Chunk[] = chunkSections(paperId, parsed.sections);

    // Build paper record (NO database save — client stores this in localStorage)
    const paper: Paper = {
      id: paperId,
      title: parsed.title,
      abstract: parsed.abstract,
      authors: parsed.authors,
      filename,
      blobUrl: `/local/${paperId}/${filename}`,
      totalPages: parsed.totalPages,
      totalSections: parsed.sections.length,
      uploadedAt: new Date().toISOString(),
      status: "ready",
      references: parsed.references,
      fullText: parsed.fullText.slice(0, 100_000), // cap at 100k chars for LS size
    };

    return NextResponse.json({ paper, chunks }, { status: 201 });
  } catch (err) {
    console.error("[process] Error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Processing failed." },
      { status: 500 }
    );
  }
}
