/**
 * POST /api/upload
 * Uploads a PDF, parses it, chunks it, and stores everything in KV + Blob.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parsePdf } from "@/lib/pdf-parser";
import { chunkSections } from "@/lib/rag";
import { savePaper, saveChunks } from "@/lib/store";
import type { Paper } from "@/lib/types";

export const maxDuration = 60; // Vercel Pro: 60s; Hobby: 10s

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 50MB." }, { status: 400 });
    }

    const paperId = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse the PDF
    const parsed = await parsePdf(buffer);

    // Upload PDF to Vercel Blob (or store URL as placeholder for local dev)
    let blobUrl = "";
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`papers/${paperId}/${file.name}`, buffer, {
        access: "public",
        contentType: "application/pdf",
      });
      blobUrl = blob.url;
    } else {
      // Local dev fallback — store filename only
      blobUrl = `/local/${paperId}/${file.name}`;
    }

    // Build chunks and save them
    const chunks = chunkSections(paperId, parsed.sections);
    await saveChunks(paperId, chunks);

    // Build and save paper record
    const paper: Paper = {
      id: paperId,
      title: parsed.title,
      abstract: parsed.abstract,
      authors: parsed.authors,
      filename: file.name,
      blobUrl,
      totalPages: parsed.totalPages,
      totalSections: parsed.sections.length,
      uploadedAt: new Date().toISOString(),
      status: "ready",
      references: parsed.references,
    };

    await savePaper(paper);

    return NextResponse.json(paper, { status: 201 });
  } catch (err) {
    console.error("[upload] Error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Upload failed." },
      { status: 500 }
    );
  }
}
