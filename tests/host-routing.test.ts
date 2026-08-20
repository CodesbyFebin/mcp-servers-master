import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { proxy } from "../proxy"

function request(host: string, path = "/") {
  return new NextRequest(`https://${host}${path}`, { headers: { host } })
}

describe("host routing guard", () => {
  it("permanently redirects apex requests to the canonical www host", () => {
    const response = proxy(request("mcpserver.in", "/servers?category=tools"))
    expect(response.status).toBe(308)
    expect(response.headers.get("location")).toBe(
      "https://www.mcpserver.in/servers?category=tools",
    )
  })

  it("temporarily redirects the foundation-only app host and blocks indexing", () => {
    const response = proxy(request("app.mcpserver.in", "/playground"))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://www.mcpserver.in/")
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(response.headers.get("x-mcp-app-status")).toBe("foundation")
    expect(response.headers.get("cache-control")).toBe("no-store")
  })

  it("keeps Vercel previews noindex while production www stays indexable", () => {
    const preview = proxy(request("mcp-servers-master-example.vercel.app"))
    const production = proxy(request("www.mcpserver.in"))
    expect(preview.headers.get("x-robots-tag")).toBe("noindex, follow")
    expect(production.headers.get("x-robots-tag")).toBeNull()
  })
})
