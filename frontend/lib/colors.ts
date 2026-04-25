export const DEFAULT_GROUP_COLORS = [
  "#e26b4a", "#6abf6e", "#a36ee2", "#7fb1d4",
  "#d4b25f", "#bf6e9e", "#5fb1a8", "#c47d4a",
];

export function colorForGroup(groupId: string, fallbackIndex = 0): string {
  return DEFAULT_GROUP_COLORS[fallbackIndex % DEFAULT_GROUP_COLORS.length]!;
}
