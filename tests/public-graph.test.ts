import { describe, expect, it } from "vitest"
import { isServerIndexable } from "../src/lib/indexability"
import {
  STATIC_PUBLIC_NODES,
  getPublicGraphNodes,
  getPublicGraphPaths,
  getPublicServerNodes,
} from "../src/lib/public-graph"
import { getPublicServers } from "../src/lib/registry"

describe("public knowledge graph manifest", () => {
  it("contains unique canonical paths", () => {
    const paths = getPublicGraphPaths()
    expect(new Set(paths).size).toBe(paths.length)
  })

  it("has exact parity between public servers and server graph nodes", () => {
    const servers = getPublicServers()
    const nodes = getPublicServerNodes()

    expect(nodes).toHaveLength(servers.length)
    expect(nodes.map((node) => node.path)).toEqual(
      servers.map((server) => `/servers/${server.slug}`),
    )
  })

  it("never emits a non-indexable server node", () => {
    expect(
      getPublicServerNodes().every((node) => node.server && isServerIndexable(node.server)),
    ).toBe(true)
  })

  it("combines static and server nodes without hidden additions", () => {
    expect(getPublicGraphNodes()).toHaveLength(
      STATIC_PUBLIC_NODES.length + getPublicServers().length,
    )
  })
})
