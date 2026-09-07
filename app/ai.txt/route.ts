import { NextResponse } from "next/server";
import { AI_TXT } from "@/src/seo/ai-txt";

/**
 * /ai.txt — root alias. Mirrors /.well-known/ai.txt exactly (shared module)
 * so agents resolving either path get the identical manifest.
 */
export async function GET() {
  return new NextResponse(AI_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
