/**
 * MCPserver.in — 69-Pillar Authority Contract
 *
 * This is the canonical information-architecture contract for the public
 * knowledge graph. The contract is:
 *
 *   6 governed groups × 10 primary pillars = 60
 * + 9 additional authority-system pillars
 * = 69 total
 *
 * Every pillar has a stable ID (P01–P69), a group, a display label, and a
 * canonical path. Publication eligibility is decided by `isPillarIndexable()`
 * (mirrors the editorial `isContentIndexable()` authority). The registry
 * does not own page content — it owns the IA: which pillars exist, what
 * they are called, where they live, and which existing routes already
 * own each intent.
 *
 * Migration rule: if an existing GSC-coverage path already owns the
 * pillar's intent and carries search equity, the pillar is set to
 * `migrationDecision: "KEEP_EXISTING_CANONICAL"` and `canonicalPath`
 * points to the existing owner. We never destroy equity to match a
 * clean-slug contract.
 */

export type PillarId = `P${number & { length: 2 }}` | `P${number}`; // "P01".."P69"

export type PillarGroupKey =
  | "core-protocol"
  | "data-integrations"
  | "developer-tools"
  | "security-governance"
  | "ai-agentic"
  | "industry-use-cases"
  | "authority-system";

export type PillarStatus = "published" | "review" | "draft" | "retired";

export type MigrationDecision =
  | "USE_PROPOSED"
  | "KEEP_EXISTING_CANONICAL"
  | "MERGE"
  | "REDIRECT"
  | "EVIDENCE_REVIEW";

export interface PillarDefinition {
  /** Stable identity, e.g. "P01" */
  id: string;
  /** Group membership */
  group: PillarGroupKey;
  /** Display name shown to users. Always uses "MCP <Topic>" prefix. */
  label: string;
  /** Canonical URL. May match existing owner or be the proposed clean path. */
  canonicalPath: string;
  /** Short editorial description. */
  description: string;
  /** Publication status. */
  status: PillarStatus;
  /** Mark as noindex when not eligible for search. */
  noindex: boolean;
  /** Existing path that owns this intent (if any). */
  existingOwner?: string;
  /** How the canonical path was selected. */
  migrationDecision: MigrationDecision;
  /** GSC clicks + impressions for the existing owner (when applicable). */
  gscClicks?: number;
  gscImpressions?: number;
  /** Notes for editorial review. */
  notes?: string;
}

/** Group metadata for navigation rendering. */
export const PILLAR_GROUPS: Array<{
  key: PillarGroupKey;
  label: string;
  order: number;
  expectedCount: number;
}> = [
  { key: "core-protocol", label: "MCP Core & Protocol", order: 1, expectedCount: 10 },
  { key: "data-integrations", label: "MCP Data & Integrations", order: 2, expectedCount: 10 },
  { key: "developer-tools", label: "MCP Developer Tools", order: 3, expectedCount: 10 },
  { key: "security-governance", label: "MCP Security & Governance", order: 4, expectedCount: 10 },
  { key: "ai-agentic", label: "MCP AI & Agentic Workflows", order: 5, expectedCount: 10 },
  { key: "industry-use-cases", label: "MCP Industry Use Cases", order: 6, expectedCount: 10 },
  { key: "authority-system", label: "MCP Authority System", order: 7, expectedCount: 9 },
];

/**
 * All 69 pillars. IDs are P01–P69 exactly once.
 * Numbering fix: each pillar carries its own sequential number, not a
 * shared group startIndex (the prototype bug). Numbers are 01–69.
 */
export const PILLAR_REGISTRY: PillarDefinition[] = [
  /* ============================================================
   * GROUP 1 — MCP CORE & PROTOCOL  (P01–P10)
   * ============================================================ */
  {
    id: "P01",
    group: "core-protocol",
    label: "MCP Protocol Overview",
    canonicalPath: "/learn/model-context-protocol",
    description: "What the Model Context Protocol is, why it exists, and how it works.",
    status: "published",
    noindex: false,
    existingOwner: "/learn/model-context-protocol",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
    gscClicks: 96,
    gscImpressions: 0,
  },
  {
    id: "P02",
    group: "core-protocol",
    label: "MCP Server Directory",
    canonicalPath: "/servers",
    description: "Catalog of MCP servers for browsing and discovery.",
    status: "published",
    noindex: false,
    existingOwner: "/servers",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P03",
    group: "core-protocol",
    label: "MCP Client Implementations",
    canonicalPath: "/clients",
    description: "Setup and configuration guides for MCP client applications.",
    status: "published",
    noindex: false,
    existingOwner: "/clients",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
    gscClicks: 82,
    gscImpressions: 0,
  },
  {
    id: "P04",
    group: "core-protocol",
    label: "MCP Stdio Transport",
    canonicalPath: "/learn/mcp-stdio",
    description: "The local stdio transport: process spawn and JSON-RPC over stdin/stdout.",
    status: "published",
    noindex: false,
    existingOwner: "/learn/mcp-stdio",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P05",
    group: "core-protocol",
    label: "MCP Streamable HTTP Transport",
    canonicalPath: "/learn/mcp-streamable-http",
    description: "The remote Streamable HTTP transport: POST + SSE for server-to-client streaming.",
    status: "published",
    noindex: false,
    existingOwner: "/learn/mcp-streamable-http",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
    notes: "Modern MCP uses Streamable HTTP. The proposed clean path /transport-http is kept as umbrella alias but the existing /learn/mcp-streamable-http retains equity.",
  },
  {
    id: "P06",
    group: "core-protocol",
    label: "MCP Tool Definitions",
    canonicalPath: "/learn/mcp-tools",
    description: "MCP tools: discovery, schemas, invocation, and security.",
    status: "published",
    noindex: false,
    existingOwner: "/learn/mcp-tools",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P07",
    group: "core-protocol",
    label: "MCP Resource Templates",
    canonicalPath: "/learn/mcp-resources",
    description: "MCP resources: URIs, listing, reading, and how resources differ from tools.",
    status: "published",
    noindex: false,
    existingOwner: "/learn/mcp-resources",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P08",
    group: "core-protocol",
    label: "MCP Prompts & Interactions",
    canonicalPath: "/learn/mcp-prompts",
    description: "MCP prompts: reusable invocation templates and how prompts differ from tools.",
    status: "published",
    noindex: false,
    existingOwner: "/learn/mcp-prompts",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P09",
    group: "core-protocol",
    label: "MCP Sampling & LLM Calls",
    canonicalPath: "/learn/mcp-architecture",
    description: "Sampling, capability negotiation, and the host-client-server architecture.",
    status: "published",
    noindex: false,
    existingOwner: "/learn/mcp-architecture",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
    notes: "Sampling is a server-side concept covered under architecture; no dedicated pillar currently exists.",
  },
  {
    id: "P10",
    group: "core-protocol",
    label: "MCP Authentication",
    canonicalPath: "/security/authentication",
    description: "MCP authentication: bearer tokens, OAuth, scopes, and RBAC.",
    status: "published",
    noindex: false,
    existingOwner: "/security/authentication",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },

  /* ============================================================
   * GROUP 2 — MCP DATA & INTEGRATIONS  (P11–P20)
   * ============================================================ */
  {
    id: "P11",
    group: "data-integrations",
    label: "MCP Database Servers",
    canonicalPath: "/guides/mcp-servers-for-databases",
    description: "MCP servers for databases: read-only access and connection security.",
    status: "published",
    noindex: false,
    existingOwner: "/guides/mcp-servers-for-databases",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P12",
    group: "data-integrations",
    label: "MCP File System Servers",
    canonicalPath: "/filesystem-servers",
    description: "MCP servers that expose file system operations through tools.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar currently exists for file-system servers. Awaiting editorial content.",
  },
  {
    id: "P13",
    group: "data-integrations",
    label: "MCP Git & Repository Servers",
    canonicalPath: "/guides/best-mcp-server-for-github",
    description: "MCP servers for version control: GitHub, GitLab, and read-only repository access.",
    status: "published",
    noindex: false,
    existingOwner: "/guides/best-mcp-server-for-github",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P14",
    group: "data-integrations",
    label: "MCP API & REST Servers",
    canonicalPath: "/api-servers",
    description: "MCP servers that expose REST APIs and external services.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar currently exists for API & REST servers. Awaiting editorial content.",
  },
  {
    id: "P15",
    group: "data-integrations",
    label: "MCP Cloud Infrastructure Servers",
    canonicalPath: "/guides/mcp-devops",
    description: "MCP servers for infrastructure, deployment, cloud, and CI/CD.",
    status: "published",
    noindex: false,
    existingOwner: "/guides/mcp-devops",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P16",
    group: "data-integrations",
    label: "MCP Knowledge Base & RAG Servers",
    canonicalPath: "/rag-servers",
    description: "MCP servers for knowledge base access and retrieval-augmented generation.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "RAG servers are emerging; no dedicated pillar yet. Awaiting editorial content.",
  },
  {
    id: "P17",
    group: "data-integrations",
    label: "MCP Spreadsheet & Data Servers",
    canonicalPath: "/spreadsheet-servers",
    description: "MCP servers for spreadsheet and structured data manipulation.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P18",
    group: "data-integrations",
    label: "MCP Communication Servers",
    canonicalPath: "/communication-servers",
    description: "MCP servers for messaging, email, and team communication.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P19",
    group: "data-integrations",
    label: "MCP Calendar & Scheduling Servers",
    canonicalPath: "/calendar-servers",
    description: "MCP servers for calendar access and scheduling automation.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P20",
    group: "data-integrations",
    label: "MCP CRM & Business Servers",
    canonicalPath: "/crm-servers",
    description: "MCP servers for CRM, sales, and business workflow tools.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },

  /* ============================================================
   * GROUP 3 — MCP DEVELOPER TOOLS  (P21–P30)
   * ============================================================ */
  {
    id: "P21",
    group: "developer-tools",
    label: "MCP SDK & Libraries",
    canonicalPath: "/build/mcp-server",
    description: "Official and community SDKs for building MCP servers and clients.",
    status: "published",
    noindex: false,
    existingOwner: "/build/mcp-server",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P22",
    group: "developer-tools",
    label: "MCP Server Boilerplates",
    canonicalPath: "/boilerplates",
    description: "Boilerplate templates and starter projects for MCP servers.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P23",
    group: "developer-tools",
    label: "MCP Testing & Debugging",
    canonicalPath: "/testing-debugging",
    description: "Tools and techniques for testing and debugging MCP servers and clients.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P24",
    group: "developer-tools",
    label: "MCP Schema Validators",
    canonicalPath: "/schema-validators",
    description: "Validators for server.json and tool input schemas.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P25",
    group: "developer-tools",
    label: "MCP Registry & Discovery",
    canonicalPath: "/guides/mcp-marketplaces",
    description: "Registries, directories, and marketplaces for MCP server discovery.",
    status: "published",
    noindex: false,
    existingOwner: "/guides/mcp-marketplaces",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P26",
    group: "developer-tools",
    label: "MCP CLI Tools",
    canonicalPath: "/cli-tools",
    description: "Command-line tools for managing MCP servers and clients.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P27",
    group: "developer-tools",
    label: "MCP IDE Integrations",
    canonicalPath: "/clients/cursor",
    description: "MCP support in IDEs: Cursor, VS Code, Windsurf, and others.",
    status: "published",
    noindex: false,
    existingOwner: "/clients/cursor",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
    notes: "Authority pillar is served by the /clients collection; cursor page is the canonical first-party example.",
  },
  {
    id: "P28",
    group: "developer-tools",
    label: "MCP Proxy & Gateway",
    canonicalPath: "/proxy-gateway",
    description: "Proxy and gateway patterns for routing MCP traffic across multiple servers.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P29",
    group: "developer-tools",
    label: "MCP Observability & Monitoring",
    canonicalPath: "/observability",
    description: "Observability, tracing, and monitoring for MCP server fleets.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P30",
    group: "developer-tools",
    label: "MCP Deployment & Hosting",
    canonicalPath: "/deployment",
    description: "Deployment and hosting patterns for remote MCP servers.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    gscClicks: 44,
    gscImpressions: 0,
    notes: "GSC equity exists on child routes (/deployment/aws, etc.) but no /deployment collection page exists. Requires editorial decision: create /deployment page or map to closest existing content.",
  },

  /* ============================================================
   * GROUP 4 — MCP SECURITY & GOVERNANCE  (P31–P40)
   * ============================================================ */
  {
    id: "P31",
    group: "security-governance",
    label: "MCP Security Best Practices",
    canonicalPath: "/security/mcp-security",
    description: "MCP security overview: threat model, authentication, tool permissions, prompt injection.",
    status: "published",
    noindex: false,
    existingOwner: "/security/mcp-security",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P32",
    group: "security-governance",
    label: "MCP Permissions & Scoping",
    canonicalPath: "/security/tool-security",
    description: "Permissions, scoping, and least-privilege for MCP tools.",
    status: "published",
    noindex: false,
    existingOwner: "/security/tool-security",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P33",
    group: "security-governance",
    label: "MCP Secret Management",
    canonicalPath: "/secret-management",
    description: "Secret management patterns for MCP server credentials and tokens.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P34",
    group: "security-governance",
    label: "MCP Audit Logging",
    canonicalPath: "/audit-logging",
    description: "Audit logging for MCP tool invocations and access events.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P35",
    group: "security-governance",
    label: "MCP Sandboxing & Isolation",
    canonicalPath: "/sandboxing",
    description: "Sandboxing and isolation patterns for running MCP servers safely.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P36",
    group: "security-governance",
    label: "MCP Compliance & Governance",
    canonicalPath: "/compliance",
    description: "Compliance and governance frameworks for MCP deployments.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P37",
    group: "security-governance",
    label: "MCP Threat Modeling",
    canonicalPath: "/threat-modeling",
    description: "Threat modeling for MCP-based AI agent systems.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P38",
    group: "security-governance",
    label: "MCP Rate Limiting & Quotas",
    canonicalPath: "/rate-limiting",
    description: "Rate limiting and quota management for MCP server endpoints.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P39",
    group: "security-governance",
    label: "MCP Identity & Access Management",
    canonicalPath: "/identity-access",
    description: "Identity and access management for MCP clients and servers.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P40",
    group: "security-governance",
    label: "MCP Vulnerability Scanning",
    canonicalPath: "/vulnerability-scanning",
    description: "Vulnerability scanning for MCP server implementations.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },

  /* ============================================================
   * GROUP 5 — MCP AI & AGENTIC WORKFLOWS  (P41–P50)
   * ============================================================ */
  {
    id: "P41",
    group: "ai-agentic",
    label: "MCP Agentic Workflows",
    canonicalPath: "/agentic-workflows",
    description: "Designing agentic workflows powered by MCP tools and resources.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P42",
    group: "ai-agentic",
    label: "MCP Multi-Agent Systems",
    canonicalPath: "/multi-agent-systems",
    description: "Multi-agent coordination patterns using MCP servers as shared tools.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P43",
    group: "ai-agentic",
    label: "MCP Tool Calling Optimization",
    canonicalPath: "/tool-calling",
    description: "Optimizing tool calling: schema design, batching, and error handling.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P44",
    group: "ai-agentic",
    label: "MCP Context Management",
    canonicalPath: "/context-management",
    description: "Context window and resource management for MCP-driven agents.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P45",
    group: "ai-agentic",
    label: "MCP Evaluation & Benchmarking",
    canonicalPath: "/evaluation",
    description: "Evaluation and benchmarking of MCP-based AI agent systems.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P46",
    group: "ai-agentic",
    label: "MCP Orchestration Frameworks",
    canonicalPath: "/orchestration",
    description: "Orchestration frameworks for managing complex MCP agent flows.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P47",
    group: "ai-agentic",
    label: "MCP Memory & State Management",
    canonicalPath: "/memory-state",
    description: "Memory and persistent state patterns for MCP agents.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P48",
    group: "ai-agentic",
    label: "MCP Human-in-the-Loop",
    canonicalPath: "/human-in-the-loop",
    description: "Human-in-the-loop patterns for MCP-driven AI agents.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P49",
    group: "ai-agentic",
    label: "MCP Autonomous Agents",
    canonicalPath: "/autonomous-agents",
    description: "Autonomous agent architectures leveraging MCP servers.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P50",
    group: "ai-agentic",
    label: "MCP AI Safety & Alignment",
    canonicalPath: "/ai-safety",
    description: "Safety and alignment considerations for MCP-based agent systems.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },

  /* ============================================================
   * GROUP 6 — MCP INDUSTRY USE CASES  (P51–P60)
   * ============================================================ */
  {
    id: "P51",
    group: "industry-use-cases",
    label: "MCP for Software Engineering",
    canonicalPath: "/guides/mcp-servers-for-developers",
    description: "MCP servers for software engineering: version control, databases, code tools.",
    status: "published",
    noindex: false,
    existingOwner: "/guides/mcp-servers-for-developers",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P52",
    group: "industry-use-cases",
    label: "MCP for Data Science",
    canonicalPath: "/use-case-data-science",
    description: "MCP servers for data science: notebooks, datasets, and analysis tools.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P53",
    group: "industry-use-cases",
    label: "MCP for DevOps & SRE",
    canonicalPath: "/use-case-devops",
    description: "MCP servers for DevOps and SRE: infrastructure, monitoring, and incident response.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P54",
    group: "industry-use-cases",
    label: "MCP for Customer Support",
    canonicalPath: "/use-case-support",
    description: "MCP servers for customer support: ticket systems, knowledge bases, and CRM access.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P55",
    group: "industry-use-cases",
    label: "MCP for Legal & Compliance",
    canonicalPath: "/use-case-legal",
    description: "MCP servers for legal and compliance: document review, policy lookup, and audit.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P56",
    group: "industry-use-cases",
    label: "MCP for Healthcare",
    canonicalPath: "/use-case-healthcare",
    description: "MCP servers for healthcare: clinical data, EHR access, and HIPAA considerations.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P57",
    group: "industry-use-cases",
    label: "MCP for Finance & Trading",
    canonicalPath: "/use-case-finance",
    description: "MCP servers for finance and trading: market data, broker APIs, and compliance.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P58",
    group: "industry-use-cases",
    label: "MCP for Education & Research",
    canonicalPath: "/use-case-education",
    description: "MCP servers for education and research: literature search, citation tools, and tutoring.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P59",
    group: "industry-use-cases",
    label: "MCP for Marketing & SEO",
    canonicalPath: "/use-case-marketing",
    description: "MCP servers for marketing and SEO: content analysis, keyword research, and analytics.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "No published pillar yet. Awaiting editorial content.",
  },
  {
    id: "P60",
    group: "industry-use-cases",
    label: "MCP for Personal Productivity",
    canonicalPath: "/guides/mcp-productivity",
    description: "MCP servers for personal productivity: documents, calendars, and task management.",
    status: "published",
    noindex: false,
    existingOwner: "/guides/mcp-productivity",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },

  /* ============================================================
   * GROUP 7 — MCP AUTHORITY SYSTEM  (P61–P69)
   * ============================================================ */
  {
    id: "P61",
    group: "authority-system",
    label: "MCP Server Compare",
    canonicalPath: "/compare",
    description: "Evidence-based MCP server comparisons.",
    status: "published",
    noindex: false,
    existingOwner: "/compare",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P62",
    group: "authority-system",
    label: "MCP Categories",
    canonicalPath: "/categories",
    description: "MCP servers grouped by category.",
    status: "published",
    noindex: false,
    existingOwner: "/categories",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P63",
    group: "authority-system",
    label: "MCP Capabilities",
    canonicalPath: "/capabilities",
    description: "MCP servers grouped by capability.",
    status: "published",
    noindex: false,
    existingOwner: "/capabilities",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P64",
    group: "authority-system",
    label: "MCP How It Works",
    canonicalPath: "/learn/how-mcp-works",
    description: "Step-by-step explanation of how an MCP request flows.",
    status: "published",
    noindex: false,
    existingOwner: "/learn/how-mcp-works",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P65",
    group: "authority-system",
    label: "MCP Use Cases",
    canonicalPath: "/learn/mcp-use-cases",
    description: "Real MCP use cases across workflows, databases, and automation.",
    status: "published",
    noindex: false,
    existingOwner: "/learn/mcp-use-cases",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P66",
    group: "authority-system",
    label: "MCP Documentation",
    canonicalPath: "/docs",
    description: "Documentation hub: reference, guides, and protocol specification links.",
    status: "published",
    noindex: false,
    existingOwner: "/docs",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P67",
    group: "authority-system",
    label: "MCP Guides",
    canonicalPath: "/guides",
    description: "Decision, comparison, and troubleshooting guides.",
    status: "published",
    noindex: false,
    existingOwner: "/guides",
    migrationDecision: "KEEP_EXISTING_CANONICAL",
  },
  {
    id: "P68",
    group: "authority-system",
    label: "MCP Blog",
    canonicalPath: "/blog",
    description: "Editorial blog: announcements, deep-dives, and ecosystem news.",
    status: "review",
    noindex: true,
    migrationDecision: "EVIDENCE_REVIEW",
    notes: "GSC has 163+159+141+134 clicks on individual /blog/* children. /blog collection page not yet created. Create /blog index or map to nearest existing collection.",
  },
  {
    id: "P69",
    group: "authority-system",
    label: "MCP Pillar Directory",
    canonicalPath: "/pillars",
    description: "The canonical 69-pillar directory for the entire authority graph.",
    status: "published",
    noindex: false,
    migrationDecision: "USE_PROPOSED",
    notes: "New route — generates from this registry.",
  },
];

/** Map keyed by pillar ID. */
export const PILLAR_BY_ID: Record<string, PillarDefinition> = Object.fromEntries(
  PILLAR_REGISTRY.map((p) => [p.id, p]),
);

/** Map keyed by canonical path. */
export const PILLAR_BY_PATH: Record<string, PillarDefinition> = Object.fromEntries(
  PILLAR_REGISTRY.map((p) => [p.canonicalPath, p]),
);

/** Pillars eligible for the public graph (publication authority). */
export function isPillarIndexable(p: PillarDefinition): boolean {
  return p.status === "published" && !p.noindex;
}

/** All indexable pillars. */
export function getIndexablePillars(): PillarDefinition[] {
  return PILLAR_REGISTRY.filter(isPillarIndexable);
}

/** Pillars in a given group, ordered by ID. */
export function getPillarsByGroup(group: PillarGroupKey): PillarDefinition[] {
  return PILLAR_REGISTRY.filter((p) => p.group === group).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}

/** Public header groups: only published/indexable pillars, in canonical order. */
export const PUBLIC_HEADER_GROUPS = PILLAR_GROUPS
  .map((g) => ({
    ...g,
    items: getPillarsByGroup(g.key).filter(isPillarIndexable),
  }))
  .filter((g) => g.items.length > 0);
