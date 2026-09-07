import { describe, it, expect } from "vitest";
import { getIndexableServers } from "@/content/server-registry";
import { GET as registryGET } from "../../app/registry.json/route";
import { GET as apiServersGET } from "../../app/api/servers.json/route";
import { GET as mcpRegistryGET } from "../../app/mcp-registry.json/route";
import { GET as llmsGET } from "../../app/llms.txt/route";
import { GET as llmsFullGET } from "../../app/llms-full.txt/route";
import sitemap from "../../app/sitemap";

/**
 * P6 — Machine-surface cohort consistency (BLOCKING).
 *
 * Every public machine surface must project the SAME server cohort, sourced
 * from the single publication authority. Route handlers must consume
 * getIndexableServers() directly — they must never call each other and never
 * read raw inventory.
 *
 * Invariant:
 *   getIndexableServers() slugs
 *     == /servers listing slugs (asserted structurally: page consumes the
 *        same authority function — see source assertions below)
 *     == /registry.json slugs
 *     == /api/servers.json slugs
 *     == /mcp-registry.json slugs
 *     == /llms.txt server slugs
 *     == /llms-full.txt server slugs
 *     == /sitemap.xml server slugs
 *
 * Any mismatch FAILS.
 */

type ServerRouteJSON = { servers: Array<{ slug?: string; name?: string }> };

async function jsonOf(get: () => Promise<Response>): Promise<ServerRouteJSON> {
  const res = await get();
  return (await res.json()) as ServerRouteJSON;
}

function extractLlmsServerSlugs(body: string): string[] {
  // llms.txt surfaces list servers under a "Servers"/"## Servers" section with
  // markdown links to /servers/<slug>. Extract those slugs.
  const slugs = new Set<string>();
  const re = /\(\/servers\/([a-z0-9-]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) slugs.add(m[1]);
  return [...slugs].sort();
}

const authoritySlugs = () => getIndexableServers().map((s) => s.slug).sort();

describe("P6: machine-surface cohort consistency (blocking)", () => {
  it("/registry.json slugs == publication authority cohort", async () => {
    const data = await jsonOf(registryGET);
    expect(data.servers.map((s) => s.slug).sort()).toEqual(authoritySlugs());
  });

  it("/api/servers.json slugs == publication authority cohort", async () => {
    const data = await jsonOf(apiServersGET);
    expect(data.servers.map((s) => s.slug).sort()).toEqual(authoritySlugs());
  });

  it("/mcp-registry.json slugs == publication authority cohort", async () => {
    const data = await jsonOf(mcpRegistryGET);
    expect(data.servers.map((s) => s.slug).sort()).toEqual(authoritySlugs());
  });

  it("/llms.txt server slugs == publication authority cohort", async () => {
    const res = await llmsGET();
    const body = await res.text();
    expect(extractLlmsServerSlugs(body)).toEqual(authoritySlugs());
  });

  it("/llms-full.txt server slugs == publication authority cohort", async () => {
    const res = await llmsFullGET();
    const body = await res.text();
    expect(extractLlmsServerSlugs(body)).toEqual(authoritySlugs());
  });

  it("/sitemap.xml server slugs == publication authority cohort", () => {
    const urls = (sitemap() as Array<{ url: string }>).map((u) => u.url);
    const serverSlugs = urls
      .filter((u) => u.includes("/servers/"))
      .map((u) => u.replace(/^https?:\/\/[^/]+\/servers\//, ""))
      .sort();
    expect(serverSlugs).toEqual(authoritySlugs());
  });

  it("/servers page consumes the publication authority (no raw inventory import)", async () => {
    const { readFileSync } = await import("node:fs");
    const pageSource = readFileSync("app/servers/page.tsx", "utf-8");
    expect(pageSource).toContain("getIndexableServers");
    // Raw inventory must not leak into the public listing page.
    expect(pageSource).not.toMatch(/serverRegistry|rawServers|allServers/);
  });

  it("route handlers do not fetch each other (projection, not proxying)", async () => {
    const { readFileSync } = await import("node:fs");
    for (const f of [
      "app/registry.json/route.ts",
      "app/api/servers.json/route.ts",
      "app/mcp-registry.json/route.ts",
    ]) {
      const src = readFileSync(f, "utf-8");
      expect(src, `${f} must not proxy another route handler`).not.toMatch(
        /fetch\(|registry\.json\/route|servers\.json\/route/,
      );
      expect(src, `${f} must consume the publication authority`).toContain("getIndexableServers");
    }
  });
});
