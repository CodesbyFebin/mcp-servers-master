import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";

/**
 * Behavioral middleware tests (P1 canonical alias + trailing-slash policy).
 *
 * These execute the real middleware function against constructed requests so
 * the redirect matrix is proven, not just inspected at the source level.
 *
 * Contract under test:
 *   /directory, /directory/, /mcp-server-directory, /mcp-server-directory/
 *     → single 301 hop → /servers   (legacy generic alias migration)
 *   /directory/<topic> (iot, databases, devops, monitoring, ...)
 *     → NO alias redirect (G8: held for individual evidence review)
 *   any other non-root path with trailing slash → 308 strip
 *   root "/" → untouched
 */

function req(path: string, host = "www.mcpserver.in") {
  // Constructed Requests do not derive a Host header from the URL, so it is
  // supplied explicitly to mirror what the edge runtime provides.
  return new NextRequest(`https://${host}${path}`, {
    headers: { host },
  });
}

function isRedirect(res: Response): boolean {
  return res.status === 301 || res.status === 307 || res.status === 308;
}

describe("middleware: legacy directory alias migration (P1)", () => {
  it.each(["/directory", "/directory/", "/mcp-server-directory", "/mcp-server-directory/"])(
    "301 one-hop: %s → /servers",
    (path) => {
      const res = middleware(req(path));
      expect(isRedirect(res), `${path} must redirect`).toBe(true);
      expect(res.status).toBe(301);
      const loc = res.headers.get("location") ?? "";
      const locPath = new URL(loc).pathname;
      expect(locPath).toBe("/servers");
    },
  );

  it("alias redirect preserves query string", () => {
    const res = middleware(req("/directory?x=1"));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toContain("x=1");
  });

  it.each(["/directory/iot", "/directory/databases", "/directory/devops", "/directory/monitoring"])(
    "G8: %s is NOT mass-redirected by the alias rule",
    (path) => {
      const res = middleware(req(path));
      expect(res.status).not.toBe(301);
      expect(res.status).not.toBe(308);
    },
  );

  it("does not redirect subpaths of /mcp-server-directory that were never in the handoff", () => {
    // Only the exact alias paths are in the redirect handoff; deeper paths
    // fall through to normal routing.
    const res = middleware(req("/mcp-server-directory/some-page"));
    expect(res.status).not.toBe(301);
  });
});

describe("middleware: host normalization", () => {
  it("308 apex mcpserver.in → www.mcpserver.in preserving path", () => {
    const res = middleware(req("/servers", "mcpserver.in"));
    expect(res.status).toBe(308);
    const loc = res.headers.get("location") ?? "";
    expect(new URL(loc).host).toBe("www.mcpserver.in");
    expect(new URL(loc).pathname).toBe("/servers");
  });

  it("308 app.mcpserver.in → www.mcpserver.in", () => {
    const res = middleware(req("/", "app.mcpserver.in"));
    expect(res.status).toBe(308);
    expect(new URL(res.headers.get("location") ?? "").host).toBe("www.mcpserver.in");
  });

  it("does not redirect localhost (dev/preview guard)", () => {
    const res = middleware(req("/directory", "localhost:3000"));
    expect(res.status).not.toBe(301);
  });
});

describe("middleware: trailing-slash policy", () => {
  it("308 strips trailing slash from normal paths", () => {
    const res = middleware(req("/servers/"));
    expect(res.status).toBe(308);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/servers");
  });

  it("leaves root path / untouched", () => {
    const res = middleware(req("/"));
    expect(res.status).toBe(200);
  });
});
