export {};
import { load } from "cheerio";
import { appendFileSync } from "node:fs";
import { closeDriver, withRead, withWrite } from "../client";
import { newsId } from "../../../shared/schema";

const ORPHANS_PATH = "data/news-orphans.jsonl";
const MAX_AGE_YEARS = 3;
// The CSAIL news listing page (?page=N) returns 403 — use sitemap.xml to discover URLs instead.
const SITEMAP_PAGES = [1, 2, 3, 4, 5];
const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - MAX_AGE_YEARS);

// Fetch with a plain curl-style default (no special UA needed for sitemap/article pages)
async function fetchText(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  const r = await fetch(url);
  const text = r.ok ? await r.text() : "";
  return { ok: r.ok, status: r.status, text };
}

/** Parse sitemap XML and return [{url, lastmod}] for /news/ entries within cutoff. */
async function getNewsUrlsFromSitemap(): Promise<Array<{ url: string; lastmod: string | null }>> {
  const results: Array<{ url: string; lastmod: string | null }> = [];
  for (const pg of SITEMAP_PAGES) {
    const sitemapUrl = `https://www.csail.mit.edu/sitemap.xml?page=${pg}`;
    console.log(`  sitemap page ${pg}: ${sitemapUrl}`);
    const { ok, status, text } = await fetchText(sitemapUrl);
    if (!ok) { console.log(`    HTTP ${status}, skipping`); continue; }
    // Parse <url><loc>…</loc><lastmod>…</lastmod></url> entries
    const urlBlocks = text.matchAll(/<url>([\s\S]*?)<\/url>/g);
    for (const block of urlBlocks) {
      const locMatch = block[1].match(/<loc>([^<]+)<\/loc>/);
      const lastmodMatch = block[1].match(/<lastmod>([^<]+)<\/lastmod>/);
      const loc = locMatch?.[1]?.trim();
      if (!loc || !loc.includes("/news/")) continue;
      // Filter by lastmod if available
      const lastmod = lastmodMatch?.[1]?.trim() ?? null;
      if (lastmod) {
        const d = new Date(lastmod);
        if (!isNaN(d.getTime()) && d < cutoff) continue;
      }
      results.push({ url: loc, lastmod: lastmod ?? null });
    }
  }
  // Deduplicate by URL
  const seen = new Set<string>();
  return results.filter(({ url }) => seen.has(url) ? false : (seen.add(url), true));
}

interface KnownPersons { bySlug: Map<string, string>; byNodeId: Map<string, string>; }
const known: KnownPersons = await withRead(async (s) => {
  const r = await s.run(`MATCH (p:Person) RETURN p.nodeId AS nodeId, p.csailUrlSlug AS slug, p.name AS name`);
  const bySlug = new Map<string, string>(), byNodeId = new Map<string, string>();
  for (const rec of r.records) {
    const nodeId = rec.get("nodeId") as string;
    const slug = rec.get("slug") as string | null;
    if (slug) bySlug.set(slug, nodeId);
    byNodeId.set(nodeId, rec.get("name") as string);
  }
  return { bySlug, byNodeId };
});
const knownGroups: Set<string> = await withRead(async (s) => {
  const r = await s.run(`MATCH (g:Group) RETURN g.slug AS slug`);
  return new Set(r.records.map((rec) => rec.get("slug") as string));
});

console.log("Collecting news URLs from sitemap…");
const newsEntries = await getNewsUrlsFromSitemap();
console.log(`Found ${newsEntries.length} news URLs within the ${MAX_AGE_YEARS}-year cutoff.`);

let articleCount = 0, mentionCount = 0;
for (const { url: fullUrl, lastmod } of newsEntries) {
  const path = new URL(fullUrl).pathname; // e.g. /news/some-slug
  try {
    const { ok, status, text } = await fetchText(fullUrl);
    if (!ok) { console.error(`  HTTP ${status}: ${fullUrl}`); continue; }
    const $$ = load(text);
    const title = $$("h1").first().text().trim();
    const dateText = $$("time").first().attr("datetime") ?? $$("time").first().text().trim();
    // Fall back to sitemap lastmod if no <time> element found
    const publishedAt = parseDateMaybe(dateText) ?? parseDateMaybe(lastmod ?? undefined);
    if (publishedAt && new Date(publishedAt) < cutoff) continue;

    const slug = path.replace(/^\/news\//, "").replace(/\/$/, "");
    const nid = newsId(`csail:${slug}`);
    const body = $$("article").text().replace(/\s+/g, " ").trim().slice(0, 5000);
    const excerpt = body.slice(0, 300);

    const personIds = new Set<string>();
    const groupIds = new Set<string>();
    $$('a[href^="/person/"]').each((_, el) => {
      const personSlug = ($$(el).attr("href") ?? "").replace(/^\/person\//, "").replace(/\/$/, "");
      const nodeId = known.bySlug.get(personSlug);
      if (nodeId) personIds.add(nodeId);
      else appendFileSync(ORPHANS_PATH, JSON.stringify({ news: slug, kind: "person", slug: personSlug }) + "\n");
    });
    $$('a[href^="/research/"]').each((_, el) => {
      const groupSlug = ($$(el).attr("href") ?? "").replace(/^\/research\//, "").replace(/\/$/, "");
      if (knownGroups.has(groupSlug)) groupIds.add(groupSlug);
      else appendFileSync(ORPHANS_PATH, JSON.stringify({ news: slug, kind: "group", slug: groupSlug }) + "\n");
    });

    await withWrite(async (s) => {
      await s.run(
        `MERGE (n:NewsItem {slug: $slug})
         ON CREATE SET n.id = $id, n.title = $title, n.publishedAt = $publishedAt, n.url = $url,
                       n.excerpt = $excerpt, n.body = $body
         SET n.title = $title, n.excerpt = $excerpt, n.body = $body`,
        { slug, id: nid, title, publishedAt: publishedAt ?? null, url: fullUrl, excerpt, body }
      );
      for (const nodeId of personIds) {
        await s.run(
          `MATCH (p:Person {nodeId: $nodeId}), (n:NewsItem {slug: $slug})
           MERGE (p)-[r:MENTIONED_IN]->(n) SET r.source = "csail-news", r.fetchedAt = $now`,
          { nodeId, slug, now: new Date().toISOString() }
        );
        mentionCount++;
      }
      for (const gslug of groupIds) {
        await s.run(
          `MATCH (g:Group {slug: $gslug}), (n:NewsItem {slug: $slug})
           MERGE (g)-[r:MENTIONED_IN]->(n) SET r.source = "csail-news", r.fetchedAt = $now`,
          { gslug, slug, now: new Date().toISOString() }
        );
        mentionCount++;
      }
    });
    articleCount++;
    if (articleCount % 25 === 0) console.log(`  …${articleCount} articles, ${mentionCount} mentions so far`);
  } catch (e) {
    console.error(`  ${fullUrl}: ${e instanceof Error ? e.message : String(e)}`);
  }
  await new Promise((r) => setTimeout(r, 200));
}
await closeDriver();
console.log(`Done. ${articleCount} articles, ${mentionCount} mentions.`);

function parseDateMaybe(text: string | undefined): string | null {
  if (!text) return null;
  const d = new Date(text);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
