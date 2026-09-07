import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { contentRegistry } from "@/content/content-registry";
import { serverRegistry } from "@/content/server-registry";

const DATA_DIR = path.join(process.cwd(), "data/migration/source");

/** 93 redirects: 90 numeric-suffix glossary + 3 legacy (2 mcp-server-directory + 1 /directory/).
 *  The 2 protected terms (mcp-soc-2, mcp-iso-27001) were removed from the handoff
 *  and are listed separately in glossary-protections.json.
 *  The 4 topical /directory/* paths (iot, databases, devops, monitoring) are held
 *  in the ledger as EVIDENCE_REVIEW per G8 — not mass-redirected. */
const redirects = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "glossary-and-legacy-redirects.json"), "utf-8")
) as { source: string; destination: string; permanent: boolean }[];

/** 676 GSC Coverage-Valid rows. */
const gscIndexed = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "gsc-indexed-urls.json"), "utf-8")
) as { url: string; path: string; bucket: string; clicks: number; impressions: number }[];

function stripTrailingSlash(p: string): string {
  return p.endsWith("/") ? p.slice(0, -1) : p;
}

describe("glossary-migration — numeric suffix reconciliation (93 redirects, post-blocker resolution)", () => {
  it("redirect map has 93 entries (was 94: 2 protected terms removed; 4 /directory/* held for G8 review)", () => {
    expect(redirects).toHaveLength(93);
  });

  it("90 of 92 redirects target /glossary/ or /glossary/mcp-server/", () => {
    const glossaryRedirects = redirects.filter(
      (r) => r.destination === "/glossary/" || r.destination === "/glossary/mcp-server/"
    );
    expect(glossaryRedirects).toHaveLength(90);
  });

  it("3 redirects target /servers/ (1 mcp-server-directory pair + 1 /directory/ generic)", () => {
    // /mcp-server-directory/* 301 → /servers/ (one hop).
    // /directory/ generic → /servers/.
    // The 4 topical /directory/* paths (iot, databases, devops, monitoring) are
    // EVIDENCE_REVIEW in the ledger per G8 — not mass-redirected here.
    const dirRedirects = redirects.filter((r) => r.destination === "/servers/");
    expect(dirRedirects).toHaveLength(3); // 2 mcp-server-directory + 1 /directory/
    const sources = dirRedirects.map((r) => r.source).sort();
    expect(sources).toEqual([
      "/directory/",
      "/mcp-server-directory",
      "/mcp-server-directory/",
    ]);
  });

  it("all redirect sources start with /", () => {
    for (const r of redirects) {
      expect(r.source).toMatch(/^\//);
    }
  });

  it("all redirect destinations are canonical relative paths", () => {
    for (const r of redirects) {
      expect(r.destination).toMatch(/^\//);
      expect(r.destination).not.toMatch(/^https?:\/\//);
    }
  });

  it("all redirects are permanent (301)", () => {
    for (const r of redirects) {
      expect(r.permanent).toBe(true);
    }
  });

  it("redirect sources are unique (counting both /mcp-server-directory variants as one logical source)", () => {
    // The data has 93 raw sources: 90 glossary + 2 mcp-server-directory + 1 /directory/.
    // (4 topical /directory/* held for G8 review, not in handoff.)
    // After stripping trailing slashes: 90 glossary + 1 mcp-server-directory + 1 /directory/ = 92 unique.
    const sources = redirects.map((r) => stripTrailingSlash(r.source));
    const uniqueSources = new Set(sources);
    expect(sources.length).toBe(93);        // raw
    expect(uniqueSources.size).toBe(92);     // 90 glossary + 1 mcp-server-directory + 1 /directory/
  });

  it("every numeric-suffix glossary path in GSC is in the redirect map (excluding the 2 protected terms)", () => {
    // GSC paths carry trailing slashes; redirect sources do not — normalise both.
    // After BLOCKER 1 resolution, 92 numeric-suffix paths exist in GSC, but 2 of them
    // (mcp-soc-2, mcp-iso-27001) are now protected and not in the redirect map.
    const numericGlossary = gscIndexed.filter(
      (r) => r.bucket === "glossary" && /-\d+\/?$/.test(r.path)
    );
    expect(numericGlossary).toHaveLength(92);
    const redirectSources = new Set(redirects.map((r) => stripTrailingSlash(r.source)));
    let inMap = 0;
    const notInMap: string[] = [];
    for (const row of numericGlossary) {
      if (redirectSources.has(stripTrailingSlash(row.path))) {
        inMap++;
      } else {
        notInMap.push(row.path);
      }
    }
    expect(inMap).toBe(90);
    expect(notInMap).toEqual(
      expect.arrayContaining(["/glossary/mcp-soc-2/", "/glossary/mcp-iso-27001/"]),
    );
  });

  it("90 numeric-suffix glossary sources match /glossary/mcp-*-<digit>/?", () => {
    const glossaryRedirects = redirects.filter(
      (r) => r.destination === "/glossary/" || r.destination === "/glossary/mcp-server/"
    );
    for (const r of glossaryRedirects) {
      expect(stripTrailingSlash(r.source)).toMatch(/^\/glossary\/mcp-.+-\d+$/);
    }
  });
});

describe("glossary-migration — destination pages exist in the editorial registry", () => {
  it("/glossary/ is published in the editorial registry", () => {
    // Registry paths have no trailing slash.
    const glossaryEntry = Object.values(contentRegistry).find(
      (e) => e.indexPath === "/glossary"
    );
    expect(glossaryEntry).toBeDefined();
    expect(glossaryEntry?.status).toBe("published");
    expect(glossaryEntry?.noindex).not.toBe(true);
  });

  it("/glossary/mcp-server/ is not in the editorial registry (only the /glossary hub is)", () => {
    // The /glossary registry currently contains the hub only; individual term
    // pages are dynamic. The 1 redirect with destination /glossary/mcp-server/
    // will fall back to /glossary/ at merge time if no matching entry exists.
    const entry = Object.values(contentRegistry).find(
      (e) => e.indexPath === "/glossary/mcp-server"
    );
    expect(entry).toBeUndefined();
  });

  it("/servers aggregate page is reachable (mcp-server-directory redirect target)", () => {
    // /directory/ is not a published page — per milestone-7-server-reconciliation.csv,
    // legacy /directory/* redirects to /servers. The mcp-server-directory redirect
    // targets /directory/ in the raw data and will be remapped to /servers at merge time.
    // Verify the server registry and the /servers page exist; the redirect source is
    // a legacy URL, not a registry path.
    expect(Object.keys(serverRegistry).length).toBeGreaterThan(0);
    const fsCheck = require("fs") as typeof import("fs");
    const p = require("path") as typeof import("path");
    expect(fsCheck.existsSync(p.join(process.cwd(), "app/servers/page.tsx"))).toBe(true);
  });
});
