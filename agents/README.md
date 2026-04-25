# agents/ — Agent Substrate

Agent DNA, runtime, and library implementations. Implements OVERVIEW.md
Components 3 (Agent Runtime / Ecosystem) and 4 (Agent DNA / DSL).

**Status:** Folder scaffolded; implementations deferred. The first viz test
(see `docs/superpowers/specs/2026-04-25-knowledge-graph-and-3d-viz-design.md`)
does not exercise this layer.

## Subdirectories
- `dna/`       — DNA spec: structured replicable system prompts with spawn/specialize instructions
- `runtime/`   — context retrieval, tool palette, orchestrator
- `library/`   — concrete agent definitions (chat-agent, briefing-agent, website-maintainer, ...)
