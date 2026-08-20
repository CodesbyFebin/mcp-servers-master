import type { Metadata } from "next"
import Link from "next/link"
import { canonicalUrl, SITE } from "@/src/config/site"
import { getPublicCapabilityFacets } from "@/src/lib/registry"

export const metadata: Metadata = {
  title: "MCP Server Capabilities",
  description: "Browse capabilities derived only from published, evidence-backed MCP server profiles.",
  alternates: { canonical: "/capabilities" },
  openGraph: { url: "/capabilities" },
}

export default function CapabilitiesPage() {
  const capabilities = getPublicCapabilityFacets()
  const url = canonicalUrl("/capabilities")
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        url,
        name: "MCP Server Capabilities",
        description: "Capabilities derived only from published, evidence-backed MCP server profiles.",
        isPartOf: { "@id": `${SITE.origin}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.origin}/` },
          { "@type": "ListItem", position: 2, name: "Servers", item: canonicalUrl("/servers") },
          { "@type": "ListItem", position: 3, name: "Capabilities", item: url },
        ],
      },
    ],
  }

  return (
    <>
      <nav aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/servers">Servers</Link> / Capabilities</nav>
      <span className="badge">Derived taxonomy</span>
      <h1>Evidence-backed MCP server capabilities</h1>
      <p className="lead">
        Capability labels are emitted only from public records that pass the evidence gate. Unknown capabilities remain unknown, and no per-capability crawl pages are generated here.
      </p>

      <div className="grid">
        {capabilities.map((capability) => (
          <section className="card" key={capability.name}>
            <h2>{capability.name}</h2>
            <p>{capability.count} published {capability.count === 1 ? "profile" : "profiles"}</p>
            <ul>
              {capability.servers.map((server) => (
                <li key={server.slug}><Link href={`/servers/${server.slug}`}>{server.title}</Link></li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
