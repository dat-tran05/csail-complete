export const DEFAULT_GROUP_COLORS = [
  "#e26b4a", "#6abf6e", "#a36ee2", "#7fb1d4",
  "#d4b25f", "#bf6e9e", "#5fb1a8", "#c47d4a",
];

export function colorForGroup(groupId: string, fallbackIndex = 0): string {
  return DEFAULT_GROUP_COLORS[fallbackIndex % DEFAULT_GROUP_COLORS.length]!;
}

/**
 * Deterministically pick a color from the palette by hashing the slug.
 * Used as a fallback for KG groups that don't have a curated color.
 */
export function colorForSlug(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % DEFAULT_GROUP_COLORS.length;
  return DEFAULT_GROUP_COLORS[idx]!;
}

/** Convert hex (#rrggbb) to rgba(r,g,b,a). */
export function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
