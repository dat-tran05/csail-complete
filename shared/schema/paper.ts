import type { Provenance } from "./provenance";

export interface Paper {
  id: string;
  semanticScholarId?: string;
  doi?: string;
  arxivId?: string;
  title: string;
  abstract?: string;
  year: number;
  venue?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  openAccessPdfUrl?: string;
  authorIds: string[];
  externalAuthorNames: string[];
  groupIds: string[];
  provenance: Provenance;
}
