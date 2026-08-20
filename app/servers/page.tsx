import type { Metadata } from "next"
import Link from "next/link"
import { canonicalUrl, SITE } from "@/src/config/site"
import { getPublicServerCategories, getPublicServers } from "@/src/lib/registry"

export const metadata: Metadata = {
  title: "Verified MCP Servers",
  description: "Evidence-backed Model Context Protocol server profiles with provenance and verification details.",
  alternates: { canonical: "/servers" },
  openGraph: { url: "/servers" },
}

export default function ServersPage() {
  const servers = getPublicServers()
  const categories = getPublicServerCategories()
  const url = canonicalUrl("/servers")
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        url,
        name: "Verified MCP Servers",
        description: "Evidence-backed Model Context Protocol server profiles with provenance and verification details.",
        isPartOf: { "@id": `${SITE.origin}/#website` },
      },
      {
        "@type": "ItemList",
        "@id": `${url}#servers`,
        numberOfItems: servers.length,
        itemListElement: servers.map((server, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: server.title,
          url: canonicalUrl(`/servers/${server.slug}`),
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.origin}/` },
          { "@type": "ListItem", position: 2, name: "Servers", item: url },
        ],
      },
    ],
  }

  return (
    <>
      <span className="badge">Published registry</span>
      <h1>Verified MCP servers</h1>
      <p className="lead">
        Every profile listed here satisfies the same publication and evidence contract used by static generation, the sitemap, and machine-readable feeds.
      </p>

      <section aria-labelledby="registry-summary">
        <h2 id="registry-summary">Registry summary</h2>
        <p>{servers.length} public server profiles across {categories.length} evidence-backed categories.</p>
        <p><Link href="/categories">Browse the category map</Link> · <Link href="/capabilities">Browse capability coverage</Link></p>
        <ul>
          {categories.map((category) => (
            <li key={category.name}>{category.name}: {category.count}</li>
          ))}
        </ul>
      </section>

      <div className="grid">
        {servers.map((server) => (
          <article className="card" key={server.slug}>
            <span className="badge">Verified</span>
            <h2><Link href={`/servers/${server.slug}`}>{server.title}</Link></h2>
            <p>{server.description}</p>
            <dl>
              <dt>Canonical name</dt><dd>{server.canonicalName}</dd>
              <dt>Category</dt><dd>{server.category}</dd>
              <dt>Version</dt><dd>{server.latestVerifiedVersion ?? "Unknown"}</dd>
              <dt>Capabilities</dt><dd>{server.capabilities.join(", ") || "Unknown"}</dd>
            </dl>
          </article>
        ))}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
