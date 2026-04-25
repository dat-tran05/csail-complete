"""
Web scraping pipeline for Jackson's website corpus.

Fetches seed URLs, extracts clean plain text, saves to data/website/.
Crawls same-domain links up to the configured depth per seed.

Usage:
  python context/scrape.py                         # scrape all seeds from config.py
  python context/scrape.py --url https://... --depth 1   # scrape a single URL
  python context/scrape.py --overwrite             # re-scrape even if file exists
"""

import sys
import re
import time
import argparse
import hashlib
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import SCRAPE_SEEDS, WEBSITE_DIR, SCRAPE_DELAY_SECONDS

OUTPUT_DIR = Path(WEBSITE_DIR)

# Tags whose entire subtree should be discarded before text extraction
_DISCARD_TAGS = {
    "script", "style", "noscript", "nav", "footer", "header",
    "aside", "form", "button", "svg", "img", "figure", "iframe",
    "meta", "link", "head",
}

_SESSION = requests.Session()
_SESSION.headers["User-Agent"] = (
    "Mozilla/5.0 (compatible; JacksonAgentBot/1.0; research scraper)"
)


def _url_to_filename(url: str) -> str:
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")
    path = parsed.path.strip("/").replace("/", "_") or "index"
    # Truncate and sanitize
    slug = re.sub(r"[^a-zA-Z0-9_\-]", "_", f"{domain}_{path}")[:120]
    return f"{slug}.txt"


def _same_domain(base: str, candidate: str) -> bool:
    b = urlparse(base)
    c = urlparse(candidate)
    # Strip www. for comparison
    return b.netloc.replace("www.", "") == c.netloc.replace("www.", "")


def _extract_text(html: str, url: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup.find_all(_DISCARD_TAGS):
        tag.decompose()

    # Extract title
    title = soup.find("title")
    title_text = title.get_text(strip=True) if title else ""

    # Pull all remaining text, collapsing whitespace
    raw = soup.get_text(separator="\n")
    lines = []
    for line in raw.splitlines():
        line = line.strip()
        if len(line) > 1:          # skip single chars / blank lines
            lines.append(line)

    # Collapse runs of blank lines
    cleaned: list[str] = []
    prev_blank = False
    for line in lines:
        if not line:
            if not prev_blank:
                cleaned.append("")
            prev_blank = True
        else:
            cleaned.append(line)
            prev_blank = False

    body = "\n".join(cleaned).strip()
    if title_text:
        body = f"{title_text}\n{'=' * len(title_text)}\n\n{body}"
    return body


def _collect_links(html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    links = []
    for tag in soup.find_all("a", href=True):
        href = tag["href"].strip()
        if href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        absolute = urljoin(base_url, href)
        absolute, _ = urldefrag(absolute)   # strip fragment
        if absolute.startswith("http") and _same_domain(base_url, absolute):
            links.append(absolute)
    return list(dict.fromkeys(links))       # deduplicate, preserve order


def _normalize(url: str) -> str:
    """Canonicalize URL: strip fragment, ensure path has trailing slash only for bare domains."""
    url, _ = urldefrag(url)
    p = urlparse(url)
    # Normalize trailing slash on path so /foo and /foo/ count as the same
    path = p.path.rstrip("/") or "/"
    return p._replace(path=path, query="").geturl()


def scrape_url(url: str, depth: int, visited: set[str], overwrite: bool) -> int:
    """Fetch url and recursively follow same-domain links up to depth. Returns pages saved."""
    url = _normalize(url)
    if url in visited:
        return 0
    visited.add(url)

    filename = _url_to_filename(url)
    outpath = OUTPUT_DIR / filename

    if outpath.exists() and not overwrite:
        print(f"  [skip] {url}  →  {filename} (already exists)")
        # Still recurse so we don't miss child pages
        if depth > 0:
            try:
                resp = _SESSION.get(url, timeout=15)
                resp.raise_for_status()
                links = [_normalize(l) for l in _collect_links(resp.text, url)]
                time.sleep(SCRAPE_DELAY_SECONDS)
                saved = 0
                for link in links:
                    saved += scrape_url(link, depth - 1, visited, overwrite)
                return saved
            except Exception:
                return 0
        return 0

    try:
        print(f"  [fetch] {url}")
        resp = _SESSION.get(url, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"  [error] {url}: {e}")
        return 0

    html = resp.text
    text = _extract_text(html, url)

    if len(text.strip()) < 100:
        print(f"  [skip] {url}: extracted text too short, skipping")
        time.sleep(SCRAPE_DELAY_SECONDS)
        return 0

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    outpath.write_text(f"Source: {url}\n\n{text}\n", encoding="utf-8")
    print(f"  [saved] {filename}  ({len(text.split())} words)")
    time.sleep(SCRAPE_DELAY_SECONDS)

    saved = 1
    if depth > 0:
        links = [_normalize(l) for l in _collect_links(html, url)]
        for link in links:
            saved += scrape_url(link, depth - 1, visited, overwrite)

    return saved


def main():
    parser = argparse.ArgumentParser(description="Scrape websites into data/website/")
    parser.add_argument("--url", help="Scrape a single URL (overrides config seeds)")
    parser.add_argument("--depth", type=int, default=1, help="Crawl depth (default: 1)")
    parser.add_argument("--overwrite", action="store_true", help="Re-scrape existing files")
    args = parser.parse_args()

    seeds = (
        [{"url": args.url, "depth": args.depth}]
        if args.url
        else SCRAPE_SEEDS
    )

    total_saved = 0
    visited: set[str] = set()

    for seed in seeds:
        url = seed["url"]
        depth = seed.get("depth", 1)
        print(f"\nScraping: {url}  (depth={depth})")
        saved = scrape_url(url, depth, visited, overwrite=args.overwrite)
        total_saved += saved
        print(f"  → {saved} page(s) saved from this seed")

    print(f"\nDone. Total pages saved: {total_saved}")
    print(f"Output directory: {OUTPUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
