import type { Provenance } from "./provenance";

export type EdgeType =
  | "MEMBER_OF" | "PI_OF" | "LOCATED_IN" | "WORKS_ON" | "BELONGS_TO"
  | "AUTHORED" | "MENTIONED_IN" | "WORKS_IN_AREA" | "HAS_IMPACT_ON"
  | "COAUTHORED_WITH";

export interface Edge<F extends string = string, T extends string = string> {
  type: EdgeType;
  from: F;
  to: T;
  props?: Record<string, string | number | boolean>;
  provenance: Provenance;
}
