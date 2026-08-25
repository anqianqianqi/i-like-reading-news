#!/usr/bin/env python3
"""
critique_rewrite.py — Step 2.5 of the pipeline.

Reads stories_today.json (output of extract_stories.py),
runs critique → rewrites weak stories → overwrites stories_today.json.

Usage:
    python3 critique_rewrite.py
    python3 critique_rewrite.py --dry-run   # show critique, skip rewrites

Requires: OPENAI_API_KEY
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE_DIR  = Path(__file__).parent
JSON_FILE = BASE_DIR / "stories_today.json"

CRITIQUE_PROMPT = """You are a quality reviewer for a personalized news digest for an engineer reader.

A story FAILS if ANY of these are true:
- "what" is vague — missing specific numbers, names, dollar amounts from the sources
- mechanism steps are TELEGRAPHIC — they just label what happened without explaining
  the connecting logic between steps. A telegraphic step is one that a reader could
  have written themselves from just reading the headline. If a step is under 8 words,
  it's almost certainly telegraphic.
  BAD steps: "talks collapse", "costs rise", "market reacts", "inflation follows"
  GOOD steps: "tariff = tax on US importers, not Canada — American companies pay the
    50% at the border, so Canadian input costs jump 50% for US manufacturers"
- mechanism steps just restate events in sequence without explaining WHY each step
  causes the next. A chain like "A → B → C" where every arrow is implicit is bad.
  GOOD: "Companies fail to agree → US imposes 50% tariff → tariff is paid by US
    importers not Canada → manufacturers absorb margin hit or raise consumer prices →
    inflation gets new supply-side input"
  BAD: "Companies fail to agree → US imposes tariffs → Canada retaliates"
- so_what uses non-committal language: "monitor developments", "watch for changes",
  "could affect", "may impact" without naming what specifically and in which direction
- so_what restates what already happened instead of giving the non-obvious insight
- price_moves contains tickers NOT explicitly named in the source text

A story PASSES if:
- "what" contains specific facts (numbers, names, dollar amounts)
- each mechanism step explains BOTH what happened AND why it leads to the next step —
  a reader who knows nothing about the topic can follow every arrow without asking "but why?"
- so_what's first bullet gives a non-obvious insight, second bullet names a specific
  sector/ticker/direction for investment thinking
- price_moves only has tickers explicitly mentioned in the sources

Return JSON exactly:
{
  "issues": [
    {
      "story_index": 0,
      "story_title": "...",
      "failures": ["specific description of what's wrong — quote the bad text and explain why it fails"],
      "missing_facts": ["facts that should be included"],
      "rewrite_priority": "high"
    }
  ],
  "passed_count": 3,
  "failed_count": 2
}
Only flag genuinely failing stories. If all pass, return empty issues array."""

REWRITE_PROMPT = """You are rewriting a news story to fix specific quality issues.

Your goal is to write mechanism steps that read like a smart friend explaining how
something works — not like a bullet-point summary of what happened.

For each mechanism step:
- Write it as a complete explanatory phrase that carries its own "because"
- The reader should understand WHY this step leads to the next thing
- Steps that are under 8 words are almost certainly just labels — expand them
- GOOD: "tariff = a tax paid by US importers, not Canada — so American companies
  absorb the cost at the border, which raises their input costs by 50%"
- BAD: "tariff activates", "costs rise", "market reacts"

what field: include specific numbers, dollar amounts, names, timelines from the sources.
mechanism steps: 4-6 steps. Each 'mechanism' type step must explain the connecting logic —
  WHY does the cause lead to the result? This is where the value is.
so_what: 2-3 bullets. First bullet = non-obvious insight a casual reader would miss.
  Second bullet = specific investment direction with a named ticker/sector.
  NEVER "monitor developments". Always concrete and specific.

Return JSON exactly:
{
  "story_index": 0,
  "updated_what": "...",
  "updated_mechanism": [
    {
      "label": "",
      "steps": [
        {"text": "...", "type": "cause|mechanism|result-short|result-long"}
      ]
    }
  ],
  "updated_so_what": ["bullet 1", "bullet 2", "bullet 3"]
}"""


def call_openai(system: str, user: str, api_key: str,
                response_format: str = "json_object",
                max_tokens: int = 4096) -> dict:
    payload = json.dumps({
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user}
        ],
        "temperature": 0.1,
        "max_tokens": max_tokens,
        "response_format": {"type": response_format}
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"✗ OpenAI HTTP {e.code}: {body[:300]}")
        sys.exit(1)

    content = result["choices"][0]["message"]["content"]
    usage   = result.get("usage", {})
    return {"data": json.loads(content), "usage": usage}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="Show critique but skip rewrites")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("✗ OPENAI_API_KEY not set. Run: export OPENAI_API_KEY=sk-...")
        sys.exit(1)

    if not JSON_FILE.exists():
        print(f"✗ {JSON_FILE} not found. Run extract_stories.py first.")
        sys.exit(1)

    data = json.loads(JSON_FILE.read_text(encoding="utf-8"))
    stories = data.get("stories", [])
    print(f"Loaded {len(stories)} stories from {JSON_FILE.name}")

    # ── Step 1: Critique ──────────────────────────────────────────────────
    print("\nCritiquing story quality...")
    story_summary = [
        {
            "index": i,
            "title": s["title"],
            "what":  s["what"],
            "mechanism_steps": [
                step["text"]
                for chain in s.get("mechanism", [])
                for step in chain.get("steps", [])
            ],
            "so_what": s.get("so_what", [])
        }
        for i, s in enumerate(stories)
    ]

    result = call_openai(
        CRITIQUE_PROMPT,
        f"Review these {len(story_summary)} stories:\n{json.dumps(story_summary, indent=2)}",
        api_key
    )
    critique = result["data"]
    u_critique = result["usage"]

    issues     = critique.get("issues", [])
    passed     = critique.get("passed_count", 0)
    failed     = critique.get("failed_count", 0)
    print(f"✓ Critique: {passed} passed, {failed} failed  "
          f"({u_critique.get('prompt_tokens',0):,} + {u_critique.get('completion_tokens',0):,} tokens)")

    for issue in issues:
        print(f"\n  ⚠  Story {issue['story_index']}: \"{issue['story_title']}\"")
        for f in issue.get("failures", []):
            print(f"     - {f}")
        if issue.get("missing_facts"):
            print(f"     Missing: {'; '.join(issue['missing_facts'])}")
        print(f"     Priority: {issue.get('rewrite_priority','?')}")

    if not issues:
        print("  ✓ All stories passed quality check.")
        return

    if args.dry_run:
        print("\nDry run — skipping rewrites.")
        return

    # ── Step 2: Rewrite high-priority stories ─────────────────────────────
    high_pri = [i for i in issues if i.get("rewrite_priority") == "high"]
    if not high_pri:
        print("\nNo high-priority issues — skipping rewrites.")
        return

    print(f"\nRewriting {len(high_pri)} story/stories...")
    raw_sources = (BASE_DIR / "raw_sources.txt").read_text(encoding="utf-8")[:25000]

    total_rewrite_tokens = 0
    updated_stories = list(stories)

    for issue in high_pri:
        idx   = issue["story_index"]
        story = stories[idx]
        print(f"  → Rewriting \"{issue['story_title']}\"...", end=" ", flush=True)

        user_msg = (
            f"Rewrite this story to fix the issues.\n\n"
            f"Original story:\n{json.dumps(story, indent=2)}\n\n"
            f"Issues to fix:\n{chr(10).join(issue['failures'])}\n\n"
            f"Missing facts to include:\n{chr(10).join(issue.get('missing_facts', []))}\n\n"
            f"Raw sources for reference:\n{raw_sources}"
        )

        result = call_openai(REWRITE_PROMPT, user_msg, api_key)
        rewrite = result["data"]
        u = result["usage"]
        total_rewrite_tokens += u.get("total_tokens", 0)
        print(f"done ({u.get('total_tokens',0):,} tokens)")

        # Merge rewrite back
        if rewrite.get("updated_what"):
            updated_stories[idx]["what"] = rewrite["updated_what"]
        if rewrite.get("updated_mechanism"):
            updated_stories[idx]["mechanism"] = rewrite["updated_mechanism"]
        if rewrite.get("updated_so_what"):
            updated_stories[idx]["so_what"] = rewrite["updated_so_what"]

    data["stories"] = updated_stories
    JSON_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n✓ Rewrites saved to {JSON_FILE.name}  ({total_rewrite_tokens:,} tokens)")
    print("  Run render_html.py to regenerate the HTML.")


if __name__ == "__main__":
    main()
