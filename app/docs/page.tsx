import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "MCP Documentation",
  description: "Technical documentation hub for Model Context Protocol concepts, transports, capabilities, and security.",
  alternates: { canonical: "/docs" },
  openGraph: { url: "/docs" },
}

export default function DocsPage() {
  return (
    <>
      <h1>MCP documentation</h1>
      <p className="lead">A source-oriented documentation hub for understanding Model Context Protocol records published by MCPserver.in.</p>
      <div className="grid">
        <section className="card"><h2>Protocol</h2><p>Understand servers, clients, transports, tools, resources, prompts, and authentication without conflating registry metadata with runtime guarantees.</p></section>
        <section className="card"><h2>Evidence</h2><p>Published facts remain tied to their source records and verification state.</p><p><Link href="/methodology">Read the methodology</Link>.</p></section>
      </div>
    </>
  )
}
