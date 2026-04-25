import time
import requests
from config import S2_API_KEY

BASE_URL = "https://api.semanticscholar.org/graph/v1"
AUTHOR_PAPER_FIELDS = "paperId,title,abstract,year,url"
SEARCH_FIELDS = "paperId,title,abstract,year,url,authors,tldr"


def _headers() -> dict:
    h = {}
    if S2_API_KEY:
        h["x-api-key"] = S2_API_KEY
    return h


def get_author_papers(author_id: str) -> list[dict]:
    papers = []
    offset = 0
    limit = 100

    while True:
        resp = requests.get(
            f"{BASE_URL}/author/{author_id}/papers",
            params={"fields": AUTHOR_PAPER_FIELDS, "limit": limit, "offset": offset},
            headers=_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        batch = data.get("data", [])
        papers.extend(batch)

        if len(batch) < limit:
            break
        offset += limit
        time.sleep(1)

    return papers


def search_papers(query: str, limit: int = 10) -> list[dict]:
    resp = requests.get(
        f"{BASE_URL}/paper/search",
        params={"query": query, "limit": limit, "fields": SEARCH_FIELDS},
        headers=_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    time.sleep(1)

    seen = set()
    results = []
    for paper in data.get("data", []):
        pid = paper.get("paperId")
        if pid and pid not in seen:
            seen.add(pid)
            results.append(paper)
    return results
