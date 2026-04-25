import type { Provenance } from "./provenance";

export type CsailRole =
  | "professor" | "associate-professor" | "assistant-professor"
  | "postdoc" | "research-scientist" | "research-affiliate"
  | "phd-student" | "graduate-student" | "meng-student" | "urop"
  | "visiting-scientist" | "visiting-student" | "visiting-scholar"
  | "admin" | "technical-staff" | "other";

export interface PersonAliases {
  email?: string;
  emailAliases?: string[];
  csailUrlSlug?: string;
  semanticScholarAuthorId?: string;
  dblpId?: string;
  homepage?: string;
}

export interface Person {
  id: string;
  nodeId: string;
  name: string;
  title: string;
  role: CsailRole;
  isPI: boolean;
  isCoreOrDual: boolean;
  affiliation: string;

  aliases: PersonAliases;
  homepage?: string;
  phone?: string;
  photoUrl?: string;
  bio?: string;
  bioRaw?: string;

  groupIds: string[];
  projectIds: string[];
  paperIds: string[];
  roomIds: string[];
  researchAreaIds: string[];
  impactAreaIds: string[];

  stale: boolean;
  lastUpdatedSource?: string;
  lastUpdatedAt?: string;
  provenance: Provenance;
}
