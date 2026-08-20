import type { EvidenceRecord, PublicationStatus, VerificationStatus } from "@/src/lib/indexability"

export type ServerRecord = {
  slug: string
  canonicalName: string
  title: string
  description: string
  category: string
  repositoryUrl: string | null
  sourceUrl: string
  websiteUrl: string | null
  latestVerifiedVersion: string | null
  capabilities: string[]
  publicationStatus: PublicationStatus
  verificationStatus: VerificationStatus
  evidence: EvidenceRecord[]
  updatedAt: string | null
  noindex?: boolean
}

const SNAPSHOT_DATE = "2026-08-15"

function registryEvidence(sourceUrl: string): EvidenceRecord[] {
  return [
    {
      sourceUrl,
      sourceType: "registry",
      status: "verified",
      capturedAt: SNAPSHOT_DATE,
      description: "Record captured from the Official MCP Registry seed snapshot migrated from MCP-SERVER.",
    },
  ]
}

const seeds = [
  {
    canonicalName: "ac.inference.sh/mcp",
    title: "inference.sh",
    description: "Run AI models and compose agent workflows through a remote MCP server.",
    category: "AI Models",
    repositoryUrl: null,
    sourceUrl: "https://registry.modelcontextprotocol.io/?q=ac.inference.sh%2Fmcp",
    websiteUrl: null,
    latestVerifiedVersion: "2.0.1",
    capabilities: ["streamable-http"],
    updatedAt: "2026-07-27",
  },
  {
    canonicalName: "ac.tandem/docs-mcp",
    title: "Tandem Docs MCP",
    description: "Remote MCP server for Tandem documentation, install guides, SDKs, workflows, and agent setup help.",
    category: "Documentation",
    repositoryUrl: "https://github.com/frumu-ai/tandem",
    sourceUrl: "https://registry.modelcontextprotocol.io/?q=ac.tandem%2Fdocs-mcp",
    websiteUrl: "https://tandem.ac/docs-mcp",
    latestVerifiedVersion: "0.3.2",
    capabilities: ["streamable-http"],
    updatedAt: "2026-04-22",
  },
  {
    canonicalName: "ag.hood/name-service",
    title: ".hood Name Service",
    description: "Resolve .hood names on Robinhood Chain, including forward and reverse lookups, text records, availability, and pricing.",
    category: "Blockchain",
    repositoryUrl: null,
    sourceUrl: "https://registry.modelcontextprotocol.io/?q=ag.hood%2Fname-service",
    websiteUrl: "https://www.hood.ag/docs",
    latestVerifiedVersion: "0.1.0",
    capabilities: ["streamable-http"],
    updatedAt: "2026-07-10",
  },
  {
    canonicalName: "agency.goji/goji",
    title: "Goji",
    description: "AEO, SEO, web, and brand answers sourced from the publisher's glossary, guides, and pricing.",
    category: "Marketing",
    repositoryUrl: "https://github.com/goji-agency/website",
    sourceUrl: "https://registry.modelcontextprotocol.io/?q=agency.goji%2Fgoji",
    websiteUrl: "https://goji.agency",
    latestVerifiedVersion: "1.0.0",
    capabilities: ["streamable-http"],
    updatedAt: "2026-08-03",
  },
  {
    canonicalName: "agency.kesey/pretrip",
    title: "Pre-Trip Compliance Scanner",
    description: "Screen regulated-health marketing copy against source-cited rulesets.",
    category: "Compliance",
    repositoryUrl: null,
    sourceUrl: "https://registry.modelcontextprotocol.io/?q=agency.kesey%2Fpretrip",
    websiteUrl: "https://scan.kesey.agency/developers/",
    latestVerifiedVersion: "1.0.1",
    capabilities: ["stdio", "npm"],
    updatedAt: "2026-07-26",
  },
  {
    canonicalName: "agency.lona/trading",
    title: "Lona Trading MCP",
    description: "Trading strategy development with backtesting, market data, and portfolio analysis.",
    category: "Finance",
    repositoryUrl: "https://github.com/mindsightventures/lona",
    sourceUrl: "https://registry.modelcontextprotocol.io/?q=agency.lona%2Ftrading",
    websiteUrl: "https://lona.agency",
    latestVerifiedVersion: "2.0.0",
    capabilities: ["streamable-http"],
    updatedAt: "2026-02-24",
  },
  {
    canonicalName: "ai.abmeter/abmeter",
    title: "ABMeter",
    description: "Feature flagging and A/B testing with AI-first experimentation workflows.",
    category: "Developer Tools",
    repositoryUrl: "https://github.com/abmeter/abmeter",
    sourceUrl: "https://registry.modelcontextprotocol.io/?q=ai.abmeter%2Fabmeter",
    websiteUrl: "https://abmeter.ai",
    latestVerifiedVersion: "0.1.0",
    capabilities: ["streamable-http"],
    updatedAt: "2026-04-19",
  },
  {
    canonicalName: "ai.adeu/adeu",
    title: "Adeu",
    description: "Automated DOCX redlining engine exposed through an MCP package.",
    category: "Documents",
    repositoryUrl: "https://github.com/dealfluence/adeu",
    sourceUrl: "https://registry.modelcontextprotocol.io/?q=ai.adeu%2Fadeu",
    websiteUrl: null,
    latestVerifiedVersion: "1.7.1",
    capabilities: ["stdio", "npm"],
    updatedAt: "2026-05-16",
  },
] as const

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export const serverRecords: ServerRecord[] = seeds.map((seed) => ({
  ...seed,
  slug: slugify(seed.canonicalName),
  publicationStatus: "published",
  verificationStatus: "verified",
  evidence: registryEvidence(seed.sourceUrl),
  capabilities: [...seed.capabilities],
}))
