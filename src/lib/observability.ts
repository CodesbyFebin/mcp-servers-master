export const METRICS = Object.freeze({
  requestCount: "http_requests_total",
  requestLatency: "http_request_latency_ms",
  requestErrors: "http_request_errors_total",
  mcpToolLatency: "mcp_tool_latency_ms",
  modelLatency: "model_latency_ms",
  providerFallbacks: "provider_fallbacks_total",
} as const)

type Scalar = string | number | boolean | null
export type LogFields = Record<string, unknown>
export type MetricLabels = Record<string, string | number | boolean>

const SENSITIVE_KEY = /(authorization|cookie|secret|token|password|api[-_]?key|pan|gstin|email|phone)/i
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const PAN = /\b[A-Z]{5}\d{4}[A-Z]\b/gi
const GSTIN = /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/gi
const PHONE = /(?<!\d)(?:\+?91[-\s]?)?[6-9]\d{9}(?!\d)/g
const BEARER = /Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi

export function redactSensitiveText(value: string): string {
  return value
    .replace(BEARER, "Bearer [REDACTED]")
    .replace(GSTIN, "[REDACTED:GSTIN]")
    .replace(PAN, "[REDACTED:PAN]")
    .replace(EMAIL, "[REDACTED:EMAIL]")
    .replace(PHONE, "[REDACTED:PHONE]")
}

export function sanitizeLogFields(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]"
  if (typeof value === "string") return redactSensitiveText(value)
  if (Array.isArray(value)) return value.map((item) => sanitizeLogFields(item))
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
        childKey,
        sanitizeLogFields(childValue, childKey),
      ]),
    )
  }
  return value
}

export class StructuredLogger {
  constructor(
    private readonly sink: (line: string) => void = (line) => console.log(line),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  write(level: "info" | "warn" | "error", event: string, fields: LogFields = {}): void {
    const safe = sanitizeLogFields(fields) as Record<string, unknown>
    this.sink(JSON.stringify({ timestamp: this.now(), level, event, ...safe }))
  }
}

type Histogram = { count: number; sum: number; max: number }

export class MetricsRegistry {
  private readonly counters = new Map<string, number>()
  private readonly histograms = new Map<string, Histogram>()

  increment(name: string, labels: MetricLabels = {}, amount = 1): void {
    const key = metricKey(name, labels)
    this.counters.set(key, (this.counters.get(key) ?? 0) + amount)
  }

  observe(name: string, value: number, labels: MetricLabels = {}): void {
    if (!Number.isFinite(value) || value < 0) throw new ValueError("metric observations must be finite and non-negative")
    const key = metricKey(name, labels)
    const current = this.histograms.get(key) ?? { count: 0, sum: 0, max: 0 }
    this.histograms.set(key, {
      count: current.count + 1,
      sum: current.sum + value,
      max: Math.max(current.max, value),
    })
  }

  snapshot() {
    return {
      counters: Object.fromEntries([...this.counters.entries()].sort(([a], [b]) => a.localeCompare(b))),
      histograms: Object.fromEntries([...this.histograms.entries()].sort(([a], [b]) => a.localeCompare(b))),
    }
  }
}

class ValueError extends Error {}

function metricKey(name: string, labels: MetricLabels): string {
  const suffix = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(",")
  return suffix ? `${name}{${suffix}}` : name
}

export async function measureOperation<T>(
  registry: MetricsRegistry,
  metricName: string,
  operation: () => Promise<T> | T,
  labels: MetricLabels = {},
  clock: () => number = () => performance.now(),
): Promise<T> {
  const started = clock()
  try {
    return await operation()
  } finally {
    registry.observe(metricName, Math.max(0, clock() - started), labels)
  }
}
