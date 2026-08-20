import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "MCP Clients",
  description: "Client records will be published here only after evidence-backed canonical identities are migrated.",
  alternates: { canonical: "/clients" },
  robots: { index: false, follow: true },
  openGraph: { url: "/clients" },
}

export default function ClientsPage() {
  return (
    <>
      <span className="badge">Evidence migration pending</span>
      <h1>MCP clients</h1>
      <p className="lead">
        No client records have cleared the evidence-backed migration gate in the current canonical dataset. This route remains noindex until authoritative client entities exist.
      </p>
      <p>
        <Link href="/learn">Learn the protocol model</Link> · <Link href="/methodology">Read the publication methodology</Link>
      </p>
    </>
  )
}
