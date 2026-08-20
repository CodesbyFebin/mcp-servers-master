import type { ServerRecord } from "../data/servers"
import { getPublicServers } from "./registry"

export type PublicGraphNode = {
  kind: "page" | "server"
  path: string
  label: string
  lastModified?: string
  server?: ServerRecord
}

export const STATIC_PUBLIC_NODES: readonly PublicGraphNode[] = [
  { kind: "page", path: "/", label: "Home" },
  { kind: "page", path: "/servers", label: "Servers" },
  { kind: "page", path: "/docs", label: "Docs" },
  { kind: "page", path: "/learn", label: "Learn" },
  { kind: "page", path: "/methodology", label: "Methodology" },
  { kind: "page", path: "/evidence", label: "Evidence policy" },
]

export function getPublicServerNodes(): PublicGraphNode[] {
  return getPublicServers().map((server) => ({
    kind: "server" as const,
    path: `/servers/${server.slug}`,
    label: server.title,
    ...(server.updatedAt ? { lastModified: server.updatedAt } : {}),
    server,
  }))
}

export function getPublicGraphNodes(): PublicGraphNode[] {
  return [...STATIC_PUBLIC_NODES, ...getPublicServerNodes()]
}

export function getPublicGraphPaths(): string[] {
  return getPublicGraphNodes().map((node) => node.path)
}
