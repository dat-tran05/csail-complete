import { findPeopleOnFloor, getFloorSummary } from "../../../../agents/kg/tools/floor";
import { getPersonProfile, findCoauthors, recentNewsForPerson } from "../../../../agents/kg/tools/person";
import { searchPeople } from "../../../../agents/kg/tools/search";

export const TOOL_SPECS = [
  {
    name: "find_people_on_floor",
    description: "List all CSAIL people whose office is on a given floor of the Stata Center. Returns name, title, room, group affiliations, and recent paper count.",
    input_schema: { type: "object", properties: { floor: { type: "integer", description: "Floor number (1-9)" } }, required: ["floor"] },
  },
  {
    name: "get_floor_summary",
    description: "Aggregate stats for a floor: total people, PI count, group count, paper count.",
    input_schema: { type: "object", properties: { floor: { type: "integer" } }, required: ["floor"] },
  },
  {
    name: "get_person_profile",
    description: "Full profile for one CSAIL person by their CSAIL nodeId. Returns bio, groups, rooms, recent papers, recent news mentions.",
    input_schema: { type: "object", properties: { nodeId: { type: "string", description: "CSAIL CMS node id (digits, e.g. 3831)" } }, required: ["nodeId"] },
  },
  {
    name: "search_people",
    description: "Fuzzy search for CSAIL people by name substring. Returns up to N matches with basic info.",
    input_schema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", default: 10 } }, required: ["query"] },
  },
  {
    name: "find_coauthors",
    description: "Find people in the Floor 7 cohort who have coauthored papers with this person. Sorted by paper count.",
    input_schema: { type: "object", properties: { nodeId: { type: "string" }, limit: { type: "integer", default: 10 } }, required: ["nodeId"] },
  },
  {
    name: "recent_news_for_person",
    description: "Recent CSAIL news articles mentioning this person, newest first.",
    input_schema: { type: "object", properties: { nodeId: { type: "string" }, limit: { type: "integer", default: 5 } }, required: ["nodeId"] },
  },
] as const;

export type ToolName = typeof TOOL_SPECS[number]["name"];

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "find_people_on_floor": return findPeopleOnFloor(input["floor"] as number);
    case "get_floor_summary": return getFloorSummary(input["floor"] as number);
    case "get_person_profile": return getPersonProfile(input["nodeId"] as string);
    case "search_people": return searchPeople(input["query"] as string, (input["limit"] as number) ?? 10);
    case "find_coauthors": return findCoauthors(input["nodeId"] as string, (input["limit"] as number) ?? 10);
    case "recent_news_for_person": return recentNewsForPerson(input["nodeId"] as string, (input["limit"] as number) ?? 5);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}
