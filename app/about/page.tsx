import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About MCPserver.in",
  description: "MCPserver.in is an evidence-backed public knowledge graph for Model Context Protocol server discovery.",
  alternates: { canonical: "/about" },
  openGraph: { url: "/about" },
}

export default function AboutPage() {
  return (
    <>
      <span className="badge">Public knowledge graph</span>
      <h1>About MCPserver.in</h1>
      <p className="lead">
        MCPserver.in is designed as a crawlable, evidence-backed knowledge graph for Model Context Protocol server discovery rather than a volume-first directory.
      </p>

      <h2>What the public site publishes</h2>
      <p>Public profiles expose server identity, supported facts, provenance, verification state, and limitations when those fields are supported by the registry evidence model.</p>

      <h2>What the public site does not assume</h2>
      <p>A discovered server is not automatically published. Unknown fields remain unknown, and records that do not satisfy the publication authority stay outside the indexable public graph.</p>

      <h2>Machine-readable access</h2>
      <p>The same public cohort is exposed through the sitemap, LLM discovery files, and the versioned public registry JSON snapshot.</p>

      <p><Link href="/servers">Browse published servers</Link> · <Link href="/methodology">Read the methodology</Link> · <Link href="/evidence">Read the evidence policy</Link></p>
    </>
  )
}
