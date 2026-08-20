import { SITE, canonicalUrl } from "@/src/config/site"
import { STATIC_PUBLIC_NODES, getPublicServerNodes } from "@/src/lib/public-graph"

export function GET() {
  const staticNodes = STATIC_PUBLIC_NODES
  const serverNodes = getPublicServerNodes()
  const lines = [
    `# ${SITE.name}`,
    "",
    "Evidence-backed Model Context Protocol directory and documentation.",
    "",
    "## Core pages",
    ...staticNodes.map((node) => `- ${node.label}: ${canonicalUrl(node.path)}`),
    "",
    "## Published server profiles",
    ...serverNodes.map((node) => `- ${node.label}: ${canonicalUrl(node.path)}`),
    "",
    "Only records that pass the shared publication and evidence gate are listed here.",
  ]

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
