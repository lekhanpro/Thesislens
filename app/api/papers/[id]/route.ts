/**
 * GET /api/papers/[id]     — not needed in localStorage architecture (stub)
 * DELETE /api/papers/[id]  — not needed (client deletes from localStorage)
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Papers are stored client-side. Use localStorage." },
    { status: 404 }
  );
}

export async function DELETE() {
  return NextResponse.json({ message: "OK" });
}
