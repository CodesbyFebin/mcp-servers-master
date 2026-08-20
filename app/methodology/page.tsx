import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Verification Methodology",
  description: "How MCPserver.in sources, verifies, publishes, and retires Model Context Protocol records.",
  alternates: { canonical: "/methodology" },
  openGraph: { url: "/methodology" },
}

export default function MethodologyPage() {
  return (
    <>
      <h1>Verification methodology</h1>
      <p className="lead">
        MCPserver.in separates discovery from publication. A discovered entity is not automatically a public, indexable profile.
      </p>
      <h2>1. Source</h2>
      <p>Records begin with an explicit source such as an official registry entry, repository, publisher documentation, or a documented measurement.</p>
      <h2>2. Normalize</h2>
      <p>Names, URLs, versions, capabilities, categories, and provenance are normalized without filling unknown values from inference.</p>
      <h2>3. Verify</h2>
      <p>Evidence records capture the source type, status, capture date, and the fact being supported. Unsupported fields remain unknown.</p>
      <h2>4. Publish</h2>
      <p>Only records for which <code>isServerIndexable()</code> returns true can appear in the public registry cohort. That cohort feeds visible server profiles, aggregate discovery, static params, sitemap entity entries, and machine-readable resources.</p>
      <h2>5. Review and retire</h2>
      <p>When evidence becomes stale, contradictory, unavailable, or superseded, the record can be moved back to review or retired rather than silently retaining a claim.</p>

      <h2>Public graph consistency</h2>
      <p>The sitemap, <a href="/registry.json">public registry JSON</a>, <a href="/llms.txt">llms.txt</a>, and <a href="/llms-full.txt">llms-full.txt</a> must not independently decide which server entities are public.</p>

      <p><Link href="/evidence">Read the evidence policy</Link> · <Link href="/editorial-policy">Read the editorial policy</Link></p>
    </>
  )
}
