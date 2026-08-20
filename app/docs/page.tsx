import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "MCP Documentation",
  description: "Technical documentation hub for the current Model Context Protocol revision, registry records, transports, capabilities, and evidence.",
  alternates: { canonical: "/docs" },
  openGraph: { url: "/docs" },
}

export default function DocsPage() {
  return (
    <>
      <span className="badge">Protocol revision 2026-07-28</span>
      <h1>MCP documentation</h1>
      <p className="lead">A source-oriented documentation hub for understanding Model Context Protocol records published by MCPserver.in.</p>

      <h2>Current protocol baseline</h2>
      <p>
        MCPserver.in documentation targets the 2026-07-28 protocol revision. That release moved the protocol core to a stateless request/response model, added HTTP routing metadata, cache hints for list results, authorization hardening, and a formal extensions framework.
      </p>
      <p><a href="https://blog.modelcontextprotocol.io/posts/2026-07-28/">Read the official 2026-07-28 release notes</a>.</p>

      <div className="grid">
        <section className="card">
          <h2>Server discovery</h2>
          <p>Start with concrete published records rather than generic compatibility claims.</p>
          <p><Link href="/servers">Browse verified servers</Link> · <Link href="/categories">Categories</Link> · <Link href="/capabilities">Capabilities</Link></p>
        </section>
        <section className="card">
          <h2>Protocol concepts</h2>
          <p>Tools expose callable operations, resources expose data or content, and prompts expose reusable prompt templates. A server record may advertise only a subset of protocol features.</p>
          <p><Link href="/learn">Open the learning guide</Link>.</p>
        </section>
        <section className="card">
          <h2>Evidence and publication</h2>
          <p>Registry metadata is not treated as proof of unrelated runtime, security, compliance, or performance properties.</p>
          <p><Link href="/evidence">Evidence policy</Link> · <Link href="/methodology">Methodology</Link></p>
        </section>
        <section className="card">
          <h2>Machine-readable registry</h2>
          <p>The public registry JSON and LLM discovery feeds are generated from the same published server cohort as visible profiles.</p>
          <p><a href="/registry.json">registry.json</a> · <a href="/llms.txt">llms.txt</a> · <a href="/llms-full.txt">llms-full.txt</a></p>
        </section>
      </div>

      <h2>Version-sensitive implementation guidance</h2>
      <p>When integrating a client or server, verify which MCP protocol revision and SDK version the implementation actually supports. Older session-oriented behavior should not be silently attributed to a 2026-07-28 implementation.</p>
    </>
  )
}
