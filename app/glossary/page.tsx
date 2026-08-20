import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "MCP Glossary",
  description: "Glossary terms will be published here only after the authoritative migrated term inventory is available.",
  alternates: { canonical: "/glossary" },
  robots: { index: false, follow: true },
  openGraph: { url: "/glossary" },
}

export default function GlossaryPage() {
  return (
    <>
      <span className="badge">Migration inventory pending</span>
      <h1>MCP glossary</h1>
      <p className="lead">
        The legacy glossary inventory has not yet been migrated into the canonical Evidence Ledger. This route remains noindex rather than generating unsupported definitions or duplicate term URLs.
      </p>
      <p>
        <Link href="/docs">Read current protocol documentation</Link> · <Link href="/evidence">Read the evidence policy</Link>
      </p>
    </>
  )
}
