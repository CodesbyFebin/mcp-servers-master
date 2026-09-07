import { describe, it, expect } from "vitest";
import { GET as aiTxtGET } from "../../app/ai.txt/route";
import { GET as wellKnownAiGET } from "../../app/.well-known/ai.txt/route";
import { GET as llmsGET } from "../../app/llms.txt/route";
import { AI_TXT } from "@/seo/ai-txt";

/**
 * SEO/AEO/GEO machine-readable surface tests.
 *
 * - /ai.txt and /.well-known/ai.txt must be byte-identical (shared module)
 *   and must point agents at the MCP registry + policy surfaces.
 * - /llms.txt must link the core directories AND the machine-readable
 *   registry endpoints (GEO discovery path).
 */

describe("ai.txt surface", () => {
  it("root /ai.txt exists and mirrors /.well-known/ai.txt byte-for-byte", async () => {
    const root = await (await aiTxtGET()).text();
    const wellKnown = await (await wellKnownAiGET()).text();
    expect(root).toBe(wellKnown);
  });

  it("agent manifest points to the registry, llms.txt, and policy", () => {
    expect(AI_TXT).toContain("Registry: https://www.mcpserver.in/mcp-registry.json");
    expect(AI_TXT).toContain("LLMs-Info: https://www.mcpserver.in/llms.txt");
    expect(AI_TXT).toContain("Policy: https://www.mcpserver.in/robots.txt");
    expect(AI_TXT).toContain("Canonical: https://www.mcpserver.in");
  });

  it("served as plain text", async () => {
    const res = await aiTxtGET();
    expect(res.headers.get("content-type")).toContain("text/plain");
  });
});

describe("llms.txt surface", () => {
  it("starts with an H1 and links core directories", async () => {
    const body = await (await llmsGET()).text();
    expect(body.startsWith("# ")).toBe(true);
    expect(body).toContain("https://www.mcpserver.in/servers");
    expect(body).toContain("https://www.mcpserver.in/pillars");
  });

  it("links the machine-readable registry endpoints (GEO discovery)", async () => {
    const body = await (await llmsGET()).text();
    expect(body).toContain("(https://www.mcpserver.in/mcp-registry.json)");
    expect(body).toContain("(https://www.mcpserver.in/registry.json)");
    expect(body).toContain("(https://www.mcpserver.in/llms-full.txt)");
  });
});
