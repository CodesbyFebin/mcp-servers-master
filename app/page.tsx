import Link from "next/link"
import { serverRecords } from "@/src/data/servers"
import { isPublicIndexable, ledgerCounts } from "@/src/lib/indexability"

export default function HomePage() {
  const counts = ledgerCounts(serverRecords)
  const published = serverRecords.filter(isPublicIndexable)

  return (
    <>
      <span className="badge">Evidence Ledger</span>
      <h1>Discover MCP servers backed by evidence.</h1>
      <p className="lead">
        MCPserver.in publishes Model Context Protocol records only when they pass a shared
        evidence and indexability contract. Source provenance, verification state, and
        limitations stay visible instead of being replaced with generated claims.
      </p>

      <div className="grid" aria-label="Evidence ledger summary">
        <section className="card"><strong>{counts.total}</strong><div className="meta">entities tracked</div></section>
        <section className="card"><strong>{counts.published}</strong><div className="meta">published profiles</div></section>
        <section className="card"><strong>{counts.awaitingEvidence}</strong><div className="meta">awaiting evidence</div></section>
      </div>

      <h2>Verified server profiles</h2>
      <div className="grid">
        {published.map((server) => (
          <article className="card" key={server.slug}>
            <span className="badge">Verified</span>
            <h3><Link href={`/servers/${server.slug}`}>{server.title}</Link></h3>
            <p>{server.description}</p>
            <p className="meta">{server.category} · {server.canonicalName}</p>
          </article>
        ))}
      </div>

      <h2>How publication works</h2>
      <p>
        A record becomes indexable only after it is explicitly published, verified, and
        linked to at least one verified or measured evidence item. The same predicate drives
        server pages, directory listings, the sitemap, and machine-readable discovery files.
      </p>
      <p><Link href="/methodology">Read the methodology</Link> or <Link href="/evidence">inspect the evidence policy</Link>.</p>
    </>
  )
}
