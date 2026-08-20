import { describe, expect, it } from "vitest"
import { handleMcpRequest, MCP_PROTOCOL_VERSION } from "../src/lib/mcp-contract"
import { getPublicServers } from "../src/lib/registry"

describe("MCP protocol contract", () => {
  it("initializes with the current protocol revision", () => {
    const response = handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })
    expect("result" in response).toBe(true)
    if ("result" in response) {
      const result = response.result as { protocolVersion: string; capabilities: unknown }
      expect(result.protocolVersion).toBe(MCP_PROTOCOL_VERSION)
      expect(result.capabilities).toEqual({ tools: { listChanged: false } })
    }
  })

  it("lists only the read-only public registry lookup tool", () => {
    const response = handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" })
    if (!("result" in response)) throw new Error("tools/list returned error")
    const result = response.result as { tools: Array<{ name: string; annotations?: Record<string, boolean> }> }
    expect(result.tools).toHaveLength(1)
    expect(result.tools[0]?.name).toBe("registry.lookup")
    expect(result.tools[0]?.annotations?.readOnlyHint).toBe(true)
    expect(result.tools[0]?.annotations?.destructiveHint).toBe(false)
  })

  it("calls registry.lookup only against the public registry cohort", () => {
    const server = getPublicServers()[0]
    expect(server).toBeDefined()
    const response = handleMcpRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "registry.lookup", arguments: { slug: server!.slug } },
    })
    if (!("result" in response)) throw new Error("tools/call returned JSON-RPC error")
    const result = response.result as {
      structuredContent: { slug: string; url: string }
      isError: boolean
    }
    expect(result.isError).toBe(false)
    expect(result.structuredContent.slug).toBe(server!.slug)
    expect(result.structuredContent.url).toBe(`https://www.mcpserver.in/servers/${server!.slug}`)
  })

  it("fails closed for unknown tools and non-public slugs", () => {
    const unknownTool = handleMcpRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "shell.exec", arguments: {} },
    })
    expect("error" in unknownTool && unknownTool.error.code).toBe(-32601)

    const missing = handleMcpRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "registry.lookup", arguments: { slug: "not-public" } },
    })
    if (!("result" in missing)) throw new Error("missing lookup returned JSON-RPC error")
    const result = missing.result as { isError: boolean; content: Array<{ text: string }> }
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain("No published evidence-backed server")
  })
})
