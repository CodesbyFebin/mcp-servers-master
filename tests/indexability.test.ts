import { describe, expect, it } from "vitest"
import { isPublicIndexable, isServerIndexable } from "../src/lib/indexability"

describe("isServerIndexable", () => {
  const evidence = [{
    sourceUrl: "https://example.test/source",
    sourceType: "official" as const,
    status: "verified" as const,
    capturedAt: "2026-08-18",
  }]

  it("publishes only verified records with evidence", () => {
    expect(isServerIndexable({
      publicationStatus: "published",
      verificationStatus: "verified",
      evidence,
    })).toBe(true)
  })

  it("rejects unverified, noindex, and evidence-free records", () => {
    expect(isServerIndexable({
      publicationStatus: "published",
      verificationStatus: "unverified",
      evidence,
    })).toBe(false)
    expect(isServerIndexable({
      publicationStatus: "published",
      verificationStatus: "verified",
      evidence,
      noindex: true,
    })).toBe(false)
    expect(isServerIndexable({
      publicationStatus: "published",
      verificationStatus: "verified",
      evidence: [],
    })).toBe(false)
  })

  it("keeps the Phase 1 compatibility alias bound to the same function", () => {
    expect(isPublicIndexable).toBe(isServerIndexable)
  })
})
