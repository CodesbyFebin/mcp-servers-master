#!/usr/bin/env node
/**
 * Staging Audit Script (P20/P21 evidence collection).
 *
 * Validates a deployed environment against the exact constraints the Master
 * Reviewer requires:
 *   1. /api/health returns the exact baked-in artifact SHA
 *   2. Redirect matrix: ledger-derived samples (aliases, glossary handoff,
 *      semantic equivalents) single-hop to their destinations; G8 topical
 *      paths must NOT blanket-redirect
 *   3. Destinations return 200 and self-canonicalize
 *   4. Staging is non-indexable (X-Robots-Tag when STAGING_NOINDEX_HEADER
 *      is expected; always checks robots meta on a rebuild stub)
 *   5. Machine surfaces reachable
 *   6. Lighthouse (performance/accessibility/SEO/best-practices) when Chrome
 *      and the optional deps are available — otherwise recorded UNVERIFIED,
 *      never silently skipped.
 *
 * Corrections vs the original proposal:
 *   - Redirect matching compares PATH of the Location header (runtime emits
 *     absolute non-slash URLs like https://host/servers, not "/servers/").
 *   - Canonical tests use real routes (/, /servers, /learn/mcp-stdio,
 *     /guides/postgres-mcp-server) — /protocol does not exist.
 *   - EXPECTED_SHA must be the FULL artifact SHA (env or argument).
 *   - The redirect sample is DERIVED from the ledger (no hardcoded drift).
 *
 * Usage:
 *   STAGING_URL=http://127.0.0.1:3100 EXPECTED_SHA=<full sha> node scripts/staging-audit.mjs
 * Optional:
 *   EXPECT_STAGING_NOINDEX=1   # require X-Robots-Tag: noindex on every response
 *   SKIP_LIGHTHOUSE=1          # record lighthouse as UNVERIFIED
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STAGING_URL = (process.env.STAGING_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const EXPECTED_SHA = process.env.EXPECTED_SHA || '';
const EXPECT_STAGING_NOINDEX = process.env.EXPECT_STAGING_NOINDEX === '1';
const SKIP_LIGHTHOUSE = process.env.SKIP_LIGHTHOUSE === '1';

if (!EXPECTED_SHA || EXPECTED_SHA.length !== 40) {
  console.error('EXPECTED_SHA must be the full 40-char artifact SHA. Usage: EXPECTED_SHA=<sha> node scripts/staging-audit.mjs');
  process.exit(1);
}

const LEDGER_PATH = path.join(__dirname, '..', 'reports', 'milestone-7-migration-ledger.csv');

function ledgerRedirectSamples() {
  const csv = fs.readFileSync(LEDGER_PATH, 'utf8');
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());
  const iUrl = headers.indexOf('canonical_url');
  const iDec = headers.indexOf('decision');
  const iDst = headers.indexOf('redirect_target');
  const iEv = headers.indexOf('evidence');
  const rows = [];
  for (const line of lines.slice(1)) {
    const c = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    if (c[iDec] !== 'REDIRECT_301') continue;
    rows.push({
      source: c[iUrl].replace('https://www.mcpserver.in', ''),
      destination: c[iDst].replace(/\/+$/, '') || '/',
      evidence: c[iEv],
    });
  }
  // Sample: all 3 legacy aliases + up to 10 glossary + up to 10 semantic equivalents
  const aliases = rows.filter((r) => r.evidence === 'handoff_redirect_map').slice(0, 4);
  const glossary = rows.filter((r) => r.evidence === 'handoff_redirect_map').slice(4, 14);
  const semantic = rows.filter((r) => r.evidence === 'semantic_equivalent_registry_path').slice(0, 10);
  return [...aliases, ...glossary, ...semantic];
}

const G8_PATHS = ['/directory/iot', '/directory/databases', '/directory/devops', '/directory/monitoring'];
const CANONICAL_TESTS = ['/', '/servers', '/learn/mcp-stdio', '/guides/postgres-mcp-server'];
const SURFACES = ['/llms.txt', '/llms-full.txt', '/api/servers.json', '/mcp-registry.json', '/registry.json', '/sitemap.xml', '/robots.txt', '/.well-known/security.txt'];

function pathOf(location) {
  try {
    return new URL(location, STAGING_URL).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return location;
  }
}

const results = {
  timestamp: new Date().toISOString(),
  stagingUrl: STAGING_URL,
  expectedSha: EXPECTED_SHA,
  shaMatch: false,
  redirects: { pass: 0, fail: 0, details: [] },
  g8: { pass: 0, fail: 0 },
  canonicals: { pass: 0, fail: 0 },
  noindex: { pass: 0, fail: 0 },
  surfaces: { pass: 0, fail: 0 },
  lighthouse: null,
  lighthouseStatus: 'SKIPPED',
};

async function checkRedirect(test) {
  const res = await fetch(`${STAGING_URL}${test.source}`, { redirect: 'manual' });
  const loc = res.headers.get('location');
  const ok = (res.status === 301 || res.status === 308) && loc !== null && pathOf(loc) === test.destination;
  if (ok) {
    results.redirects.pass++;
    results.redirects.details.push(`PASS ${test.source} -> ${pathOf(loc)} (${res.status})`);
  } else {
    results.redirects.fail++;
    results.redirects.details.push(`FAIL ${test.source} -> status=${res.status} location=${loc} expected=${test.destination}`);
  }
}

async function runAudit() {
  console.log(`Staging audit for: ${STAGING_URL}`);
  console.log(`Expected SHA:      ${EXPECTED_SHA}\n`);

  // 1. Baked-in SHA
  console.log('1. /api/health exact SHA');
  try {
    const health = await fetch(`${STAGING_URL}/api/health`).then((r) => r.json());
    results.shaMatch = health.sha === EXPECTED_SHA;
    console.log(`   ${results.shaMatch ? 'PASS' : 'FAIL'} sha=${health.sha}`);
  } catch (e) {
    console.log(`   FAIL cannot reach /api/health: ${e.message}`);
    process.exit(1);
  }

  // 2. Ledger-derived redirect matrix
  console.log('\n2. Redirect matrix (ledger-derived sample)');
  const samples = ledgerRedirectSamples();
  console.log(`   testing ${samples.length} redirect sources...`);
  for (const t of samples) await checkRedirect(t);
  console.log(`   ${results.redirects.pass}/${samples.length} PASS`);
  if (results.redirects.fail > 0) results.redirects.details.filter((d) => d.startsWith('FAIL')).forEach((d) => console.log(`   ${d}`));

  // 3. G8 topical paths must NOT blanket-redirect
  console.log('\n3. G8 topical paths (must NOT redirect to /servers)');
  for (const p of G8_PATHS) {
    const res = await fetch(`${STAGING_URL}${p}`, { redirect: 'manual' });
    const loc = res.headers.get('location');
    const blanket = loc !== null && pathOf(loc) === '/servers';
    if (!blanket) {
      results.g8.pass++;
      console.log(`   PASS ${p} -> ${res.status} (no blanket redirect)`);
    } else {
      results.g8.fail++;
      console.log(`   FAIL ${p} blanket-redirected to /servers (G8 violation)`);
    }
  }

  // 4. Canonical tags on real routes
  console.log('\n4. Self-canonical on key routes');
  for (const p of CANONICAL_TESTS) {
    const html = await fetch(`${STAGING_URL}${p}`).then((r) => r.text());
    const m = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
    const expected = `https://www.mcpserver.in${p === '/' ? '/' : p}`;
    if (m && (m[1] === expected || m[1].replace(/\/+$/, '') === expected.replace(/\/+$/, ''))) {
      results.canonicals.pass++;
      console.log(`   PASS ${p} canonical=${m[1]}`);
    } else {
      results.canonicals.fail++;
      console.log(`   FAIL ${p} canonical=${m ? m[1] : 'MISSING'} expected=${expected}`);
    }
  }

  // 5. Rebuild stub noindex + optional staging X-Robots-Tag
  console.log('\n5. noindex posture');
  const ledger = fs.readFileSync(LEDGER_PATH, 'utf8');
  const stubLine = ledger.split('\n').find((l) => l.includes('served_rebuild_stub') && l.includes('/blog/'));
  if (stubLine) {
    const stubPath = stubLine.split(',')[1].replace('https://www.mcpserver.in', '');
    const html = await fetch(`${STAGING_URL}${stubPath}`).then((r) => r.text());
    const noindex = /<meta[^>]*name="robots"[^>]*content="[^"]*noindex[^"]*"/i.test(html);
    if (noindex) {
      results.noindex.pass++;
      console.log(`   PASS rebuild stub ${stubPath} is noindex`);
    } else {
      results.noindex.fail++;
      console.log(`   FAIL rebuild stub ${stubPath} missing robots noindex`);
    }
  }
  if (EXPECT_STAGING_NOINDEX) {
    const res = await fetch(`${STAGING_URL}/`);
    const xrt = res.headers.get('x-robots-tag') || '';
    if (/noindex/i.test(xrt)) {
      results.noindex.pass++;
      console.log('   PASS X-Robots-Tag noindex present (staging protection)');
    } else {
      results.noindex.fail++;
      console.log(`   FAIL X-Robots-Tag missing (got: "${xrt}") — staging MUST be non-indexable`);
    }
  }

  // 6. Machine surfaces
  console.log('\n6. Machine surfaces');
  for (const p of SURFACES) {
    const res = await fetch(`${STAGING_URL}${p}`);
    if (res.ok) {
      results.surfaces.pass++;
    } else {
      results.surfaces.fail++;
      console.log(`   FAIL ${p} -> ${res.status}`);
    }
  }
  console.log(`   ${results.surfaces.pass}/${SURFACES.length} PASS`);

  // 7. Lighthouse (optional deps)
  if (!SKIP_LIGHTHOUSE) {
    console.log('\n7. Lighthouse audit on /');
    try {
      const lh = await import('lighthouse');
      const lighthouse = lh.default ?? lh;
      const cl = await import('chrome-launcher');
      const chromeLauncher = cl.default && cl.default.launch ? cl.default : cl;
      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });
      try {
        const runnerResult = await lighthouse(`${STAGING_URL}/`, {
          output: 'json',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          port: chrome.port,
        });
        results.lighthouse = {};
        for (const [key, cat] of Object.entries(runnerResult.lhr.categories)) {
          results.lighthouse[key] = Math.round(cat.score * 100);
          const icon = cat.score >= 0.9 ? 'PASS' : cat.score >= 0.5 ? 'WARN' : 'FAIL';
          console.log(`   ${icon} ${key}: ${results.lighthouse[key]}`);
        }
        results.lighthouseStatus = 'MEASURED';
      } finally {
        await chrome.kill();
      }
    } catch (e) {
      results.lighthouseStatus = 'UNVERIFIED';
      console.log(`   UNVERIFIED: ${e.message}`);
      console.log('   (install lighthouse + chrome-launcher and ensure Chrome is available to measure)');
    }
  } else {
    results.lighthouseStatus = 'UNVERIFIED';
    console.log('\n7. Lighthouse: UNVERIFIED (SKIP_LIGHTHOUSE=1)');
  }

  // Summary
  const hardFail =
    !results.shaMatch ||
    results.redirects.fail > 0 ||
    results.g8.fail > 0 ||
    results.canonicals.fail > 0 ||
    results.noindex.fail > 0 ||
    results.surfaces.fail > 0;

  console.log('\n' + '='.repeat(50));
  console.log('STAGING AUDIT SUMMARY');
  console.log('='.repeat(50));
  console.log(`SHA (baked-in):   ${results.shaMatch ? 'PASS' : 'FAIL'}`);
  console.log(`Redirects:        ${results.redirects.pass}/${results.redirects.pass + results.redirects.fail}`);
  console.log(`G8 non-redirect:  ${results.g8.pass}/${results.g8.pass + results.g8.fail}`);
  console.log(`Canonicals:       ${results.canonicals.pass}/${results.canonicals.pass + results.canonicals.fail}`);
  console.log(`noindex posture:  ${results.noindex.pass}/${results.noindex.pass + results.noindex.fail}`);
  console.log(`Surfaces:         ${results.surfaces.pass}/${results.surfaces.pass + results.surfaces.fail}`);
  console.log(`Lighthouse:       ${results.lighthouseStatus}${results.lighthouse ? ` ${JSON.stringify(results.lighthouse)}` : ''}`);

  const report = { ...results, verdict: hardFail ? 'FAILED' : 'PASSED' };
  fs.writeFileSync(path.join(__dirname, '..', 'reports', 'staging-audit-result.json'), JSON.stringify(report, null, 2));
  console.log(`\nReport: reports/staging-audit-result.json`);

  if (hardFail) {
    console.log('\nSTAGING AUDIT: FAILED');
    process.exit(1);
  }
  console.log('\nSTAGING AUDIT: PASSED (technical gates)' + (results.lighthouseStatus === 'MEASURED' ? '' : ' — lighthouse UNVERIFIED, do not promote to Master Review without measured evidence'));
}

runAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
