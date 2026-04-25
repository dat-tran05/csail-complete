import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
S2_API_KEY = os.getenv("S2_API_KEY")

if not ANTHROPIC_API_KEY:
    import warnings
    warnings.warn("ANTHROPIC_API_KEY is not set — falling back to `claude -p` CLI for inference.")

AUTHOR_ID = "1741101"  # Daniel Jackson on Semantic Scholar

RESEARCH_TOPICS = [
    "concept design software",
    "formal methods software engineering",
    "Alloy modeling language",
    "software abstraction",
    "software design principles",
    "lightweight formal methods",
]

SCHEDULE_INTERVAL_HOURS = 24
MAX_PAPERS_PER_RUN = 20
RELEVANCE_THRESHOLD = 0.6
MIN_PAPER_YEAR = 2020

CLAUDE_MODEL = "claude-opus-4-5"

CHROMA_COLLECTION = "jackson_corpus"
SQLITE_PATH = "store/memos.db"
CHROMA_PATH = "store/chroma"

# Seed URLs for the web scraper. Each entry: url + crawl depth within that domain.
# depth=0 → fetch that page only; depth=1 → fetch page + same-domain links found on it; etc.
SCRAPE_SEEDS = [
    {"url": "http://people.csail.mit.edu/dnj/", "depth": 1},
    {"url": "https://essenceofsoftware.com", "depth": 1},
    {"url": "https://www.csail.mit.edu/research/software-design-group", "depth": 0},
    {"url": "https://sdg.csail.mit.edu/", "depth": 2},
]

WEBSITE_DIR = "data/website"
SCRAPE_DELAY_SECONDS = 1.0
