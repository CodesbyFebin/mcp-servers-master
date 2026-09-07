import { getIndexableEntries } from "@/src/content/content-registry";
import { getIndexableServers } from "@/src/content/server-registry";
import { CANONICAL_ORIGIN } from "@/src/seo/breadcrumbs";

/**
 * LLMs.txt generation combining editorial content and server entities.
 * 
 * Follows the llms.txt specification (https://llms.txt) for AI-friendly
 * site summaries. Only includes public, indexable content:
 * - Editorial: entries with status="published" AND noindex !== true
 * - Servers: entries that pass isServerIndexable() (verified + evidence)
 * 
 * Excludes: draft, noindex, quarantine, unverified, retired
 */
export async function GET() {
  const baseUrl = CANONICAL_ORIGIN;

  // Editorial cohort
  const editorialEntries = getIndexableEntries();
  const editorialLines = editorialEntries.map((entry) => {
    const title = entry.h1 || entry.title;
    const desc = entry.metaDescription;
    return `- [${title}](${baseUrl}${entry.indexPath}): ${desc}`;
  });

  // Server cohort
  const serverEntries = getIndexableServers();
  const serverLines = serverEntries.map((entry) => {
    const desc = entry.description;
    return `- [${entry.name}](${baseUrl}${entry.indexPath}): ${desc}`;
  });

  // Static core pages
  const staticLines = [
    `- [MCPserver.in](${baseUrl}/): Public authority for MCP server discovery with evidence-backed verification.`,
    `- [Servers Directory](${baseUrl}/servers): Browse all verified MCP servers.`,
    `- [Pillar Directory](${baseUrl}/pillars): The 69-pillar authority graph organizing the MCP knowledge corpus.`,
    `- [Categories](${baseUrl}/categories): Browse servers by category.`,
    `- [Capabilities](${baseUrl}/capabilities): Browse servers by capability.`,
    `- [Evidence Ledger](${baseUrl}/evidence): How we track and verify claims.`,
    `- [Publication Methodology](${baseUrl}/methodology): Rules for indexability and verification.`,
    `- [Editorial Policy](${baseUrl}/editorial-policy): Content standards and authority separation.`,
    `- [About MCPserver.in](${baseUrl}/about): Dual-product architecture and mission.`,
  ];

  const allLines = [
    "# MCPserver.in",
    "",
    "MCPserver.in is the public authority for MCP server discovery with evidence-backed verification.",
    "This file lists all publicly indexable content for AI consumption.",
    "",
    "## Core Pages",
    "",
    ...staticLines,
    "",
    "## Editorial Content",
    "",
    ...editorialLines,
    "",
    "## Verified Servers",
    "",
    ...serverLines,
    "",
    "## Machine-Readable Surfaces",
    "",
    `- [MCP Registry (JSON)](${baseUrl}/mcp-registry.json): Machine-readable registry of all verified servers.`,
    `- [Registry JSON](${baseUrl}/registry.json): Canonical registry endpoint (server.json convention).`,
    `- [Servers JSON API](${baseUrl}/api/servers.json): Alias of the canonical registry endpoint.`,
    `- [LLMs Full Text](${baseUrl}/llms-full.txt): Full-body edition of this file for deep ingestion.`,
    `- [Sitemap](${baseUrl}/sitemap.xml): Indexable-cohort URL list for crawlers.`,
    "",
    "---",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Canonical Origin: ${baseUrl}`,
    `Total Indexable Pages: ${staticLines.length + editorialLines.length + serverLines.length}`,
  ];

  return new Response(allLines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}