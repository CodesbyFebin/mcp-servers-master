import { Metadata } from "next";
import Link from "next/link";
import { PILLAR_BY_ID } from "@/src/content/pillar-registry";
import { Breadcrumbs } from "@/src/components/content/Breadcrumbs";
import { CANONICAL_ORIGIN } from "@/src/seo/breadcrumbs";

/**
 * Pillar: P68 — MCP Blog
 * Status: review (per pillar-registry). GSC has organic traffic to /blog/*
 * children (163+159+141+134 clicks) but no /blog index has been published yet.
 * This page is a truthful stub: 200 OK, noindex, no fabricated post listing.
 */
const pillar = PILLAR_BY_ID["P68"];

export const metadata: Metadata = {
  title: "MCP Blog — MCPserver.in",
  description:
    "The MCPserver.in blog index. No published posts yet — pillar P68 is in editorial review.",
  robots: { index: false, follow: true },
  alternates: { canonical: CANONICAL_ORIGIN + "/blog" },
};

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Breadcrumbs
          crumbs={[
            { label: "MCPserver.in", href: "/" },
            { label: "Blog", href: "/blog" },
          ]}
        />

        <h1 className="mt-6 mb-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
          MCP Blog
        </h1>

        <p className="mb-6 text-slate-700 dark:text-slate-300 leading-relaxed">
          The MCPserver.in blog covers announcements, deep-dives, and ecosystem
          news for the Model Context Protocol.
        </p>

        <div
          role="status"
          className="mb-8 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4"
        >
          <p className="font-medium text-amber-900 dark:text-amber-200">
            No published posts yet.
          </p>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
            Pillar <code>{pillar?.id ?? "P68"}</code> is in editorial review.
            This index page exists so deep links from search results do not
            404. Individual <code>/blog/*</code> children that already rank in
            search remain reachable through the published content registry.
          </p>
        </div>

        <p className="text-slate-600 dark:text-slate-400 text-sm">
          While editorial review is in progress, see{" "}
          <Link href="/pillars" className="text-blue-600 dark:text-blue-400 hover:underline">
            the 69-pillar directory
          </Link>{" "}
          for verified MCP coverage.
        </p>
      </div>
    </main>
  );
}
