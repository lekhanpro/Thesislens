/**
 * POST /api/process
 * Receives a Vercel Blob URL (or base64 data for local dev),
 * downloads the PDF content, parses it, chunks it, and stores everything.
 *
 * This route is called AFTER the PDF has been uploaded to Vercel Blob.
 * It only receives a small JSON payload (the blob URL), so it never hits
 * the 4.5MB serverless body limit.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parsePdf, parseExtractedText } from "@/lib/pdf-parser";
import { chunkSections } from "@/lib/rag";
import { savePaper, saveChunks } from "@/lib/store";
import type { Paper } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { blobUrl, filename, localData, clientText, clientTotalPages } = body as {
      blobUrl?: string;
      filename: string;
      localData?: string; // base64 for local dev
      clientText?: string; // Client extracted text
      clientTotalPages?: number; // Client extracted page count
    };

    if (!filename?.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    }

    const paperId = uuidv4();
    let parsed: any;
    let actualBlobUrl: string = blobUrl || `/local/${paperId}/${filename}`;

    if (clientText) {
      // Production path for large files: browser already parsed it!
      // No 4.5MB Next.js limits. No serverless 60s CPU timeout!
      console.log(`[process] Using client-extracted text for ${filename} (${clientTotalPages} pages)`);
      parsed = parseExtractedText(clientText, Number(clientTotalPages) || 1);
    } else {
      let buffer: Buffer;

      if (localData) {
        // Local dev fallback 
        buffer = Buffer.from(localData, "base64");
      } else if (blobUrl) {
        // Server-side parsing fallback (if browser couldn't extract text)
        const res = await fetch(blobUrl);
        if (!res.ok) {
          return NextResponse.json(
            { error: `Failed to fetch PDF from blob: ${res.status}` },
            { status: 500 }
          );
        }
        const arrayBuf = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      } else {
        return NextResponse.json(
          { error: "Must provide clientText, blobUrl, or localData." },
          { status: 400 }
        );
      }

      parsed = await parsePdf(buffer);
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
      filename,
      blobUrl: actualBlobUrl,
      totalPages: parsed.totalPages,
      totalSections: parsed.sections.length,
      uploadedAt: new Date().toISOString(),
      status: "ready",
      references: parsed.references,
    };

    await savePaper(paper);

    return NextResponse.json(paper, { status: 201 });
  } catch (err) {
    console.error("[process] Error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Processing failed." },
      { status: 500 }
    );
  }
}
