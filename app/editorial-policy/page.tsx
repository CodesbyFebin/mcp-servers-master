import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Editorial Policy",
  description: "How MCPserver.in separates sourced facts, verification, uncertainty, corrections, and publication decisions.",
  alternates: { canonical: "/editorial-policy" },
  openGraph: { url: "/editorial-policy" },
}

export default function EditorialPolicyPage() {
  return (
    <>
      <span className="badge">Evidence first</span>
      <h1>Editorial policy</h1>
      <p className="lead">
        MCPserver.in treats provenance and uncertainty as part of the published record. Missing information is not filled with plausible-sounding claims.
      </p>

      <h2>Facts require provenance</h2>
      <p>Versions, capabilities, URLs, publisher identity, measurements, pricing, compliance, availability, and other factual fields are published only when the record carries qualifying evidence for the claim.</p>

      <h2>Unknown remains unknown</h2>
      <p>When a reliable source does not establish a value, the public record uses an unknown or empty value rather than inference.</p>

      <h2>Publication is separate from discovery</h2>
      <p>Discovery alone does not create an indexable profile. Public server records must pass <code>isServerIndexable()</code>, the shared publication authority used across the public graph.</p>

      <h2>Corrections and retirement</h2>
      <p>When evidence is contradicted, superseded, or no longer sufficient, the affected claim or record should be corrected, returned to review, or retired. Sitemap and machine-readable output must change with the publication decision.</p>

      <h2>No synthetic reputation signals</h2>
      <p>MCPserver.in does not manufacture reviews, ratings, testimonials, customer logos, popularity numbers, security certifications, or performance guarantees.</p>

      <p><Link href="/evidence">Evidence policy</Link> · <Link href="/methodology">Verification methodology</Link></p>
    </>
  )
}
