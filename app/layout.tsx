import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"
import { SITE } from "@/src/config/site"

export const metadata: Metadata = {
  metadataBase: new URL(SITE.origin),
  title: {
    default: "MCPserver.in — Evidence-backed MCP server directory",
    template: "%s | MCPserver.in",
  },
  description:
    "Discover Model Context Protocol servers with explicit provenance, verification state, and evidence-backed technical details.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE.origin,
    title: "MCPserver.in — Evidence-backed MCP server directory",
    description:
      "Discover Model Context Protocol servers with explicit provenance, verification state, and evidence-backed technical details.",
  },
  robots: { index: true, follow: true },
}

const organization = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE.origin}/#organization`,
      name: SITE.name,
      url: `${SITE.origin}/`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.origin}/#website`,
      url: `${SITE.origin}/`,
      name: SITE.name,
      publisher: { "@id": `${SITE.origin}/#organization` },
    },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <header>
          <nav className="container" aria-label="Primary navigation">
            <Link className="brand" href="/">MCPserver.in</Link>
            <Link href="/servers">Servers</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/learn">Learn</Link>
            <Link href="/methodology">Methodology</Link>
            <Link href="/evidence">Evidence</Link>
          </nav>
        </header>
        <main id="main" className="container">{children}</main>
        <footer>
          <div className="container">Evidence first. Unknown remains unknown.</div>
        </footer>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
        />
      </body>
    </html>
  )
}
