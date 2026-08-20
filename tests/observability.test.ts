import { describe, expect, it } from "vitest"
import {
  METRICS,
  MetricsRegistry,
  StructuredLogger,
  measureOperation,
} from "../src/lib/observability"

describe("observability contracts", () => {
  it("emits structured JSON without sensitive values", () => {
    const lines: string[] = []
    const logger = new StructuredLogger((line) => lines.push(line), () => "2026-08-20T00:00:00.000Z")
    logger.write("info", "request", {
      authorization: "Bearer secret-token",
      message: "Contact person@example.com with PAN ABCDE1234F or +91 9876543210",
    })

    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>
    expect(parsed.event).toBe("request")
    expect(parsed.authorization).toBe("[REDACTED]")
    expect(JSON.stringify(parsed)).not.toContain("secret-token")
    expect(JSON.stringify(parsed)).not.toContain("person@example.com")
    expect(JSON.stringify(parsed)).not.toContain("ABCDE1234F")
    expect(JSON.stringify(parsed)).not.toContain("9876543210")
  })

  it("tracks counters and latency observations deterministically", async () => {
    const metrics = new MetricsRegistry()
    metrics.increment(METRICS.requestCount, { route: "/api/mcp", status: 200 })
    metrics.increment(METRICS.providerFallbacks, { provider: "local" }, 2)

    const ticks = [10, 25]
    const result = await measureOperation(
      metrics,
      METRICS.mcpToolLatency,
      () => "ok",
      { tool: "registry.lookup" },
      () => ticks.shift() ?? 25,
    )

    expect(result).toBe("ok")
    const snapshot = metrics.snapshot()
    expect(snapshot.counters['http_requests_total{route=/api/mcp,status=200}']).toBe(1)
    expect(snapshot.counters['provider_fallbacks_total{provider=local}']).toBe(2)
    expect(snapshot.histograms['mcp_tool_latency_ms{tool=registry.lookup}']).toEqual({
      count: 1,
      sum: 15,
      max: 15,
    })
  })
})
