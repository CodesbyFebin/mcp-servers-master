import { NextRequest, NextResponse } from "next/server";

/**
 * Canonical host guard + legacy alias migration + trailing-slash policy.
 *
 * Product doctrine (locked):
 *   www.mcpserver.in — public search / evidence / knowledge authority
 *   app.mcpserver.in — application/workspace surface (not yet deployed)
 *   mcpserver.in     — apex; redirect to www
 *
 * Until the standalone app workspace exists, app.mcpserver.in must NOT serve
 * the public authority corpus. We issue a 308 to www preserving path and query.
 *
 * Legacy directory aliases: /directory and /mcp-server-directory converge to
 * /servers as ONE migration hop (301). Exact path match only — topical
 * /directory/* subpaths are held for G8 evidence review and must not be
 * mass-redirected.
 *
 * Trailing-slash policy: paths are non-slash canonical. Any non-root path with
 * a trailing slash is 308-redirected to the same path without the trailing slash.
 * The root path "/" is unchanged.
 *
 * Implementation note: redirect destinations are built by mutating a plain
 * WHATWG URL. NextURL's pathname setter re-applies the original trailing
 * slash on format(), which would turn the slash-strip 308 into an infinite
 * redirect loop.
 */
const APP_HOST = "app.mcpserver.in";
const APEX_HOST = "mcpserver.in";
const CANONICAL_HOST = "www.mcpserver.in";
const LEGACY_DIRECTORY_ALIASES = new Set(["/directory", "/mcp-server-directory"]);
const ALIAS_CANONICAL_TARGET = "/servers";

function redirectTo(request: NextRequest, status: 301 | 308, mutate: (url: URL) => void) {
  const url = new URL(request.url);
  mutate(url);
  return NextResponse.redirect(url, status);
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0].toLowerCase();

  // Skip Vercel preview / internal hosts entirely.
  if (
    hostname.endsWith(".vercel.app") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return NextResponse.next();
  }

  // Host normalization: app + apex → www (308)
  if (hostname === APP_HOST || hostname === APEX_HOST) {
    return redirectTo(request, 308, (url) => {
      url.protocol = "https:";
      url.host = CANONICAL_HOST;
    });
  }

  const { pathname, search } = request.nextUrl;

  // Legacy alias migration first, so /directory/ collapses to /servers in a
  // single 301 hop instead of a 308 slash-strip + 301 chain.
  const barePath = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  if (LEGACY_DIRECTORY_ALIASES.has(barePath)) {
    return redirectTo(request, 301, (url) => {
      url.pathname = ALIAS_CANONICAL_TARGET;
    });
  }

  // Trailing-slash normalization: non-root paths ending in "/" → 308 to strip
  if (pathname !== "/" && pathname.endsWith("/")) {
    return redirectTo(request, 308, (url) => {
      url.pathname = pathname.replace(/\/+$/, "");
    });
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets and Next internals.
  matcher: [
    // Skip static assets, Next.js internals, pre-rendered text surfaces,
    // and RFC 8615 /.well-known/ resources.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt|llms-full.txt|\\.well-known/).*)",
  ],
};
