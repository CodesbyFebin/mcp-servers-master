export type EvidenceStatus = "verified" | "measured" | "unverified" | "unknown"
export type EvidenceSourceType =
  | "official"
  | "registry"
  | "repository"
  | "documentation"
  | "measurement"
  | "editorial"

export type PublicationStatus = "draft" | "needs-evidence" | "published" | "retired"
export type VerificationStatus = "verified" | "partial" | "unverified"

export type EvidenceRecord = {
  sourceUrl: string
  sourceType: EvidenceSourceType
  status: EvidenceStatus
  capturedAt: string
  description?: string | null
}

export type PublicRecord = {
  publicationStatus: PublicationStatus
  verificationStatus: VerificationStatus
  evidence: EvidenceRecord[]
  noindex?: boolean
}

export function isPublicIndexable(record: PublicRecord | null | undefined): boolean {
  return Boolean(
    record &&
      record.publicationStatus === "published" &&
      record.verificationStatus === "verified" &&
      record.noindex !== true &&
      record.evidence.some(
        (item) => item.status === "verified" || item.status === "measured",
      ),
  )
}

export function ledgerCounts<T extends PublicRecord>(records: readonly T[]) {
  return records.reduce(
    (counts, record) => {
      counts.total += 1
      if (isPublicIndexable(record)) counts.published += 1
      else counts.awaitingEvidence += 1
      return counts
    },
    { total: 0, published: 0, awaitingEvidence: 0 },
  )
}
