import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"
import { SITE } from "@/src/config/site"

const siteTitle = "MCPserver.in — Evidence-backed MCP knowledge graph"
const siteDescription =
  "Discover Model Context Protocol servers through a public knowledge graph with explicit provenance, verification state, and evidence-backed technical details."

export const metadata: Metadata = {
  metadataBase: new URL(SITE.origin),
  title: {
    default: siteTitle,
    template: "%s | MCPserver.in",
  },
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE.origin,
    title: siteTitle,
    description: siteDescription,
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
      description: siteDescription,
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
            <Link href="/categories">Categories</Link>
            <Link href="/capabilities">Capabilities</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/learn">Learn</Link>
            <Link href="/evidence">Evidence</Link>
          </nav>
        </header>
        <main id="main" className="container">{children}</main>
        <footer>
          <div className="container">
            <p>Evidence first. Unknown remains unknown.</p>
            <nav aria-label="Trust and policy navigation">
              <Link href="/methodology">Methodology</Link>{" · "}
              <Link href="/editorial-policy">Editorial policy</Link>{" · "}
              <Link href="/security">Security</Link>{" · "}
              <Link href="/about">About</Link>
            </nav>
            <p>
              <a href="/registry.json">Public registry JSON</a>{" · "}
              <a href="/llms.txt">llms.txt</a>{" · "}
              <a href="/llms-full.txt">llms-full.txt</a>
            </p>
          </div>
        </footer>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
        />
      </body>
    </html>
  )
}
