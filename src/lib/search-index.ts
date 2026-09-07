import { getIndexableEntries, type RegistryEntry } from "@/content/content-registry";
import { getIndexableServers } from "@/content/server-registry";

/**
 * /search index + matching logic (P5).
 *
 * Doctrine:
 * - The index is built ONLY from public indexable cohorts:
 *   getIndexableEntries() (published, not noindex) + getIndexableServers()
 *   (isServerIndexable()). Raw editorial inventory and unverified server
 *   entities must never appear.
 * - Results expose: title, type, snippet, canonical URL. Verification state
 *   is surfaced for servers.
 * - No fabricated fields: everything is projected from the registries.
 */

export interface SearchDoc {
  title: string;
  type: string;
  snippet: string;
  url: string;
  /** Only set for server docs: "verified" | "not verified" */
  verification?: string;
  /** Internal lowercase text used for matching (not rendered). */
  text: string;
}

function entryText(entry: RegistryEntry): string {
  const parts = [
    entry.h1,
    entry.metaDescription,
    ...(entry.sections ?? []).map((s) => `${s.heading ?? ""} ${s.markdown ?? ""}`),
    ...(entry.faq ?? []).map((f) => `${f.question} ${f.answer}`),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function snippetFrom(text: string, q: string, fallback: string): string {
  if (!q) return fallback;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return fallback;
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + q.length + 120);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

export function buildSearchIndex(): SearchDoc[] {
  const editorial: SearchDoc[] = getIndexableEntries().map((entry) => ({
    title: entry.h1,
    type: entry.type,
    snippet: entry.metaDescription,
    url: entry.indexPath,
    text: entryText(entry),
  }));

  const servers: SearchDoc[] = getIndexableServers().map((server) => ({
    title: server.name,
    type: "server",
    snippet: server.description,
    url: server.indexPath,
    verification: server.isVerified ? "verified" : "not verified",
    text: [server.name, server.description, ...server.tags]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));

  return [...servers, ...editorial];
}

export interface SearchResult extends SearchDoc {
  score: number;
}

/** Tokenized scoring: exact phrase in title > tokens in title > tokens in body. */
export function searchDocs(docs: SearchDoc[], query: string, limit = 30): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);

  const results: SearchResult[] = [];
  for (const doc of docs) {
    const title = doc.title.toLowerCase();
    let score = 0;
    if (title.includes(q)) score += 100;
    for (const t of tokens) {
      if (title.includes(t)) score += 10;
      if (doc.text.includes(t)) score += 1;
    }
    if (score > 0) results.push({ ...doc, score });
  }

  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}

export { snippetFrom };
