import { describe, expect, it } from "vitest"
import { isPublicIndexable } from "@/src/lib/indexability"

describe("isPublicIndexable", () => {
  const evidence = [{
    sourceUrl: "https://example.test/source",
    sourceType: "official" as const,
    status: "verified" as const,
    capturedAt: "2026-08-18",
  }]

  it("publishes only verified records with evidence", () => {
    expect(isPublicIndexable({
      publicationStatus: "published",
      verificationStatus: "verified",
      evidence,
    })).toBe(true)
  })

  it("rejects unverified, noindex, and evidence-free records", () => {
    expect(isPublicIndexable({
      publicationStatus: "published",
      verificationStatus: "unverified",
      evidence,
    })).toBe(false)
    expect(isPublicIndexable({
      publicationStatus: "published",
      verificationStatus: "verified",
      evidence,
      noindex: true,
    })).toBe(false)
    expect(isPublicIndexable({
      publicationStatus: "published",
      verificationStatus: "verified",
      evidence: [],
    })).toBe(false)
  })
})
