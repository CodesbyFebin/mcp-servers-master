import { Metadata } from "next";
import Link from "next/link";
import { getIndexableServers } from "@/src/content/server-registry";
import { Breadcrumbs } from "@/src/components/content/Breadcrumbs";
import { CANONICAL_ORIGIN } from "@/src/seo/breadcrumbs";

/**
 * /integrations — placeholder hub.
 *
 * No pillar entry exists for this path in pillar-registry. Rather than invent
 * a pillar ID or fabricate a list of integrations, this page honestly reports
 * the current state: the only verified integration surface is the server
 * registry. Deep links from external sources can reach it here instead of
 * hitting a 404. The page is noindex so it does not compete with the
 * canonical /servers page.
 */
export const metadata: Metadata = {
  title: "MCP Integrations — MCPserver.in",
  description:
    "Placeholder for the MCP integrations hub. The verified integration list is the server registry at /servers.",
  robots: { index: false, follow: true },
  alternates: { canonical: CANONICAL_ORIGIN + "/integrations" },
};

export default function IntegrationsPage() {
  const servers = getIndexableServers();

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Breadcrumbs
          crumbs={[
            { label: "MCPserver.in", href: "/" },
            { label: "Integrations", href: "/integrations" },
          ]}
        />

        <h1 className="mt-6 mb-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
          MCP Integrations
        </h1>

        <p className="mb-6 text-slate-700 dark:text-slate-300 leading-relaxed">
          The MCPserver.in integrations hub will list verified third-party
          integrations grouped by capability. The authoritative source for
          integration-level evidence is the server registry.
        </p>

        <div
          role="status"
          className="mb-8 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4"
        >
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Hub is in planning; no verified integration directory exists yet.
          </p>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
            {servers.length} verified server entries are available today at{" "}
            <Link href="/servers" className="underline">
              /servers
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
