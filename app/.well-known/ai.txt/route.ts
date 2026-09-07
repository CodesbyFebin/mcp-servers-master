import { NextResponse } from "next/server";

/**
 * /.well-known/ai.txt — AI crawler directive file (equivalent to robots.txt for AI agents).
 * Mirrors the root ai.txt so the path resolves correctly under app/.well-known/
 * in the Next.js App Router.
 */
import { AI_TXT } from "@/src/seo/ai-txt";

export async function GET() {
  return new NextResponse(AI_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
