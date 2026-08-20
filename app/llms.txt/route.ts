import { SITE, canonicalUrl } from "@/src/config/site"
import { serverRecords } from "@/src/data/servers"
import { isPublicIndexable } from "@/src/lib/indexability"

export function GET() {
  const servers = serverRecords.filter(isPublicIndexable)
  const lines = [
    `# ${SITE.name}`,
    "",
    "Evidence-backed Model Context Protocol directory and documentation.",
    "",
    "## Core pages",
    `- Home: ${canonicalUrl("/")}`,
    `- Servers: ${canonicalUrl("/servers")}`,
    `- Docs: ${canonicalUrl("/docs")}`,
    `- Learn: ${canonicalUrl("/learn")}`,
    `- Methodology: ${canonicalUrl("/methodology")}`,
    `- Evidence policy: ${canonicalUrl("/evidence")}`,
    "",
    "## Published server profiles",
    ...servers.map((server) => `- ${server.title}: ${canonicalUrl(`/servers/${server.slug}`)}`),
    "",
    "Only records that pass the shared publication and evidence gate are listed here.",
  ]

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
