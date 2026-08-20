import type { Metadata } from "next"
import Link from "next/link"
import { canonicalUrl, SITE } from "@/src/config/site"
import { getPublicCategoryFacets } from "@/src/lib/registry"

export const metadata: Metadata = {
  title: "MCP Server Categories",
  description: "Browse categories derived only from published, evidence-backed MCP server profiles.",
  alternates: { canonical: "/categories" },
  openGraph: { url: "/categories" },
}

export default function CategoriesPage() {
  const categories = getPublicCategoryFacets()
  const url = canonicalUrl("/categories")
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        url,
        name: "MCP Server Categories",
        description: "Categories derived only from published, evidence-backed MCP server profiles.",
        isPartOf: { "@id": `${SITE.origin}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.origin}/` },
          { "@type": "ListItem", position: 2, name: "Servers", item: canonicalUrl("/servers") },
          { "@type": "ListItem", position: 3, name: "Categories", item: url },
        ],
      },
    ],
  }

  return (
    <>
      <nav aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/servers">Servers</Link> / Categories</nav>
      <span className="badge">Derived taxonomy</span>
      <h1>Evidence-backed MCP server categories</h1>
      <p className="lead">
        Categories appear here only when at least one public server profile passes the shared evidence and publication gate. This page does not create separate indexable URLs for thin facets.
      </p>

      <div className="grid">
        {categories.map((category) => (
          <section className="card" key={category.name}>
            <h2>{category.name}</h2>
            <p>{category.count} published {category.count === 1 ? "profile" : "profiles"}</p>
            <ul>
              {category.servers.map((server) => (
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
