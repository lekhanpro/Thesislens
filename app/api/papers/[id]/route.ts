/**
 * GET /api/papers/[id]     — get single paper
 * DELETE /api/papers/[id]  — delete paper
 */

import { NextRequest, NextResponse } from "next/server";
import { getPaper, deletePaper } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paper = await getPaper(params.id);
    if (!paper) {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }
    return NextResponse.json(paper);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch paper." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paper = await getPaper(params.id);
    if (!paper) {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }

    // Delete from Blob if configured
    if (process.env.BLOB_READ_WRITE_TOKEN && paper.blobUrl.startsWith("http")) {
      try {
        const { del } = await import("@vercel/blob");
        await del(paper.blobUrl);
      } catch {
        // Non-fatal — continue with KV deletion
      }
    }

    await deletePaper(params.id);
    return NextResponse.json({ message: "Paper deleted.", id: params.id });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete paper." }, { status: 500 });
  }
}
