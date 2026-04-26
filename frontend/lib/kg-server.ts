/**
 * Server-only Neo4j accessors. Composes with the existing `agents/kg/tools/*`
 * helpers and adds the Dossier/Directory/Atlas-shaped queries the UI needs.
 *
 * Never import this from a client component.
 */
import { withRead } from "../../agents/kg/client";

function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber(): number }).toNumber();
  return Number(v ?? 0);
}

type Props = Record<string, unknown>;
function props<T = Props>(node: unknown): T {
  if (node && typeof node === "object" && "properties" in node) {
    return (node as { properties: T }).properties;
  }
  return {} as T;
}

/* ─────────────── PERSON ─────────────── */

export async function getPerson(idOrNodeId: string) {
  // Accept either the bare nodeId ("13720") or the branded form ("person:13720").
  const nodeId = idOrNodeId.replace(/^person:/, "");
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Person)
       WHERE p.nodeId = $nodeId OR p.id = $nodeId OR p.id = ('person:' + $nodeId)
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       OPTIONAL MATCH (p)-[:LOCATED_IN]->(rm:Room)
       OPTIONAL MATCH (p)-[:AUTHORED]->(pp:Paper)
       OPTIONAL MATCH (p)-[:MENTIONED_IN]->(n:NewsItem)
       OPTIONAL MATCH (p)-[ca:COAUTHORED_WITH]-(c:Person)
       RETURN p,
              collect(DISTINCT g) AS groups,
              collect(DISTINCT rm) AS rooms,
              collect(DISTINCT pp) AS papers,
              collect(DISTINCT n) AS news,
              collect(DISTINCT { c: c, edge: ca }) AS coauthors`,
      { nodeId }
    );
    if (r.records.length === 0) return null;
    const rec = r.records[0]!;
    const p = props<{
      id: string; nodeId: string; name: string; title: string; role: string;
      isPI: boolean; bio?: string; homepage?: string; photoUrl?: string; stale?: boolean;
    }>(rec.get("p"));

    const groups = (rec.get("groups") as unknown[]).map((node) => {
      const g = props<{ id: string; name: string; shortName?: string; color?: string }>(node);
      return { id: g.id, name: g.name, shortName: g.shortName, color: g.color };
    });

    const rooms = (rec.get("rooms") as unknown[]).map((node) => {
      const rm = props<{ id: string; number: string; floor: number }>(node);
      return { id: rm.id, number: rm.number, floor: toInt(rm.floor) };
    });

    const papers = (rec.get("papers") as unknown[])
      .map((node) => {
        const pp = props<{ id: string; title: string; venue?: string; year: number; citationCount?: number }>(node);
        return { id: pp.id, title: pp.title, venue: pp.venue, year: toInt(pp.year),
                 citationCount: pp.citationCount !== undefined ? toInt(pp.citationCount) : undefined };
      })
      .sort((a, b) => b.year - a.year)
      .slice(0, 12);

    const news = (rec.get("news") as unknown[])
      .map((node) => {
        const n = props<{ id: string; title: string; publishedAt?: string }>(node);
        return { id: n.id, title: n.title, publishedAt: n.publishedAt ?? "" };
      })
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .slice(0, 6);

    const coauthors = (rec.get("coauthors") as { c: unknown; edge: unknown }[])
      .filter((x) => x.c)
      .map((x) => {
        const c = props<{ nodeId: string; name: string }>(x.c);
        const edge = props<{ paperCount?: number }>(x.edge);
        return { id: c.nodeId, name: c.name, sharedPaperCount: toInt(edge.paperCount ?? 0) };
      })
      .sort((a, b) => b.sharedPaperCount - a.sharedPaperCount)
      .slice(0, 8);

    return {
      person: {
        id: p.nodeId,
        name: p.name,
        title: p.title,
        role: p.role ?? "other",
        isPI: !!p.isPI,
        bio: p.bio,
        homepage: p.homepage,
        photoUrl: p.photoUrl,
        stale: !!p.stale,
      },
      groups,
      rooms,
      papers,
      news,
      coauthors,
    };
  });
}

/* ─────────────── GROUP ─────────────── */

export async function getGroup(slugOrId: string) {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (g:Group)
       WHERE g.id = $id OR g.slug = $id OR g.id = ('group:' + $id)
       OPTIONAL MATCH (pi:Person)-[:PI_OF]->(g)
       OPTIONAL MATCH (m:Person)-[:MEMBER_OF]->(g)
       OPTIONAL MATCH (g)<-[:BELONGS_TO]-(rm:Room)
       OPTIONAL MATCH (proj:Project)-[:BELONGS_TO]->(g)
       OPTIONAL MATCH (g)<-[:AUTHORED_BY|BELONGS_TO]-(pp:Paper)
       RETURN g,
              collect(DISTINCT pi) AS pis,
              collect(DISTINCT m) AS members,
              collect(DISTINCT rm) AS rooms,
              collect(DISTINCT proj) AS projects,
              count(DISTINCT pp) AS paperCount`,
      { id: slugOrId }
    );
    if (r.records.length === 0) return null;
    const rec = r.records[0]!;
    const g = props<{
      id: string; slug: string; name: string; shortName?: string; kind: string;
      teaser?: string; color?: string; url?: string;
    }>(rec.get("g"));

    const pis = (rec.get("pis") as unknown[]).filter(Boolean).map((node) => {
      const p = props<{ nodeId: string; name: string; photoUrl?: string }>(node);
      return { id: p.nodeId, name: p.name, photoUrl: p.photoUrl };
    });

    const members = (rec.get("members") as unknown[]).filter(Boolean).map((node) => {
      const p = props<{ nodeId: string; name: string; role: string }>(node);
      return { id: p.nodeId, name: p.name, role: p.role };
    });

    const rooms = (rec.get("rooms") as unknown[]).filter(Boolean).map((node) => {
      const rm = props<{ id: string; number: string }>(node);
      return { id: rm.id, number: rm.number };
    });

    const projects = (rec.get("projects") as unknown[]).filter(Boolean).map((node) => {
      const p = props<{ id: string; title: string }>(node);
      return { id: p.id, title: p.title };
    });

    return {
      group: {
        id: g.id, slug: g.slug, name: g.name, shortName: g.shortName, kind: g.kind,
        teaser: g.teaser, color: g.color, url: g.url,
      },
      pis,
      members,
      rooms,
      projects,
      paperCount: toInt(rec.get("paperCount")),
    };
  });
}

/* ─────────────── PROJECT ─────────────── */

export async function getProject(slugOrId: string) {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Project)
       WHERE p.id = $id OR p.slug = $id OR p.id = ('project:' + $id)
       OPTIONAL MATCH (p)-[:BELONGS_TO]->(g:Group)
       OPTIONAL MATCH (c:Person)-[:WORKS_ON]->(p)
       RETURN p,
              collect(DISTINCT g) AS groups,
              collect(DISTINCT c) AS contributors`,
      { id: slugOrId }
    );
    if (r.records.length === 0) return null;
    const rec = r.records[0]!;
    const proj = props<{ id: string; slug: string; title: string; url?: string; teaser?: string }>(rec.get("p"));
    const groups = (rec.get("groups") as unknown[]).filter(Boolean).map((node) => {
      const g = props<{ id: string; name: string; shortName?: string; color?: string }>(node);
      return { id: g.id, name: g.name, shortName: g.shortName, color: g.color };
    });
    const contributors = (rec.get("contributors") as unknown[]).filter(Boolean).map((node) => {
      const p = props<{ nodeId: string; name: string }>(node);
      return { id: p.nodeId, name: p.name };
    });
    return { project: { id: proj.id, title: proj.title, url: proj.url, teaser: proj.teaser }, groups, contributors };
  });
}

/* ─────────────── PAPER ─────────────── */

export async function getPaper(idOrKey: string) {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Paper) WHERE p.id = $id OR p.semanticScholarId = $id OR p.id = ('paper:' + $id)
       OPTIONAL MATCH (a:Person)-[:AUTHORED]->(p)
       OPTIONAL MATCH (p)-[:BELONGS_TO]->(g:Group)
       RETURN p,
              collect(DISTINCT a) AS authors,
              collect(DISTINCT g) AS groups`,
      { id: idOrKey }
    );
    if (r.records.length === 0) return null;
    const rec = r.records[0]!;
    const p = props<{
      id: string; title: string; abstract?: string; year: number; venue?: string;
      citationCount?: number; openAccessPdfUrl?: string; doi?: string; arxivId?: string;
      externalAuthorNames?: string[];
    }>(rec.get("p"));
    const internalAuthors = (rec.get("authors") as unknown[]).filter(Boolean).map((node) => {
      const a = props<{ nodeId: string; name: string }>(node);
      return { id: a.nodeId, name: a.name, isInternal: true };
    });
    const externalAuthors = (p.externalAuthorNames ?? []).map((n) => ({ id: n, name: n, isInternal: false }));
    const authors = [...internalAuthors, ...externalAuthors];
    const groups = (rec.get("groups") as unknown[]).filter(Boolean).map((node) => {
      const g = props<{ id: string; name: string; shortName?: string; color?: string }>(node);
      return { id: g.id, name: g.name, shortName: g.shortName, color: g.color };
    });
    return {
      paper: {
        id: p.id, title: p.title, abstract: p.abstract,
        year: toInt(p.year), venue: p.venue,
        citationCount: p.citationCount !== undefined ? toInt(p.citationCount) : undefined,
        openAccessPdfUrl: p.openAccessPdfUrl, doi: p.doi, arxivId: p.arxivId,
      },
      authors,
      groups,
    };
  });
}

/* ─────────────── NEWS ─────────────── */

export async function getNews(idOrSlug: string) {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (n:NewsItem) WHERE n.id = $id OR n.slug = $id OR n.id = ('news:' + $id)
       OPTIONAL MATCH (n)<-[:MENTIONED_IN]-(p:Person)
       OPTIONAL MATCH (n)-[:ABOUT|BELONGS_TO]->(g:Group)
       RETURN n,
              collect(DISTINCT p) AS people,
              collect(DISTINCT g) AS groups`,
      { id: idOrSlug }
    );
    if (r.records.length === 0) return null;
    const rec = r.records[0]!;
    const n = props<{
      id: string; title: string; publishedAt: string; url: string; excerpt?: string; imageUrl?: string;
    }>(rec.get("n"));
    const people = (rec.get("people") as unknown[]).filter(Boolean).map((node) => {
      const p = props<{ nodeId: string; name: string }>(node);
      return { id: p.nodeId, name: p.name };
    });
    const groups = (rec.get("groups") as unknown[]).filter(Boolean).map((node) => {
      const g = props<{ id: string; name: string; shortName?: string; color?: string }>(node);
      return { id: g.id, name: g.name, shortName: g.shortName, color: g.color };
    });
    return { news: n, people, groups };
  });
}

/* ─────────────── AREA ─────────────── */

export async function getArea(idOrSlug: string) {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (a:Area) WHERE a.id = $id OR a.slug = $id OR a.id = ('area:' + $id)
       OPTIONAL MATCH (g:Group)-[:WORKS_IN_AREA|HAS_IMPACT_ON]->(a)
       OPTIONAL MATCH (p:Person)-[:WORKS_IN_AREA|HAS_IMPACT_ON]->(a)
       OPTIONAL MATCH (pp:Paper)-[:BELONGS_TO]->(:Group)-[:WORKS_IN_AREA]->(a)
       RETURN a,
              collect(DISTINCT g) AS groups,
              count(DISTINCT p) AS peopleCount,
              count(DISTINCT pp) AS paperCount`,
      { id: idOrSlug }
    );
    if (r.records.length === 0) return null;
    const rec = r.records[0]!;
    const a = props<{ id: string; slug: string; name: string; kind: string }>(rec.get("a"));
    const groups = (rec.get("groups") as unknown[]).filter(Boolean).map((node) => {
      const g = props<{ id: string; name: string; shortName?: string; color?: string }>(node);
      return { id: g.id, name: g.name, shortName: g.shortName, color: g.color };
    });
    return {
      area: { id: a.id, name: a.name, kind: a.kind },
      groups,
      peopleCount: toInt(rec.get("peopleCount")),
      paperCount: toInt(rec.get("paperCount")),
    };
  });
}

/* ─────────────── LIST APIS (for /directory) ─────────────── */

export async function listPeople(opts: { limit?: number; cursor?: number; group?: string; role?: string; floor?: number; q?: string } = {}) {
  const limit = Math.min(opts.limit ?? 60, 200);
  const skip  = opts.cursor ?? 0;
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Person)
       ${opts.group ? `MATCH (p)-[:MEMBER_OF]->(:Group { id: $group })` : ""}
       ${opts.floor ? `MATCH (p)-[:LOCATED_IN]->(:Room { floor: $floor })` : ""}
       ${opts.role ? `WITH p WHERE p.role = $role` : ""}
       ${opts.q ? `WITH p WHERE toLower(p.name) CONTAINS toLower($q)` : ""}
       OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:Group)
       OPTIONAL MATCH (p)-[:LOCATED_IN]->(rm:Room)
       OPTIONAL MATCH (p)-[:AUTHORED]->(pp:Paper)
       WITH p, rm, collect(DISTINCT { id: g.id, name: g.name, color: g.color }) AS groups, count(DISTINCT pp) AS paperCount
       RETURN p.nodeId AS id, p.name AS name, p.title AS title, p.role AS role,
              p.isPI AS isPI, p.photoUrl AS photoUrl, p.stale AS stale,
              rm.id AS roomId, rm.number AS roomNumber, rm.floor AS floor,
              groups, paperCount
       ORDER BY p.isPI DESC, p.name
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      { skip, limit, group: opts.group, role: opts.role, floor: opts.floor, q: opts.q }
    );
    return r.records.map((rec) => ({
      id: rec.get("id") as string,
      name: rec.get("name") as string,
      title: (rec.get("title") as string) ?? "",
      role: (rec.get("role") as string) ?? "other",
      isPI: !!rec.get("isPI"),
      photoUrl: rec.get("photoUrl") as string | null,
      stale: !!rec.get("stale"),
      room: rec.get("roomId") ? {
        id: rec.get("roomId") as string,
        number: rec.get("roomNumber") as string,
        floor: toInt(rec.get("floor")),
      } : null,
      groups: (rec.get("groups") as { id: string; name: string; color?: string }[])
        .filter((g) => g.id),
      paperCount: toInt(rec.get("paperCount")),
    }));
  });
}

export async function listGroups() {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (g:Group)
       OPTIONAL MATCH (m:Person)-[:MEMBER_OF]->(g)
       OPTIONAL MATCH (proj:Project)-[:BELONGS_TO]->(g)
       OPTIONAL MATCH (g)<-[:BELONGS_TO]-(rm:Room)
       OPTIONAL MATCH (pi:Person)-[:PI_OF]->(g)
       RETURN g.id AS id, g.slug AS slug, g.name AS name, g.shortName AS shortName,
              g.kind AS kind, g.color AS color, g.teaser AS teaser,
              count(DISTINCT m) AS memberCount,
              count(DISTINCT proj) AS projectCount,
              count(DISTINCT rm)   AS roomCount,
              collect(DISTINCT pi.name)[..3] AS piNames
       ORDER BY g.name`
    );
    return r.records.map((rec) => ({
      id: rec.get("id") as string,
      slug: rec.get("slug") as string,
      name: rec.get("name") as string,
      shortName: rec.get("shortName") as string | null,
      kind: (rec.get("kind") as string) ?? "research-group",
      color: rec.get("color") as string | null,
      teaser: rec.get("teaser") as string | null,
      memberCount: toInt(rec.get("memberCount")),
      projectCount: toInt(rec.get("projectCount")),
      roomCount: toInt(rec.get("roomCount")),
      piNames: (rec.get("piNames") as string[]).filter(Boolean),
    }));
  });
}

export async function listProjects() {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Project)
       OPTIONAL MATCH (p)-[:BELONGS_TO]->(g:Group)
       OPTIONAL MATCH (c:Person)-[:WORKS_ON]->(p)
       RETURN p.id AS id, p.title AS title, p.url AS url, p.teaser AS teaser,
              collect(DISTINCT { id: g.id, name: g.name, color: g.color, shortName: g.shortName }) AS groups,
              count(DISTINCT c) AS contributorCount
       ORDER BY p.title`
    );
    return r.records.map((rec) => ({
      id: rec.get("id") as string,
      title: rec.get("title") as string,
      url: rec.get("url") as string | null,
      teaser: rec.get("teaser") as string | null,
      groups: (rec.get("groups") as { id: string; name: string; color?: string; shortName?: string }[]).filter((g) => g.id),
      contributorCount: toInt(rec.get("contributorCount")),
    }));
  });
}

export async function listPapers(limit = 100) {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (p:Paper)
       OPTIONAL MATCH (a:Person)-[:AUTHORED]->(p)
       RETURN p.id AS id, p.title AS title, p.year AS year, p.venue AS venue,
              p.citationCount AS cites,
              collect(DISTINCT a.name)[..6] AS authors
       ORDER BY p.year DESC, p.citationCount DESC
       LIMIT toInteger($limit)`,
      { limit }
    );
    return r.records.map((rec) => ({
      id: rec.get("id") as string,
      title: rec.get("title") as string,
      year: toInt(rec.get("year")),
      venue: rec.get("venue") as string | null,
      citationCount: rec.get("cites") !== null ? toInt(rec.get("cites")) : null,
      authors: (rec.get("authors") as string[]).filter(Boolean),
    }));
  });
}

export async function listNews(limit = 100) {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (n:NewsItem)
       RETURN n.id AS id, n.title AS title, n.publishedAt AS publishedAt,
              n.url AS url, n.excerpt AS excerpt, n.imageUrl AS imageUrl
       ORDER BY n.publishedAt DESC
       LIMIT toInteger($limit)`,
      { limit }
    );
    return r.records.map((rec) => ({
      id: rec.get("id") as string,
      title: rec.get("title") as string,
      publishedAt: (rec.get("publishedAt") as string) ?? "",
      url: rec.get("url") as string,
      excerpt: rec.get("excerpt") as string | null,
      imageUrl: rec.get("imageUrl") as string | null,
    }));
  });
}

export async function listAreas() {
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (a:Area)
       OPTIONAL MATCH (g:Group)-[:WORKS_IN_AREA|HAS_IMPACT_ON]->(a)
       RETURN a.id AS id, a.slug AS slug, a.name AS name, a.kind AS kind,
              count(DISTINCT g) AS groupCount
       ORDER BY a.name`
    );
    return r.records.map((rec) => ({
      id: rec.get("id") as string,
      slug: rec.get("slug") as string,
      name: rec.get("name") as string,
      kind: (rec.get("kind") as string) ?? "research",
      groupCount: toInt(rec.get("groupCount")),
    }));
  });
}

/* ─────────────── GRAPH (for /atlas) ─────────────── */

export async function getGraph(opts: { types?: string[]; floor7Only?: boolean; limit?: number } = {}) {
  const limit = opts.limit ?? 1500;
  return withRead(async (s) => {
    const r = await s.run(
      `MATCH (n) WHERE labels(n)[0] IN $types
       ${opts.floor7Only ? `AND (
            (n:Person AND EXISTS { (n)-[:LOCATED_IN]->(:Room { floor: 7 }) })
         OR (n:Group AND EXISTS { (:Person)-[:MEMBER_OF]->(n)-[:BELONGS_TO]-() })
         OR (n:Room AND n.floor = 7)
         OR (n:Project)
         OR (n:Area)
         OR (n:Paper)
         OR (n:NewsItem)
       )` : ""}
       WITH n LIMIT toInteger($limit)
       OPTIONAL MATCH (n)-[r]-(m)
       WHERE labels(m)[0] IN $types
       RETURN collect(DISTINCT n) AS nodes, collect(DISTINCT { from: id(startNode(r)), to: id(endNode(r)), type: type(r) }) AS edges`,
      { types: opts.types ?? ["Person", "Group", "Project", "Paper", "NewsItem", "Area", "Room"], limit }
    );
    if (r.records.length === 0) return { nodes: [], edges: [] };
    const rec = r.records[0]!;
    const rawNodes = rec.get("nodes") as unknown[];

    const nodes = rawNodes.map((node) => {
      // neo4j-driver gives us Node objects with .identity, .labels, .properties
      const n = node as { identity: { toString(): string; toNumber?(): number }; labels: string[]; properties: Record<string, unknown> };
      const labels = n.labels;
      const kind: string = labels[0] === "NewsItem" ? "news" : (labels[0] ?? "Unknown").toLowerCase();
      const p = n.properties;
      const idStr = (p.id as string) ?? (p.nodeId as string) ?? n.identity.toString();
      return {
        nid: typeof n.identity === "object" && "toNumber" in n.identity && n.identity.toNumber ? n.identity.toNumber() : Number(n.identity),
        kind,
        id: idStr,
        label: (p.name as string) ?? (p.title as string) ?? (p.number as string) ?? idStr,
        color: p.color as string | undefined,
        meta: {
          shortName: p.shortName as string | undefined,
          year: p.year ? toInt(p.year) : undefined,
          isPI: !!p.isPI,
          floor: p.floor ? toInt(p.floor) : undefined,
        },
      };
    });

    const edges = (rec.get("edges") as { from: { toNumber?: () => number }; to: { toNumber?: () => number }; type: string }[])
      .filter((e) => e && e.from && e.to)
      .map((e) => ({
        from: typeof e.from === "object" && e.from.toNumber ? e.from.toNumber() : Number(e.from),
        to:   typeof e.to   === "object" && e.to.toNumber   ? e.to.toNumber()   : Number(e.to),
        type: e.type,
      }));

    return { nodes, edges };
  });
}
