import { NextResponse } from "next/server";
import { getIndexableServers } from "@/src/content/server-registry";
import { CANONICAL_ORIGIN } from "@/src/seo/breadcrumbs";

/**
 * /mcp-registry.json — alias of /registry.json (same payload, same authority).
 *
 * Provided to match the `mcp-registry.json` naming convention used by MCP
 * server.json discovery tooling. The implementation delegates to the same
 * cohort derivation as /registry.json; do NOT diverge the two.
 */
export async function GET() {
  const servers = getIndexableServers();
  const registry = {
    metadata: {
      name: "MCPserver.in Registry",
      description:
        "Public authority for MCP server discovery with evidence-backed verification",
      version: "1.0.0",
      canonicalOrigin: CANONICAL_ORIGIN,
      generatedAt: new Date().toISOString(),
      totalServers: servers.length,
      publicationAuthority: "isServerIndexable() from @mcp/servers-registry",
      evidenceLedger: `${CANONICAL_ORIGIN}/evidence`,
      aliasOf: `${CANONICAL_ORIGIN}/registry.json`,
    },
    servers: servers.map((server) => ({
      name: server.name,
      slug: server.slug,
      description: server.description,
      version: server.version,
      capabilities: server.capabilities,
      transports: server.transports,
      authentication: server.authentication,
      repository: server.repository,
      documentation: server.documentationUrl,
      categories: server.categories,
      tags: server.tags,
      verificationStatus: server.verificationStatus,
      verificationSummary: server.verificationSummary,
      evidenceRefs: server.evidenceRefs,
      lastVerifiedAt: server.lastVerifiedAt,
      url: `${CANONICAL_ORIGIN}${server.indexPath}`,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    })),
  };

  return NextResponse.json(registry, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
