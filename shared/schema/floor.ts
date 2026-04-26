export interface FloorRoomInsight {
  id: string;
  number: string;
  occupantCount: number;
  piName: string | null;
  piNodeId: string | null;
  dominantGroupSlug: string | null;
  dominantGroupColor: string | null;
  dominantGroupShortName: string | null;
  recentPaperCount: number;
  recentNewsCount: number;
  areaSlugs: string[];
  groupSlugs: string[];
}

export interface FloorCoauthorEdge {
  fromRoomId: string;
  toRoomId: string;
  paperCount: number;
  firstYear: number;
  lastYear: number;
}

export interface FloorAreaSummary {
  slug: string;
  name: string;
  peopleCount: number;
}

export interface FloorGroupSummary {
  slug: string;
  name: string;
  shortName: string | null;
  color: string | null;
  memberCount: number;
  roomIds: string[];
}

export interface FloorInsights {
  floor: number;
  rooms: FloorRoomInsight[];
  coauthorEdges: FloorCoauthorEdge[];
  areas: FloorAreaSummary[];
  groups: FloorGroupSummary[];
  generatedAt: string;
}
