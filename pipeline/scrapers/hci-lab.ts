#!/usr/bin/env bun
import { writeFile, readFile } from "node:fs/promises";
import { load as loadHtml } from "cheerio";
import type { Person, Group } from "../../shared/schema/kg";

// The homepage lists people inline on the single page (Jekyll/GitHub Pages static site).
// people.html and people/ both 404; the main URL works.
const HCI_PEOPLE_URL = "https://hci.csail.mit.edu/";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Known non-person link texts to skip (group names, nav items, project titles, etc.)
const SKIP_TEXTS = new Set([
  "People",
  "Research",
  "Classes",
  "Seminar",
  "Alumni",
  "Join us!",
  "MIT EECS PhD program",
  "HCI Engineering Group",
  "HCI Engineering",
  "Software Design Group",
  "Software Design",
  "Haystack Group",
  "Haystack",
  "Usable Programming Group",
  "Usable Programming",
  "Visualization Group",
  "Visualization",
  "Accessibility",
  "Previous semesters",
  "See all alumni",
  "📫 Subscribe",
  "✉️ Contact",
  "HCI Seminar",
  "Project Page",
  "Lenticular Objects",
  "Multimodal Ouija Board",
  "Human-AI Resonance",
]);

// Regex: allow names with capitals, spaces, hyphens, apostrophes,
// dots (middle initials), extended Latin (accented chars), and parenthetical nicknames.
// Covers: "David R. Karger", "Zana Buçinca", "Shih-Lun Wu", "Abutalib (Barish) Namazov"
const NAME_RE =
  /^[A-Z\xC0-\xFF][a-zA-Z\xC0-\xFF.\-']+(\s+[A-Z\xC0-\xFF(][a-zA-Z\xC0-\xFF.\-')]+)+$/;

// Group/lab keywords + project name fragments to reject even if the regex would pass
const GROUP_KEYWORDS =
  /\b(Group|Lab|Laboratory|Center|Institute|Program|Programming|Seminar|Workshop|Robotics|Systems|Networks?|Computing|Intelligence|Design|Media|Agents?|Dynamics|Environments?|Interfaces?|Robots?|Vision|Interactive|Perceptual|Lifelong|Affective|Camera|Culture|Fluid|Personal|Software|Spoken|Tangible|Responsive|Living|Ideation|Objects?|Board|Ouija|Lenticular|EIT|SensiCut|MetaSense|Fabricaide|Platener|ChromoUpdate|WirePrint|FoodFab|LaserFactory|faBrickation)\b/i;

async function scrapeHciMembers(): Promise<Person[]> {
  console.log(`Fetching ${HCI_PEOPLE_URL} ...`);
  const res = await fetch(HCI_PEOPLE_URL, {
    headers: {
      "User-Agent": "csail-complete/0.1 (contact: datt@mit.edu)",
    },
  });
  if (!res.ok) {
    throw new Error(`HCI page returned ${res.status}`);
  }
  const html = await res.text();
  const $ = loadHtml(html);

  const people: Person[] = [];
  const seen = new Set<string>();

  $("a").each((_, el) => {
    const $a = $(el);
    const text = $a.text().trim();
    const href = $a.attr("href") ?? "";

    // Length filter
    if (!text || text.length < 4 || text.length > 60) return;

    // Skip known non-person texts
    if (SKIP_TEXTS.has(text)) return;

    // Skip mailto links that look like email addresses (not names)
    if (href.startsWith("mailto:") && text.includes("@")) return;

    // Must look like a name
    if (!NAME_RE.test(text)) return;

    // Must not contain group/lab/project keywords
    if (GROUP_KEYWORDS.test(text)) return;

    const id = slugify(text);
    if (seen.has(id)) return;
    seen.add(id);

    let homepage: string | undefined;
    if (href.startsWith("http")) {
      homepage = href;
    } else if (href.startsWith("/") && href.length > 1) {
      homepage = `https://hci.csail.mit.edu${href}`;
    }

    people.push({
      id,
      name: text,
      affiliation: "CSAIL",
      groupIds: ["hci-lab"],
      roomIds: ["32-G743"],
      homepage,
    });
  });

  return people;
}

async function main() {
  let people: Person[];
  try {
    people = await scrapeHciMembers();
    if (people.length < 2) {
      throw new Error(
        `Only ${people.length} members found — page format may have changed`
      );
    }
    console.log(`Found ${people.length} HCI Lab members.`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`Scraper failed: ${msg}`);
    console.error(
      `Falling back to data/people-fallback.json (3 hand-typed entries).`
    );
    const fallback = await readFile("data/people-fallback.json", "utf-8");
    people = JSON.parse(fallback) as Person[];
  }

  await writeFile("data/people.json", JSON.stringify(people, null, 2));
  console.log(`Wrote ${people.length} people to data/people.json`);

  const groupsRaw = await readFile("data/groups.json", "utf-8");
  const groups = JSON.parse(groupsRaw) as Group[];
  const hci = groups.find((g) => g.id === "hci-lab");
  if (hci) {
    hci.memberIds = people.map((p) => p.id);
    await writeFile("data/groups.json", JSON.stringify(groups, null, 2));
    console.log(
      `Patched data/groups.json: hci-lab.memberIds now has ${hci.memberIds.length} entries`
    );
  }
}

await main();
