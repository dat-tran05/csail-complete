import type { Provenance } from "./provenance";

export type GroupKind = "research-group" | "community-of-research";

export interface Group {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  kind: GroupKind;
  url?: string;
  teaser?: string;

  piIds: string[];
  memberIds: string[];
  projectIds: string[];
  roomIds: string[];
  paperIds: string[];

  color?: string;
  provenance: Provenance;
}

export function slugifyGroupUrl(url: string): string {
  const m = url.match(/\/(?:research|group)s?\/([^/?#]+)/) ?? url.match(/\/([^/?#]+)\/?$/);
  return (m?.[1] ?? url).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function classifyGroupKind(rawType: string | null | undefined): GroupKind {
  if (rawType && /community/i.test(rawType)) return "community-of-research";
  return "research-group";
}
