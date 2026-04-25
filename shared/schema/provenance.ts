export type ProvenanceSource =
  | "csail-directory"
  | "hci-lab-scrape"
  | "semantic-scholar"
  | "csail-news"
  | "manual";

export interface Provenance {
  source: ProvenanceSource;
  sourceUrl?: string;
  fetchedAt: string;
  lastVerifiedAt?: string;
  confidence?: number;
}

export function nowProvenance(source: ProvenanceSource, sourceUrl?: string, confidence?: number): Provenance {
  const now = new Date().toISOString();
  return { source, sourceUrl, fetchedAt: now, lastVerifiedAt: now, confidence };
}
