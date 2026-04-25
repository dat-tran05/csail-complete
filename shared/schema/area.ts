import type { AreaId } from "./ids";

export type AreaKind = "research" | "impact";

export interface Area {
  id: AreaId;
  slug: string;
  name: string;
  kind: AreaKind;
}

export function slugifyArea(name: string): string {
  return name.toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
