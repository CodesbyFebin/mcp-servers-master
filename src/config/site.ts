export const SITE = Object.freeze({
  name: "MCPserver.in",
  origin: "https://www.mcpserver.in",
  hostname: "www.mcpserver.in",
  defaultLocale: "en-IN",
  protocolName: "Model Context Protocol",
} as const)

const ABSOLUTE_URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i

export function normalizePath(input = "/"): string {
  const raw = input.trim() || "/"

  if (ABSOLUTE_URL_RE.test(raw)) {
    const url = new URL(raw)
    if (url.origin !== SITE.origin) {
      throw new Error(`Refusing to canonicalize foreign origin: ${url.origin}`)
    }
    return normalizePath(`${url.pathname}${url.search}${url.hash}`)
  }

  const parsed = new URL(raw.startsWith("/") ? raw : `/${raw}`, SITE.origin)
  let pathname = parsed.pathname.replace(/\/{2,}/g, "/")

  if (pathname !== "/") {
    pathname = pathname.replace(/\/+$/, "")
  }

  return pathname || "/"
}

export function canonicalUrl(path = "/"): string {
  const pathname = normalizePath(path)
  return pathname === "/" ? `${SITE.origin}/` : `${SITE.origin}${pathname}`
}

export function isCanonicalProductionUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.origin === SITE.origin &&
      url.search === "" &&
      url.hash === "" &&
      canonicalUrl(url.pathname) === value
    )
  } catch {
    return false
  }
}
