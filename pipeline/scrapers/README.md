# pipeline/scrapers/

Source-specific scrapers that populate `data/people.json` and patch
`data/groups.json`. Each scraper runs once, locally, by hand.

**This round:** only `hci-lab.ts` (HCI Lab members → people.json).
**Future:** csail-people.ts (full directory), semantic-scholar.ts (papers),
mit-news.ts (mentions), per-group scrapers as needed.
