import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "MCP Integrations",
  description: "Integration records will be published here only after they have evidence-backed canonical identities.",
  alternates: { canonical: "/integrations" },
  robots: { index: false, follow: true },
  openGraph: { url: "/integrations" },
}

export default function IntegrationsPage() {
  return (
    <>
      <span className="badge">Evidence migration pending</span>
      <h1>MCP integrations</h1>
      <p className="lead">
        No integration records have cleared the evidence-backed migration gate in the current canonical dataset. This route remains noindex until authoritative integration entities exist.
      </p>
      <p>
        <Link href="/servers">Browse published servers</Link> · <Link href="/evidence">Read the evidence policy</Link>
      </p>
    </>
  )
}
