import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <>
      <span className="badge">404</span>
      <h1>Page not found</h1>
      <p className="lead">This URL is not part of the published MCPserver.in knowledge graph.</p>
      <p>
        <Link href="/servers">Browse verified MCP servers</Link> · <Link href="/categories">Browse categories</Link> · <Link href="/methodology">Read the methodology</Link>
      </p>
    </>
  )
}
