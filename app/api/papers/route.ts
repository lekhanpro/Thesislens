/**
 * GET /api/papers — not needed in localStorage architecture.
 * Papers are read directly from localStorage on the client.
 * This stub exists for compatibility.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([]);
}
