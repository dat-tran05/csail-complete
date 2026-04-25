import json
import re
import subprocess

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

# Use the Anthropic SDK when a key is available; fall back to `claude -p` otherwise.
if ANTHROPIC_API_KEY:
    import anthropic
    _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
else:
    _client = None


def _call_claude(prompt: str, max_tokens: int = 1500) -> str:
    if _client is not None:
        message = _client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()

    # Fallback: Claude Code CLI
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", CLAUDE_MODEL],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"claude -p failed: {result.stderr.strip()}")
    return result.stdout.strip()


def _format_context(chunks: list[dict]) -> str:
    lines = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk.get("metadata", {})
        source = meta.get("source", "unknown")
        label = meta.get("title") or meta.get("filename") or source
        lines.append(f"[{i}] Source: {source} — {label}\n{chunk['text']}")
    return "\n\n".join(lines)


def assess_relevance(paper: dict, context_chunks: list[dict]) -> float:
    context_str = _format_context(context_chunks)
    prompt = f"""You are assessing whether a paper is relevant to Daniel Jackson's research program.

Jackson's research focuses on: formal methods, concept design, software abstraction,
the Alloy modeling language, and lightweight formal methods.

Here are relevant excerpts from Jackson's work:
{context_str}

Paper to assess:
Title: {paper.get('title', '')}
Abstract: {paper.get('abstract', '')}

Return ONLY a JSON object: {{"score": 0.0-1.0, "reason": "one sentence"}}"""

    text = _call_claude(prompt, max_tokens=256)

    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            return float(data.get("score", 0.0))
        except (json.JSONDecodeError, ValueError):
            pass
    return 0.0


def generate_memo(paper: dict, context_chunks: list[dict]) -> str:
    context_str = _format_context(context_chunks)
    prompt = f"""You are generating a research memo on behalf of Daniel Jackson (MIT CSAIL).

Your role is to analyze a new paper through Jackson's intellectual lens.
You must ground EVERY claim in the provided context from Jackson's actual work.
If you cannot ground a claim, say "insufficient context to assess" — never speculate.

Context from Jackson's papers, lectures, and writing:
{context_str}

New paper:
Title: {paper.get('title', '')}
Year: {paper.get('year', 'unknown')}
Abstract: {paper.get('abstract', '')}

Generate a structured memo with these exact sections:
## Summary
## Connection to Jackson's Work (cite specific papers/concepts from context)
## Jackson's Likely Assessment (grounded claims only)
## Open Questions Jackson Might Raise
## Confidence: [HIGH | MEDIUM | LOW] — explain why"""

    return _call_claude(prompt, max_tokens=1500)


def answer_query(
    user_query: str,
    context_chunks: list[dict],
    relevant_memos: list[dict],
    style_chunks: list[dict] | None = None,
) -> str:
    context_str = _format_context(context_chunks)

    memos_str = ""
    if relevant_memos:
        memo_lines = []
        for m in relevant_memos:
            memo_lines.append(
                f"Memo for \"{m.get('paper_title', 'unknown')}\" ({m.get('paper_year', '')}):\n"
                f"{m.get('memo_text', '')[:800]}"
            )
        memos_str = "\n\n---\n\n".join(memo_lines)

    style_section = ""
    if style_chunks:
        examples = "\n\n---\n\n".join(c["text"] for c in style_chunks)
        style_section = f"""
Here are excerpts from Daniel Jackson's lectures that show how he speaks — his tone, phrasing, and rhythm.
Match his voice closely in your answer (conversational, concrete, uses everyday analogies, builds intuition before formalism, asks rhetorical questions, direct but warm):

{examples}

"""

    prompt = f"""You are answering a research question AS Daniel Jackson (MIT CSAIL), in his own voice.

{style_section}Ground EVERY claim in the sources provided. If you cannot ground a claim, say
"insufficient context to assess" — never speculate.

Context from Jackson's papers, lectures, and writing:
{context_str}

{"Relevant memos from the agent's analysis:" if memos_str else ""}
{memos_str}

Question: {user_query}

Answer in Daniel Jackson's voice. Cite specific sources by label (e.g., [1], [2]).
End your response with:
SOURCES_USED: comma-separated list of source labels used
CONFIDENCE: HIGH | MEDIUM | LOW"""

    return _call_claude(prompt, max_tokens=1200)


def extract_confidence(memo_text: str) -> str:
    match = re.search(r'##\s*Confidence:\s*(HIGH|MEDIUM|LOW)', memo_text, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return "LOW"
