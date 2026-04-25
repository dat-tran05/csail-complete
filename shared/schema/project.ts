import type { Provenance } from "./provenance";

export interface Project {
  id: string;
  slug: string;
  title: string;
  url: string;
  teaser?: string;
  groupIds: string[];
  contributorIds: string[];
  provenance: Provenance;
}

export function slugifyProjectUrl(url: string): string {
  const m = url.match(/\/research\/([^/?#]+)/);
  return (m?.[1] ?? url).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
