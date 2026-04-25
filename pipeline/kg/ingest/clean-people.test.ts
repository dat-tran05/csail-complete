import { describe, expect, test } from "bun:test";
import {
  cleanBio,
  parseLastUpdated,
  parseRoom,
  normalizeRole,
  cleanPersonRecord,
  type RawPersonRecord,
} from "./clean-people";

describe("parseLastUpdated", () => {
  test("modern format", () => {
    const r = parseLastUpdated("Last updated Mar 26 '24");
    expect(r.iso?.startsWith("2024-03-26")).toBe(true);
    expect(r.stale).toBe(false);
  });
  test("stale", () => {
    const r = parseLastUpdated("Last updated Nov 19 '21");
    expect(r.stale).toBe(true);
  });
  test("garbage", () => {
    const r = parseLastUpdated("");
    expect(r.iso).toBeUndefined();
    expect(r.stale).toBe(false);
  });
});

describe("parseRoom", () => {
  test("G-wing 7th floor", () => {
    expect(parseRoom("32-G742")).toEqual({ id: "room:32-G742", floor: 7, wing: "G" });
  });
  test("D-wing 4th floor", () => {
    expect(parseRoom("32-D472")).toEqual({ id: "room:32-D472", floor: 4, wing: "D" });
  });
  test("no wing", () => {
    expect(parseRoom("32-376")).toEqual({ id: "room:32-376", floor: 3, wing: null });
  });
  test("non-Stata", () => {
    expect(parseRoom("46-203")).toBeNull();
  });
  test("null/empty", () => {
    expect(parseRoom(null)).toBeNull();
    expect(parseRoom("")).toBeNull();
  });
});

describe("normalizeRole", () => {
  test.each([
    ["Professor", "professor"],
    ["Associate Professor", "associate-professor"],
    ["Assistant Professor", "assistant-professor"],
    ["Graduate Student", "graduate-student"],
    ["PhD Student", "phd-student"],
    ["MEng Student", "meng-student"],
    ["UROP", "urop"],
    ["Postdoctoral Associate", "postdoc"],
    ["Postdoctoral Fellow", "postdoc"],
    ["Research Scientist", "research-scientist"],
    ["Research Affiliate", "research-affiliate"],
    ["Visiting Scientist", "visiting-scientist"],
    ["Administrative Assistant II", "admin"],
    ["Technical Associate 1", "technical-staff"],
    ["Some Made-Up Title", "other"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeRole(input)).toBe(expected);
  });
});

describe("cleanBio", () => {
  test("collapses mid-sentence newlines", () => {
    const raw = "She is also head of the\nComputation and Biology\ngroup.";
    expect(cleanBio(raw)).toBe("She is also head of the Computation and Biology group.");
  });
  test("preserves paragraph breaks", () => {
    const raw = "First paragraph.\n\nSecond paragraph.";
    expect(cleanBio(raw)).toBe("First paragraph.\n\nSecond paragraph.");
  });
});

describe("cleanPersonRecord", () => {
  const raw: RawPersonRecord = {
    url: "https://www.csail.mit.edu/person/foo-bar",
    node_id: "9999",
    name: "Foo Bar",
    role_tag: "PI",
    role_category: "Core/Dual",
    title: "Professor",
    email: "foo@csail.mit.edu",
    phone: "253-1234",
    room: "32-G742",
    room_map_url: null,
    photo_url: null,
    bio: "Hello\nworld.",
    website: "http://example.com",
    research_areas: ["AI & ML", "AI & ML", "Robotics"],
    impact_areas: ["Big Data"],
    last_updated: "Last updated Mar 16 '26",
    projects: [],
    groups: [{ type: "Research Group", title: "Foo Group", url: "https://www.csail.mit.edu/research/foo", teaser: "Foo." }],
  };
  const cleaned = cleanPersonRecord(raw);
  test("id and nodeId", () => {
    expect(cleaned.person.id).toBe("person:9999");
    expect(cleaned.person.nodeId).toBe("9999");
  });
  test("isPI flag", () => {
    expect(cleaned.person.isPI).toBe(true);
    expect(cleaned.person.isCoreOrDual).toBe(true);
  });
  test("dedupes research areas", () => {
    expect(cleaned.person.researchAreaIds).toEqual(["area:ai-and-ml", "area:robotics"]);
  });
  test("emits room with floor parsed", () => {
    expect(cleaned.rooms[0]?.floor).toBe(7);
  });
  test("emits group", () => {
    expect(cleaned.groups[0]?.kind).toBe("research-group");
    expect(cleaned.groups[0]?.slug).toBe("foo");
  });
});
