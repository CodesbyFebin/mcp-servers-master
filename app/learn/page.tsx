import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Learn Model Context Protocol",
  description: "Learn how current MCP servers, tools, resources, prompts, transports, extensions, and evidence-backed registry records fit together.",
  alternates: { canonical: "/learn" },
  openGraph: { url: "/learn" },
}

export default function LearnPage() {
  return (
    <>
      <span className="badge">MCP 2026-07-28</span>
      <h1>Learn Model Context Protocol</h1>
      <p className="lead">MCP defines a protocol for AI applications to interact with external capabilities and context through servers. The current 2026-07-28 revision uses a stateless protocol core.</p>

      <h2>Core server features</h2>
      <div className="grid">
        <section className="card"><h3>Tools</h3><p>Callable operations exposed by an MCP server. Tool availability in a registry record does not by itself prove runtime reliability or safety.</p></section>
        <section className="card"><h3>Resources</h3><p>Data or content a server makes available to clients, such as files, records, API responses, or other contextual material.</p></section>
        <section className="card"><h3>Prompts</h3><p>Reusable prompt templates exposed by a server for clients to discover and use.</p></section>
      </div>

      <h2>Transport and protocol revision matter</h2>
      <p>The 2026-07-28 revision made the protocol core stateless and introduced routing metadata and cache hints for HTTP deployments. Compatibility claims should therefore identify the protocol revision actually supported rather than assuming behavior from older MCP releases.</p>
      <p><a href="https://blog.modelcontextprotocol.io/posts/2026-07-28/">Official 2026-07-28 release notes</a>.</p>

      <h2>Start with evidence-backed records</h2>
      <p>Use the <Link href="/servers">verified server directory</Link>, <Link href="/categories">category map</Link>, and <Link href="/capabilities">capability map</Link> to inspect concrete published records and their provenance.</p>

      <h2>Separate evidence from inference</h2>
      <p>A registry source can establish identity, version, source, or an advertised capability without proving unrelated claims such as uptime, security certification, latency, or regulatory compliance.</p>

      <h2>Understand the publication model</h2>
      <p><Link href="/methodology">Read the methodology</Link> and <Link href="/evidence">evidence policy</Link> to see how records move from discovery to public indexability.</p>
    </>
  )
}
