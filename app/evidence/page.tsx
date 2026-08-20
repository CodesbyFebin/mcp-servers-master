import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Evidence Policy",
  description: "Evidence states and publication rules used by MCPserver.in.",
  alternates: { canonical: "/evidence" },
  openGraph: { url: "/evidence" },
}

export default function EvidencePage() {
  return (
    <>
      <h1>Evidence policy</h1>
      <p className="lead">Evidence is attached to individual facts and records. Missing evidence is not replaced with generated certainty.</p>
      <h2>Evidence states</h2>
      <dl>
        <dt>Verified</dt><dd>A source directly supports the published fact.</dd>
        <dt>Measured</dt><dd>A documented measurement supports the value and should include method and scope.</dd>
        <dt>Unverified</dt><dd>A candidate claim exists but is not cleared for publication as fact.</dd>
        <dt>Unknown</dt><dd>No reliable source currently establishes the value.</dd>
      </dl>

      <h2>Publication authority</h2>
      <p><code>isServerIndexable()</code> is the single public publication gate. A server must be published, verified, not explicitly marked noindex, and carry at least one verified or measured evidence record.</p>

      <h2>Machine-readable evidence</h2>
      <p>
        The public cohort is available as <a href="/registry.json">registry.json</a>. A text representation with attached evidence references is available in <a href="/llms-full.txt">llms-full.txt</a>. Both are generated from the same registry cohort used by the visible server pages.
      </p>

      <h2>What verification does not mean</h2>
      <p>Verification is not a blanket security certification, endorsement, availability guarantee, regulatory certification, or performance promise.</p>
      <h2>Corrections</h2>
      <p>Corrections should update both the visible record and its evidence provenance so public HTML, structured data, sitemap membership, and machine-readable feeds remain consistent.</p>
    </>
  )
}
