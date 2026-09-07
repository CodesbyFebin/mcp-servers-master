import { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/src/components/content/Breadcrumbs";
import { CANONICAL_ORIGIN } from "@/src/seo/breadcrumbs";

/**
 * /state-of-mcp — placeholder for the annual ecosystem report.
 *
 * No pillar entry exists for this path in pillar-registry. A real
 * "State of MCP" report requires verified ecosystem measurements (server
 * counts, transport adoption, implementation coverage), which are not yet
 * collected under the zero-fabrication contract. This page exists so the
 * path resolves with 200 and is noindex, so it cannot be mistaken for a
 * published report.
 */
export const metadata: Metadata = {
  title: "State of MCP — MCPserver.in",
  description:
    "Placeholder for the State of MCP ecosystem report. No verified measurements exist yet; see the pillar directory for current scope.",
  robots: { index: false, follow: true },
  alternates: { canonical: CANONICAL_ORIGIN + "/state-of-mcp" },
};

export default function StateOfMcpPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Breadcrumbs
          crumbs={[
            { label: "MCPserver.in", href: "/" },
            { label: "State of MCP", href: "/state-of-mcp" },
          ]}
        />

        <h1 className="mt-6 mb-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
          State of MCP
        </h1>

        <p className="mb-6 text-slate-700 dark:text-slate-300 leading-relaxed">
          A measured snapshot of the Model Context Protocol ecosystem: server
          count, transport adoption, and implementation coverage over time.
        </p>

        <div
          role="status"
          className="mb-8 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4"
        >
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Report not yet published.
          </p>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
            Producing this report requires verified measurements that are not
            yet collected under our zero-fabrication contract. The page
            exists so the path resolves; nothing here should be cited as a
            measurement of the ecosystem.
          </p>
        </div>

        <p className="text-slate-600 dark:text-slate-400 text-sm">
          For the current authoritative scope, see{" "}
          <Link href="/pillars" className="text-blue-600 dark:text-blue-400 hover:underline">
            the 69-pillar directory
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
