import { SITE, canonicalUrl } from "../../src/config/site"
import type { ServerRecord } from "../../src/data/servers"
import {
  isServerIndexable,
  type EvidenceRecord,
  type EvidenceSourceType,
  type PublicationStatus,
  type VerificationStatus,
} from "../../src/lib/indexability"

export type RegistrySourceEntry = {
  canonicalName: string
  title: string
  description: string
  category: string
  sourceUrl?: string | null
  repositoryUrl?: string | null
  websiteUrl?: string | null
  latestVerifiedVersion?: string | null
  capabilities?: readonly string[]
  updatedAt?: string | null
  publicationStatus?: PublicationStatus
  verificationStatus?: VerificationStatus
  noindex?: boolean
  evidence?: readonly EvidenceRecord[]
}

export type RegistrySource = {
  sourceUrl: string
  sourceType: EvidenceSourceType
  capturedAt: string
  verified: boolean
  canonicalName?: string
  description?: string
}

export type RegistryValidationIssue = {
  canonicalName: string
  code: "MISSING_FIELD" | "INVALID_URL" | "INVALID_DATE" | "MISSING_EVIDENCE"
  field: string
}

export type PublicationDecision = {
  canonicalName: string
  indexable: boolean
  publicationStatus: PublicationStatus
  verificationStatus: VerificationStatus
  reason: string
}

export type RegistrySyncResult = {
  records: ServerRecord[]
  publicRecords: ServerRecord[]
  rejected: Array<{ record: ServerRecord; issues: RegistryValidationIssue[] }>
  decisions: PublicationDecision[]
}

export type RegistrySyncOptions = {
  fetchImpl?: typeof fetch
  trustedSourceHosts?: readonly string[]
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function normalizeOptionalUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    url.hash = ""
    return url.toString()
  } catch {
    return null
  }
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

export class RegistryNormalizer {
  normalize(entry: RegistrySourceEntry): ServerRecord {
    const canonicalName = entry.canonicalName.trim()
    const sourceUrl = normalizeOptionalUrl(entry.sourceUrl) ?? ""
    return {
      slug: slugify(canonicalName),
      canonicalName,
      title: entry.title.trim(),
      description: entry.description.trim(),
      category: entry.category.trim(),
      sourceUrl,
      repositoryUrl: normalizeOptionalUrl(entry.repositoryUrl),
      websiteUrl: normalizeOptionalUrl(entry.websiteUrl),
      latestVerifiedVersion: entry.latestVerifiedVersion?.trim() || null,
      capabilities: [...new Set((entry.capabilities ?? []).map((item) => item.trim()).filter(Boolean))],
      updatedAt: normalizeDate(entry.updatedAt),
      publicationStatus: entry.publicationStatus ?? "draft",
      verificationStatus: entry.verificationStatus ?? "unverified",
      evidence: (entry.evidence ?? []).map((item) => ({ ...item })),
      ...(entry.noindex === undefined ? {} : { noindex: entry.noindex }),
    }
  }
}

export class RegistryDeduplicator {
  deduplicate(records: readonly ServerRecord[]): ServerRecord[] {
    const selected = new Map<string, ServerRecord>()
    for (const record of records) {
      const key = record.canonicalName.toLowerCase()
      const current = selected.get(key)
      if (!current || this.score(record) > this.score(current)) selected.set(key, record)
    }
    return [...selected.values()].sort(
      (a, b) => a.canonicalName.localeCompare(b.canonicalName) || a.slug.localeCompare(b.slug),
    )
  }

  private score(record: ServerRecord): number {
    const qualifyingEvidence = record.evidence.filter(
      (item) => item.status === "verified" || item.status === "measured",
    ).length
    return qualifyingEvidence * 100 + (record.verificationStatus === "verified" ? 10 : 0) + record.evidence.length
  }
}

export class RegistryValidator {
  validate(record: ServerRecord): RegistryValidationIssue[] {
    const issues: RegistryValidationIssue[] = []
    for (const field of ["canonicalName", "title", "description", "category", "sourceUrl"] as const) {
      if (!record[field]) issues.push({ canonicalName: record.canonicalName, code: "MISSING_FIELD", field })
    }

    for (const field of ["sourceUrl", "repositoryUrl", "websiteUrl"] as const) {
      const value = record[field]
      if (!value) continue
      try {
        const url = new URL(value)
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("unsupported protocol")
      } catch {
        issues.push({ canonicalName: record.canonicalName, code: "INVALID_URL", field })
      }
    }

    if (record.updatedAt && !/^\d{4}-\d{2}-\d{2}$/.test(record.updatedAt)) {
      issues.push({ canonicalName: record.canonicalName, code: "INVALID_DATE", field: "updatedAt" })
    }
    if (record.evidence.length === 0) {
      issues.push({ canonicalName: record.canonicalName, code: "MISSING_EVIDENCE", field: "evidence" })
    }
    return issues
  }
}

export class RegistrySyncService {
  readonly normalizer = new RegistryNormalizer()
  readonly deduplicator = new RegistryDeduplicator()
  readonly validator = new RegistryValidator()
  private readonly fetchImpl: typeof fetch
  private readonly trustedSourceHosts: Set<string>
  private latestPublicRecords: ServerRecord[] = []

  constructor(options: RegistrySyncOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.trustedSourceHosts = new Set(options.trustedSourceHosts ?? ["registry.modelcontextprotocol.io"])
  }

  ingest(entries: readonly RegistrySourceEntry[], sources: readonly RegistrySource[] = []): RegistrySyncResult {
    const normalized = entries.map((entry) => this.normalizer.normalize(entry))
    const withEvidence = normalized.map((record) => this.attachEvidence(record, sources))
    const deduplicated = this.deduplicator.deduplicate(withEvidence)
    const rejected: RegistrySyncResult["rejected"] = []
    const decisions: PublicationDecision[] = []
    const records = deduplicated.map((record) => {
      const issues = this.validator.validate(record)
      const verified = issues.length === 0 && record.evidence.some(
        (item) => item.status === "verified" || item.status === "measured",
      )
      const candidate: ServerRecord = {
        ...record,
        verificationStatus: verified ? "verified" : "unverified",
      }
      if (issues.length > 0) rejected.push({ record: candidate, issues })

      const indexable = issues.length === 0 && isServerIndexable(candidate)
      decisions.push({
        canonicalName: candidate.canonicalName,
        indexable,
        publicationStatus: candidate.publicationStatus,
        verificationStatus: candidate.verificationStatus,
        reason: indexable
          ? "published + verified + qualifying evidence + !noindex"
          : issues.length > 0
            ? `validation failed: ${issues.map((issue) => issue.code).join(", ")}`
            : "publication authority rejected record",
      })
      return candidate
    })

    const publicRecords = records.filter(isServerIndexable)
    this.latestPublicRecords = publicRecords
    return { records, publicRecords, rejected, decisions }
  }

  async ingestFromSource(sourceUrl: string): Promise<RegistrySyncResult> {
    const url = new URL(sourceUrl)
    if (url.protocol !== "https:") throw new Error("Registry sources must use HTTPS")

    const response = await this.fetchImpl(url)
    if (!response.ok) throw new Error(`Registry source fetch failed: ${response.status}`)
    const payload = (await response.json()) as unknown
    const entries = this.extractEntries(payload).map((entry) => ({ ...entry, sourceUrl: entry.sourceUrl ?? url.toString() }))
    const trusted = this.trustedSourceHosts.has(url.hostname)
    return this.ingest(entries, [{
      sourceUrl: url.toString(),
      sourceType: "registry",
      capturedAt: new Date().toISOString().slice(0, 10),
      verified: trusted,
      description: trusted ? "Fetched from configured trusted registry host." : "Fetched from untrusted registry source; evidence remains unverified.",
    }])
  }

  generateSitemapEntries(records: readonly ServerRecord[] = this.latestPublicRecords) {
    return records.filter(isServerIndexable).map((record) => ({
      loc: canonicalUrl(`/servers/${record.slug}`),
      ...(record.updatedAt ? { lastmod: record.updatedAt } : {}),
    }))
  }

  generateRobotsTxt(): string {
    return [`User-agent: *`, `Allow: /`, `Sitemap: ${SITE.origin}/sitemap.xml`, ""].join("\n")
  }

  generateSitemapXml(records: readonly ServerRecord[] = this.latestPublicRecords): string {
    const entries = this.generateSitemapEntries(records)
      .map((entry) => `  <url><loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""}</url>`)
      .join("\n")
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
  }

  private attachEvidence(record: ServerRecord, sources: readonly RegistrySource[]): ServerRecord {
    const attached = sources
      .filter((source) => !source.canonicalName || source.canonicalName === record.canonicalName || source.sourceUrl === record.sourceUrl)
      .map<EvidenceRecord>((source) => ({
        sourceUrl: source.sourceUrl,
        sourceType: source.sourceType,
        capturedAt: source.capturedAt,
        status: source.verified ? "verified" : "unverified",
        description: source.description ?? null,
      }))

    const evidence = [...record.evidence]
    for (const item of attached) {
      if (!evidence.some((existing) => existing.sourceUrl === item.sourceUrl && existing.capturedAt === item.capturedAt)) {
        evidence.push(item)
      }
    }
    return { ...record, evidence }
  }

  private extractEntries(payload: unknown): RegistrySourceEntry[] {
    if (Array.isArray(payload)) return payload as RegistrySourceEntry[]
    if (payload && typeof payload === "object" && "servers" in payload && Array.isArray((payload as { servers?: unknown }).servers)) {
      return (payload as { servers: RegistrySourceEntry[] }).servers
    }
    throw new Error("Registry source payload must be an array or an object with a servers array")
  }
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")
}

export function quickSync(entries: readonly RegistrySourceEntry[], sources: readonly RegistrySource[] = []): RegistrySyncResult {
  return new RegistrySyncService().ingest(entries, sources)
}
