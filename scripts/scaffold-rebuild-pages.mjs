#!/usr/bin/env node
/**
 * Scaffolds Next.js page stubs for all REBUILD decisions in the migration
 * ledger (P23 editorial gate).
 *
 * Corrected for the actual ledger schema:
 *   ledger file: reports/milestone-7-migration-ledger.csv
 *   path column: canonical_url (absolute origin + path)
 *   title column: family_slug
 *
 * Each stub: 200 + noindex (noindex until substantive content is authored —
 * avoids thin-content indexing AND avoids a 404 on a decided-REBUILD URL),
 * self-canonical, zero fabricated content. Idempotent: existing pages are
 * never overwritten.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = path.join(__dirname, '..', 'reports', 'milestone-7-migration-ledger.csv');
const APP_DIR = path.join(__dirname, '..', 'app');

if (!fs.existsSync(LEDGER_PATH)) {
  console.error(`Ledger not found: ${LEDGER_PATH}`);
  process.exit(1);
}

const csv = fs.readFileSync(LEDGER_PATH, 'utf8');
const lines = csv.trim().split('\n');
const headers = lines[0].split(',').map((h) => h.trim());
const iUrl = headers.indexOf('canonical_url');
const iDec = headers.indexOf('decision');
const iEv = headers.indexOf('evidence');
const iSlug = headers.indexOf('family_slug');
if (iUrl === -1 || iDec === -1) {
  console.error(`Unexpected ledger schema: ${headers.join(',')}`);
  process.exit(1);
}

function titleize(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const rebuildRows = [];
for (const line of lines.slice(1)) {
  const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
  if (values[iDec] !== 'REBUILD') continue;
  const rawPath = values[iUrl].replace('https://www.mcpserver.in', '');
  rebuildRows.push({ rawPath, slug: values[iSlug] || '', evidence: values[iEv] || '' });
}

console.log(`Found ${rebuildRows.length} REBUILD paths to scaffold.`);

let createdCount = 0;
let skippedCount = 0;

for (const { rawPath, slug, evidence } of rebuildRows) {
  const cleanPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
  if (!cleanPath || cleanPath.endsWith('/')) {
    console.log(`  ⚠️  Skipping non-page path: ${rawPath}`);
    continue;
  }
  const dirPath = path.join(APP_DIR, cleanPath);
  const filePath = path.join(dirPath, 'page.tsx');

  if (fs.existsSync(filePath)) {
    console.log(`  ⏭️  Skipped (exists): ${rawPath}`);
    skippedCount++;
    continue;
  }

  fs.mkdirSync(dirPath, { recursive: true });

  const title = titleize(slug || cleanPath.split('/').pop()) || 'MCP Resource';
  const safeTitle = title.replace(/'/g, "\\'");

  const pageContent = `/**
 * AUTO-GENERATED REBUILD STUB — do not hand-edit the header; author content below.
 * Path: ${rawPath}
 * Decision: REBUILD (migration ledger evidence: ${evidence})
 * Status: awaiting substantive editorial content.
 *
 * Publication contract: 200 + noindex until real content is authored. The
 * noindex prevents thin-content indexing; the 200 preserves the URL while
 * its rebuild is pending. Delete this file (replace with the authored page)
 * when the real content lands, then flip robots to index:true.
 */

import type { Metadata } from "next";

export const dynamic = "force-static";

const PATH = "${rawPath}";
const TITLE = "${safeTitle}";

export function generateMetadata(): Metadata {
  return {
    title: TITLE,
    description:
      "This resource is being rebuilt to meet MCPserver.in evidence-led editorial standards. Verified documentation will be published here.",
    alternates: {
      canonical: \`https://www.mcpserver.in\${PATH}\`,
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
`;

  fs.writeFileSync(filePath, pageContent, 'utf8');
  createdCount++;
}

console.log(`\nCreated ${createdCount}, skipped ${skippedCount} of ${rebuildRows.length} REBUILD paths.`);
console.log('Run `npx next build` to verify all new routes compile.');
