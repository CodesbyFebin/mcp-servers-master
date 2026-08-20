import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SITE } from "./src/config/site"

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase() ?? ""

  if (host === "mcpserver.in") {
    const target = new URL(request.url)
    target.protocol = "https:"
    target.host = SITE.hostname
    return NextResponse.redirect(target, 308)
  }

  if (host === "app.mcpserver.in") {
    const response = NextResponse.redirect(new URL("/", SITE.origin), 307)
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
    response.headers.set("X-MCP-App-Status", "foundation")
    response.headers.set("Cache-Control", "no-store")
    return response
  }

  const response = NextResponse.next()

  if (host.endsWith(".vercel.app")) {
    response.headers.set("X-Robots-Tag", "noindex, follow")
  }

  return response
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
}
