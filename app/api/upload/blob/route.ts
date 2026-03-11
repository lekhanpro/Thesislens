/**
 * POST /api/upload/blob
 * Handles Vercel Blob client-side upload token generation.
 * The client uploads the PDF directly to Vercel Blob (bypassing function body limit),
 * then calls /api/process with the returned blob URL.
 *
 * Docs: https://vercel.com/docs/storage/vercel-blob/client-upload
 */

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate it's a PDF
        if (!pathname.toLowerCase().endsWith(".pdf")) {
          throw new Error("Only PDF files are accepted.");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This is called after upload — we trigger processing here
        console.log("[blob-upload] Upload completed:", blob.url);
        // Processing happens client-side by calling /api/process
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
