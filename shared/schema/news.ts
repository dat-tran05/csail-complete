import type { Provenance } from "./provenance";

export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  publishedAt: string;
  url: string;
  excerpt?: string;
  body?: string;
  personIds: string[];
  groupIds: string[];
  projectIds: string[];
  imageUrl?: string;
  provenance: Provenance;
}
