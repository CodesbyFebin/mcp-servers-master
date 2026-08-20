import { canonicalUrl } from "./../config/site"
import { getPublicServerBySlug } from "./registry"

export const MCP_PROTOCOL_VERSION = "2026-07-28"

type JsonRpcId = string | number | null

type JsonRpcRequest = {
  jsonrpc: "2.0"
  id?: JsonRpcId
  method: string
  params?: unknown
}

type JsonRpcSuccess = {
  jsonrpc: "2.0"
  id: JsonRpcId
  result: unknown
}

type JsonRpcError = {
  jsonrpc: "2.0"
  id: JsonRpcId
  error: { code: number; message: string; data?: unknown }
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError

const lookupTool = {
  name: "registry.lookup",
  title: "Lookup published MCP server",
  description: "Return one evidence-backed public MCP server record by canonical public slug.",
  inputSchema: {
    type: "object",
    properties: {
      slug: { type: "string", description: "Public server slug from MCPserver.in." },
    },
    required: ["slug"],
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
}

export function handleMcpRequest(input: unknown): JsonRpcResponse {
  if (!isRequest(input)) return error(null, -32600, "Invalid JSON-RPC request")
  const id = input.id ?? null

  if (input.method === "initialize") {
    return success(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "MCPserver.in public registry", version: "1.0.0" },
      instructions: "Read-only access to records that pass isServerIndexable(). Unknown or non-public records are not returned.",
    })
  }

  if (input.method === "tools/list") {
    return success(id, { tools: [lookupTool] })
  }

  if (input.method === "tools/call") {
    const params = asRecord(input.params)
    if (!params || params.name !== lookupTool.name) return error(id, -32601, "Unknown tool")
    const args = asRecord(params.arguments)
    if (!args || typeof args.slug !== "string" || !args.slug.trim()) {
      return error(id, -32602, "registry.lookup requires a non-empty slug")
    }
    const server = getPublicServerBySlug(args.slug.trim())
    if (!server) {
      return success(id, {
        content: [{ type: "text", text: "No published evidence-backed server exists for that slug." }],
        isError: true,
      })
    }

    const publicRecord = {
      slug: server.slug,
      canonicalName: server.canonicalName,
      title: server.title,
      description: server.description,
      category: server.category,
      capabilities: server.capabilities,
      latestVerifiedVersion: server.latestVerifiedVersion,
      repositoryUrl: server.repositoryUrl,
      websiteUrl: server.websiteUrl,
      updatedAt: server.updatedAt,
      url: canonicalUrl(`/servers/${server.slug}`),
      evidence: server.evidence,
    }
    return success(id, {
      content: [{ type: "text", text: JSON.stringify(publicRecord) }],
      structuredContent: publicRecord,
      isError: false,
    })
  }

  return error(id, -32601, `Method not found: ${input.method}`)
}

function isRequest(value: unknown): value is JsonRpcRequest {
  const record = asRecord(value)
  return Boolean(record && record.jsonrpc === "2.0" && typeof record.method === "string")
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function success(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result }
}

function error(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcError {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data === undefined ? {} : { data }) } }
}
