export type { Person, Group, Project, Paper, NewsItem, Area } from "../../shared/schema";

export interface FloorPerson {
  nodeId: string;
  name: string;
  title: string;
  isPI: boolean;
  roomNumber: string;
  groupNames: string[];
  recentPaperCount: number;
}

export interface PersonProfile {
  nodeId: string;
  name: string;
  title: string;
  bio?: string;
  isPI: boolean;
  isCoreOrDual: boolean;
  groups: { slug: string; name: string }[];
  rooms: { id: string; number: string; floor: number }[];
  recentPapers: { title: string; year: number; venue?: string; citationCount?: number }[];
  recentNews: { title: string; publishedAt: string; url: string }[];
  stale: boolean;
}
