import { SITE, canonicalUrl } from "@/src/config/site"
import { serverRecords } from "@/src/data/servers"
import { isPublicIndexable } from "@/src/lib/indexability"

export function GET() {
  const servers = serverRecords.filter(isPublicIndexable)
  const lines = [
    `# ${SITE.name} — Published MCP Server Evidence`,
    "",
    "This feed contains only records that pass the site's shared publication and evidence gate.",
    "Verification means the listed facts are backed by attached source records; it is not a blanket security audit or availability guarantee.",
    "",
    ...servers.flatMap((server) => [
      `## ${server.title}`,
      `URL: ${canonicalUrl(`/servers/${server.slug}`)}`,
      `Canonical name: ${server.canonicalName}`,
      `Category: ${server.category}`,
      `Description: ${server.description}`,
      `Verified version: ${server.latestVerifiedVersion ?? "Unknown"}`,
      `Capabilities: ${server.capabilities.join(", ") || "Unknown"}`,
      `Repository: ${server.repositoryUrl ?? "Unknown"}`,
      `Website: ${server.websiteUrl ?? "Unknown"}`,
      `Evidence: ${server.evidence.map((item) => `${item.sourceType}:${item.status}:${item.sourceUrl}`).join(" | ")}`,
      "",
    ]),
  ]

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
