import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { canonicalUrl, SITE } from "@/src/config/site"
import { serverRecords } from "@/src/data/servers"
import { isPublicIndexable } from "@/src/lib/indexability"

export function generateStaticParams() {
  return serverRecords.filter(isPublicIndexable).map((server) => ({ slug: server.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const server = serverRecords.find((item) => item.slug === slug && isPublicIndexable(item))
  if (!server) return {}

  const path = `/servers/${server.slug}`
  return {
    title: server.title,
    description: server.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: server.title,
      description: server.description,
    },
  }
}

export default async function ServerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const server = serverRecords.find((item) => item.slug === slug && isPublicIndexable(item))
  if (!server) notFound()

  const url = canonicalUrl(`/servers/${server.slug}`)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: server.title,
        description: server.description,
        isPartOf: { "@id": `${SITE.origin}/#website` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}#software`,
        name: server.title,
        description: server.description,
        applicationCategory: "DeveloperApplication",
        url: server.websiteUrl ?? url,
        softwareVersion: server.latestVerifiedVersion ?? undefined,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.origin}/` },
          { "@type": "ListItem", position: 2, name: "Servers", item: `${SITE.origin}/servers` },
          { "@type": "ListItem", position: 3, name: server.title, item: url },
        ],
      },
    ],
  }

  return (
    <>
      <nav aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/servers">Servers</Link> / {server.title}</nav>
      <span className="badge">Verified</span>
      <h1>{server.title}</h1>
      <p className="lead">{server.description}</p>

      <h2 id="capabilities">Capabilities and identity</h2>
      <dl>
        <dt>Canonical name</dt><dd>{server.canonicalName}</dd>
        <dt>Category</dt><dd>{server.category}</dd>
        <dt>Verified version</dt><dd>{server.latestVerifiedVersion ?? "Unknown"}</dd>
        <dt>Capabilities</dt><dd>{server.capabilities.join(", ") || "Unknown"}</dd>
        <dt>Repository</dt><dd>{server.repositoryUrl ? <a href={server.repositoryUrl}>Repository</a> : "Unknown"}</dd>
        <dt>Website</dt><dd>{server.websiteUrl ? <a href={server.websiteUrl}>Website</a> : "Unknown"}</dd>
      </dl>

      <h2 id="evidence">Evidence</h2>
      <table>
        <thead><tr><th>Source</th><th>Type</th><th>Status</th><th>Captured</th></tr></thead>
        <tbody>
          {server.evidence.map((item) => (
            <tr key={`${item.sourceUrl}-${item.capturedAt}`}>
              <td><a href={item.sourceUrl}>Source record</a></td>
              <td>{item.sourceType}</td>
              <td>{item.status}</td>
              <td>{item.capturedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="limitations">Limitations</h2>
      <p>
        Verification here means the listed facts are backed by the attached source record. It is not a security audit, uptime guarantee, endorsement, or claim that every possible capability has been tested.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
