import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { contentRegistry } from "@/content/content-registry";
import { getIndexableServers, getServerEntry } from "@/content/server-registry";

const ROOT = path.join(__dirname, "../..");

describe("llms", () => {
  it("only intended public editorial cohort", () => {
    const editorial = Object.values(contentRegistry).filter(
      (e) => e.status === "published" && !e.noindex
    );
    editorial.forEach((entry) => {
      expect(entry.status).toBe("published");
      expect(entry.noindex).not.toBe(true);
    });
  });

  it("only intended public server cohort", () => {
    const servers = getIndexableServers();
    servers.forEach((server) => {
      expect(server.isVerified).toBe(true);
    });
  });

  it("excludes draft editorial", () => {
    const draft = Object.values(contentRegistry).find((e) => e.status === "draft");
    if (draft) {
      const editorial = Object.values(contentRegistry).filter(
        (e) => e.status === "published" && !e.noindex
      );
      expect(editorial).not.toContain(draft);
    }
  });

  it("excludes noindex editorial", () => {
    const noindex = Object.values(contentRegistry).find((e) => e.noindex === true);
    if (noindex) {
      const editorial = Object.values(contentRegistry).filter(
        (e) => e.status === "published" && !e.noindex
      );
      expect(editorial).not.toContain(noindex);
    }
  });

  it("excludes non-indexable servers", () => {
    const nonIndexable = getServerEntry("/servers/mcp-server-postgres");
    if (nonIndexable) {
      const servers = getIndexableServers();
      expect(servers).not.toContain(nonIndexable);
    }
  });
});

describe("Phase 12 machine-readable surfaces", () => {
  describe("/llms-full.txt route exists and is richer than /llms.txt", () => {
    it("app/llms-full.txt/route.ts is present", () => {
      expect(fs.existsSync(path.join(ROOT, "app/llms-full.txt/route.ts"))).toBe(true);
    });

    it("llms-full.txt source contains section headings (full body, not just title+desc)", () => {
      const src = fs.readFileSync(
        path.join(ROOT, "app/llms-full.txt/route.ts"),
        "utf-8",
      );
      // Must reference section markdown from the registry (full body, not just title/desc)
      expect(src).toContain("sections");
      expect(src).toContain("markdown");
      expect(src).toContain("EDITORIAL CONTENT");
      expect(src).toContain("VERIFIED SERVERS");
    });

    it("source does NOT fabricate uptime, memory, or region in health endpoint", () => {
      const src = fs.readFileSync(
        path.join(ROOT, "app/api/health/route.ts"),
        "utf-8",
      );
      // Extract the JSON object body (between GET( and the next }) and assert
      // it contains only { status, sha, now } — no fabricated metrics.
      const body = src.match(/GET\([\s\S]*?\{([\s\S]*?)\}\s*,\s*\{/)?.[1] ?? "";
      expect(body).not.toMatch(/uptime/i);
      expect(body).not.toMatch(/memory/i);
      expect(body).not.toMatch(/heap/i);
      expect(body).not.toMatch(/region/i);
      expect(body).not.toMatch(/datacenter/i);
      expect(body).not.toMatch(/pid/i);
      expect(body).not.toMatch(/uptimeSeconds/);
    });

    it("/api/health route returns status=ok, sha, and now", () => {
      const src = fs.readFileSync(
        path.join(ROOT, "app/api/health/route.ts"),
        "utf-8",
      );
      expect(src).toMatch(/status.*ok/);
      expect(src).toMatch(/sha/);
      expect(src).toMatch(/now.*ISOString/);
    });
  });

  describe("/api/servers.json and /mcp-registry.json are distinct route files", () => {
    it("both alias route files exist", () => {
      expect(
        fs.existsSync(path.join(ROOT, "app/api/servers.json/route.ts")),
      ).toBe(true);
      expect(
        fs.existsSync(path.join(ROOT, "app/mcp-registry.json/route.ts")),
      ).toBe(true);
    });

    it("both call getIndexableServers (same authority as /registry.json)", () => {
      const serversJson = fs.readFileSync(
        path.join(ROOT, "app/api/servers.json/route.ts"),
        "utf-8",
      );
      const mcpRegistryJson = fs.readFileSync(
        path.join(ROOT, "app/mcp-registry.json/route.ts"),
        "utf-8",
      );
      // Both must use the same cohort derivation — not duplicated logic
      expect(serversJson).toContain("getIndexableServers");
      expect(mcpRegistryJson).toContain("getIndexableServers");
    });

    it("both set Access-Control-Allow-Origin: * for cross-origin discovery", () => {
      const serversJson = fs.readFileSync(
        path.join(ROOT, "app/api/servers.json/route.ts"),
        "utf-8",
      );
      const mcpRegistryJson = fs.readFileSync(
        path.join(ROOT, "app/mcp-registry.json/route.ts"),
        "utf-8",
      );
      expect(serversJson).toContain("Access-Control-Allow-Origin");
      expect(mcpRegistryJson).toContain("Access-Control-Allow-Origin");
    });

    it("both include aliasOf metadata referencing /registry.json", () => {
      const serversJson = fs.readFileSync(
        path.join(ROOT, "app/api/servers.json/route.ts"),
        "utf-8",
      );
      const mcpRegistryJson = fs.readFileSync(
        path.join(ROOT, "app/mcp-registry.json/route.ts"),
        "utf-8",
      );
      expect(serversJson).toContain("aliasOf");
      expect(serversJson).toContain("/registry.json");
      expect(mcpRegistryJson).toContain("aliasOf");
      expect(mcpRegistryJson).toContain("/registry.json");
    });
  });
});