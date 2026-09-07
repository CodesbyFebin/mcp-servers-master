import { getIndexableEntries } from "@/src/content/content-registry";
import { getIndexableServers } from "@/src/content/server-registry";
import { CANONICAL_ORIGIN } from "@/src/seo/breadcrumbs";

/**
 * /llms-full.txt — full body content of every indexable page.
 *
 * Complements /llms.txt: the title+desc surface lists every URL; the full
 * surface emits the full markdown body for editorial entries (so an LLM
 * can ingest the entire published authority corpus) plus the description
 * and evidence pointers for each verified server.
 *
 * Publication authority: same as /llms.txt.
 *  - Editorial: status="published" AND noindex !== true
 *  - Servers: passes isServerIndexable()
 */
export async function GET() {
  const baseUrl = CANONICAL_ORIGIN;

  const editorialEntries = getIndexableEntries();
  const serverEntries = getIndexableServers();

  const editorialBlocks = editorialEntries.map((entry) => {
    const title = entry.h1 || entry.title;
    const desc = entry.metaDescription;
    const header = [
      `# ${title}`,
      "",
      `> ${desc}`,
      "",
      `URL: ${baseUrl}${entry.indexPath}`,
      `Type: ${entry.type}`,
      `Intent: ${entry.intent}`,
      `Status: ${entry.status}`,
      "",
    ];

    const body = (entry.sections ?? []).map((s) => {
      return [`## ${s.heading}`, "", s.markdown, ""].join("\n");
    });

    return [...header, ...body, "---", ""].join("\n");
  });

  const serverBlocks = serverEntries.map((entry) => {
    const evidenceLines = (entry.evidenceRefs ?? []).map(
      (id) => `- evidence: ${id}`,
    );
    return [
      `## ${entry.name}`,
      "",
      entry.description,
      "",
      `URL: ${baseUrl}${entry.indexPath}`,
      `Slug: ${entry.slug}`,
      `Verification Status: ${entry.verificationStatus}`,
      `Last Verified: ${entry.lastVerifiedAt ?? "N/A"}`,
      "",
      "Evidence:",
      ...evidenceLines,
      "",
      "---",
      "",
    ].join("\n");
  });

  const out: string[] = [
    "# MCPserver.in — Full Content",
    "",
    "This file is the full body of every published page on MCPserver.in, intended",
    "for complete LLM ingestion. It complements /llms.txt (titles + descriptions).",
    "",
    "Publication authority: editorial entries must be status=published and not",
    "noindex; server entries must pass isServerIndexable() (verified with evidence).",
    "",
    `Canonical Origin: ${baseUrl}`,
    `Generated: ${new Date().toISOString()}`,
    `Editorial entries: ${editorialEntries.length}`,
    `Verified servers: ${serverEntries.length}`,
    "",
    "================================================================",
    "EDITORIAL CONTENT",
    "================================================================",
    "",
  ];

  if (editorialBlocks.length === 0) {
    out.push("(No published editorial entries.)", "");
  } else {
    out.push(...editorialBlocks);
  }

  out.push(
    "================================================================",
    "VERIFIED SERVERS",
    "================================================================",
    "",
  );

  if (serverBlocks.length === 0) {
    out.push("(No verified servers.)", "");
  } else {
    out.push(...serverBlocks);
  }

  return new Response(out.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
