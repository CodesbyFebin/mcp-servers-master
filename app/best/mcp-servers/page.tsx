/**
 * AUTO-GENERATED REBUILD STUB — do not hand-edit the header; author content below.
 * Path: /best/mcp-servers
 * Decision: REBUILD (migration ledger evidence: legacy_content_not_ported_search_equity)
 * Status: awaiting substantive editorial content.
 *
 * Publication contract: 200 + noindex until real content is authored. The
 * noindex prevents thin-content indexing; the 200 preserves the URL while
 * its rebuild is pending. Delete this file (replace with the authored page)
 * when the real content lands, then flip robots to index:true.
 */

import type { Metadata } from "next";

export const dynamic = "force-static";

const PATH = "/best/mcp-servers";
const TITLE = "Mcp Servers";

export function generateMetadata(): Metadata {
  return {
    title: TITLE,
    description:
      "This resource is being rebuilt to meet MCPserver.in evidence-led editorial standards. Verified documentation will be published here.",
    alternates: {
      canonical: `https://www.mcpserver.in${PATH}`,
    },
    robots: {
      index: false, // noindex until substantive content is authored
      follow: true,
    },
  };
}

export default function RebuildStubPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight mb-4 text-slate-900 dark:text-slate-100">
        {TITLE}
      </h1>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200 max-w-2xl">
        <p className="font-semibold">Being rebuilt</p>
        <p className="text-sm mt-1">
          This page is scheduled for rebuild under the MCPserver.in editorial
          gate. It returns noindex while the verified content is authored —
          nothing on this page is fabricated.
        </p>
      </div>
    </main>
  );
}
