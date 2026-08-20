import type { Metadata } from "next"
import Link from "next/link"
import { serverRecords } from "@/src/data/servers"
import { isPublicIndexable } from "@/src/lib/indexability"

export const metadata: Metadata = {
  title: "Verified MCP Servers",
  description: "Evidence-backed Model Context Protocol server profiles with provenance and verification details.",
  alternates: { canonical: "/servers" },
  openGraph: { url: "/servers" },
}

export default function ServersPage() {
  const servers = serverRecords.filter(isPublicIndexable)

  return (
    <>
      <span className="badge">Published registry</span>
      <h1>Verified MCP servers</h1>
      <p className="lead">
        Every profile listed here satisfies the same publication and evidence contract used by the sitemap and machine-readable feeds.
      </p>
      <div className="grid">
        {servers.map((server) => (
          <article className="card" key={server.slug}>
            <span className="badge">Verified</span>
            <h2><Link href={`/servers/${server.slug}`}>{server.title}</Link></h2>
            <p>{server.description}</p>
            <dl>
              <dt>Canonical name</dt><dd>{server.canonicalName}</dd>
              <dt>Category</dt><dd>{server.category}</dd>
              <dt>Version</dt><dd>{server.latestVerifiedVersion ?? "Unknown"}</dd>
              <dt>Capabilities</dt><dd>{server.capabilities.join(", ") || "Unknown"}</dd>
            </dl>
          </article>
        ))}
      </div>
    </>
  )
}
