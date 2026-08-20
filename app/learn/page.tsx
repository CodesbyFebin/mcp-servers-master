import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Learn Model Context Protocol",
  description: "Learn how MCP servers, clients, capabilities, transports, and evidence-backed registry records fit together.",
  alternates: { canonical: "/learn" },
  openGraph: { url: "/learn" },
}

export default function LearnPage() {
  return (
    <>
      <h1>Learn Model Context Protocol</h1>
      <p className="lead">MCP is a protocol for connecting AI applications with external tools and context providers through defined server/client interactions.</p>
      <h2>Start with the registry</h2>
      <p>Use the <Link href="/servers">verified server directory</Link> to inspect concrete records and their source provenance.</p>
      <h2>Separate evidence from inference</h2>
      <p>A registry record can establish identity, version, source, or advertised transport without proving unrelated claims such as uptime, security certification, latency, or regulatory compliance.</p>
      <h2>Understand the publication model</h2>
      <p><Link href="/methodology">Read the methodology</Link> to see how records move from source discovery to public indexability.</p>
    </>
  )
}
