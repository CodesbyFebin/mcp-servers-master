import { NextResponse } from "next/server"
import { handleMcpRequest, MCP_PROTOCOL_VERSION } from "@/src/lib/mcp-contract"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Content-Type must be application/json" } },
      { status: 415, headers: responseHeaders() },
    )
  }

  const requestedVersion = request.headers.get("mcp-protocol-version")
  if (requestedVersion && requestedVersion !== MCP_PROTOCOL_VERSION) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Unsupported MCP protocol version" } },
      { status: 400, headers: responseHeaders() },
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400, headers: responseHeaders() },
    )
  }

  return NextResponse.json(handleMcpRequest(payload), { headers: responseHeaders() })
}

function responseHeaders() {
  return {
    "cache-control": "no-store",
    "mcp-protocol-version": MCP_PROTOCOL_VERSION,
  }
}
