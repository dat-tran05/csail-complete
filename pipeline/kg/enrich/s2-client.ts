export {};

const S2_BASE = "https://api.semanticscholar.org/graph/v1";
const API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;
let lastReqAt = 0;
const MIN_INTERVAL_MS = API_KEY ? 100 : 1100;

async function throttle() {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastReqAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastReqAt = Date.now();
}

export interface S2Author { authorId: string; name: string; affiliations?: string[]; paperCount?: number; }
export interface S2Paper {
  paperId: string;
  externalIds?: { DOI?: string; ArXiv?: string };
  title: string;
  abstract?: string;
  year?: number;
  venue?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  openAccessPdf?: { url: string };
  authors?: { authorId: string | null; name: string }[];
}

export async function s2Get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  await throttle();
  const url = new URL(`${S2_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const headers: Record<string, string> = { Accept: "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;
  const resp = await fetch(url, { headers });
  if (resp.status === 429) {
    await new Promise((r) => setTimeout(r, 5000));
    return s2Get<T>(path, params);
  }
  if (!resp.ok) throw new Error(`S2 ${resp.status} ${resp.statusText}: ${url}`);
  return await resp.json() as T;
}

export async function searchAuthors(name: string): Promise<S2Author[]> {
  const data = await s2Get<{ data: S2Author[] }>("/author/search", {
    query: name, limit: 10, fields: "authorId,name,affiliations,paperCount",
  });
  return data.data ?? [];
}

export async function authorPapers(authorId: string, limit: number, offset = 0): Promise<S2Paper[]> {
  const fields = "paperId,externalIds,title,abstract,year,venue,citationCount,influentialCitationCount,openAccessPdf,authors";
  const data = await s2Get<{ data: S2Paper[] }>(`/author/${authorId}/papers`, { fields, limit, offset });
  return data.data ?? [];
}

const MIT_REGEX = /\b(MIT|Massachusetts Institute of Technology|CSAIL)\b/i;
export function isMITAffiliated(a: S2Author): boolean {
  return (a.affiliations ?? []).some((s) => MIT_REGEX.test(s));
}
