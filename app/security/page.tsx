import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Security Baseline",
  description: "Security controls currently enforced by the MCPserver.in public web application, without certification claims.",
  alternates: { canonical: "/security" },
  openGraph: { url: "/security" },
}

export default function SecurityPage() {
  return (
    <>
      <span className="badge">Implementation baseline</span>
      <h1>Security baseline</h1>
      <p className="lead">
        This page documents controls implemented by the public web application. It does not represent a penetration-test result, regulatory certification, or availability guarantee.
      </p>

      <h2>Response protections</h2>
      <ul>
        <li><code>X-Content-Type-Options: nosniff</code></li>
        <li><code>X-Frame-Options: DENY</code></li>
        <li><code>Referrer-Policy: strict-origin-when-cross-origin</code></li>
        <li>Permissions Policy disables camera, microphone, and geolocation for the public site.</li>
        <li>A Content Security Policy limits default, script, style, image, font, connection, frame, base-URI, and form-action sources.</li>
      </ul>

      <h2>Preview isolation</h2>
      <p>Vercel preview hosts are separated from the public search graph and receive an <code>X-Robots-Tag</code> noindex directive at the request boundary.</p>

      <h2>Publication safety</h2>
      <p>
        Security-related claims are subject to the same evidence policy as other factual claims. A server profile being verified does not mean MCPserver.in has audited that server for vulnerabilities.
      </p>

      <h2>Related policies</h2>
      <p><Link href="/evidence">Evidence policy</Link> · <Link href="/methodology">Verification methodology</Link> · <Link href="/editorial-policy">Editorial policy</Link></p>
    </>
  )
}
