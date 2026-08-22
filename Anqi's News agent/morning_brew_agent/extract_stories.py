#!/usr/bin/env python3
"""
extract_stories.py — Step 1 of the two-step pipeline.

Reads raw_sources.txt → calls OpenAI API with JSON schema (Structured Outputs)
→ writes stories_today.json

This step does the intelligence work ONLY:
- Read and understand all 7 sources
- Deduplicate stories that appear in multiple sources
- Extract causal mechanism for each story
- Identify market data
- Produce clean structured data

It does NOT generate any HTML. That's render_html.py's job.

Usage:
    python3 extract_stories.py
    python3 extract_stories.py --dry-run    # show prompt, skip API call
    python3 extract_stories.py --model gpt-4o-mini  # cheaper model for testing

Environment:
    OPENAI_API_KEY  (required)
    OPENAI_MODEL    (optional, default: gpt-4o)
"""

import argparse
import json
import os
import sys
import textwrap
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

BASE_DIR   = Path(__file__).parent
RAW_FILE   = BASE_DIR / "raw_sources.txt"
JSON_FILE  = BASE_DIR / "stories_today.json"
MODEL      = os.environ.get("OPENAI_MODEL", "gpt-4o")

# ── JSON Schema — the contract between extract and render ──────────────────
# This is what the LLM MUST return. OpenAI enforces it at the token level.
RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "date": {
            "type": "string",
            "description": "Today's date, e.g. 'Saturday, August 22, 2026'"
        },
        "markets": {
            "type": "object",
            "description": "Market snapshot for today",
            "properties": {
                "summary_title": {
                    "type": "string",
                    "description": "One-line theme, e.g. 'Stocks Fall as Bond Yields Hit 19-Year High'"
                },
                "key_mechanism": {
                    "type": "string",
                    "description": "The single dominant market force today, as one clean causal chain. MAX 4 steps. One chain only — do not cram multiple market stories here. Bessent intervention, Bitcoin surge, Robinhood move etc. go in individual stories or quick hits. Example: 'US borrows $2T/yr → bond supply exceeds demand → yield rises → stocks fall'. Keep it to the one thing that explains why markets moved today."
                },
                "week_ahead": {
                    "type": "string",
                    "description": "2-3 key catalysts or events to watch next. Be specific."
                },
                "tickers": {
                    "type": "array",
                    "description": "6-9 tickers/assets to display in the market grid",
                    "items": {
                        "type": "object",
                        "properties": {
                            "label":     { "type": "string", "description": "e.g. S&P 500" },
                            "value":     { "type": "string", "description": "e.g. 7,674" },
                            "change":    { "type": "string", "description": "e.g. +0.43% or -300 pts" },
                            "direction": { "type": "string", "enum": ["up", "dn", "neutral"] }
                        },
                        "required": ["label", "value", "change", "direction"],
                        "additionalProperties": False
                    }
                }
            },
            "required": ["summary_title", "key_mechanism", "week_ahead", "tickers"],
            "additionalProperties": False
        },
        "stories": {
            "type": "array",
            "description": "5-8 main stories of the day, deduplicated across sources",
            "items": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Punchy, descriptive title. Include the key fact. Not clickbait."
                    },
                    "sources": {
                        "type": "array",
                        "description": "Source IDs that covered this story",
                        "items": {
                            "type": "string",
                            "enum": ["MB", "CNBC", "Reuters", "TLDR", "Rundown", "ITBrew", "SA"]
                        }
                    },
                    "what": {
                        "type": "string",
                        "description": "1-2 sentences. Pure facts. No reasoning yet. What happened."
                    },
                    "mechanism": {
                        "type": "array",
                        "description": "One or more causal chains. Each chain must have 3 layers: CAUSE → INTERMEDIATE MECHANISM → RESULT. The intermediate steps must explain WHY the cause leads to the result — not just list what happened. Each step should be a complete phrase that makes the logic clear. Do NOT use bracket labels like [CAUSE] or [RESULT] — the steps should be self-explanatory without labels. Example: 'Iran ceasefire expires → Hormuz closure threatened (20% of global oil transits here) → supply disruption risk repriced → oil rises + bond yields spike'. The chain should be self-explanatory to a reader without background knowledge. 4-6 steps recommended.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": { "type": "string", "description": "2-4 word label for this chain. e.g. 'Bond market', 'Cybercab'. Leave empty string if only one chain." },
                                "steps": {
                                    "type": "array",
                                    "description": "The causal chain as ordered steps. Each step has text and a type. Types: 'cause' = what triggered it, 'mechanism' = why/how it propagates, 'result-short' = immediate outcome that may reverse, 'result-long' = lasting implication. 4-6 steps total.",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "text": { "type": "string" },
                                            "type": { "type": "string", "enum": ["cause", "mechanism", "result-short", "result-long"] }
                                        },
                                        "required": ["text", "type"],
                                        "additionalProperties": False
                                    }
                                }
                            },
                            "required": ["label", "steps"],
                            "additionalProperties": False
                        }
                    },
                    "so_what": {
                        "type": "array",
                        "description": "Exactly 2-3 bullet points. Each bullet is ONE tight sentence — max 15 words. First bullet: the core insight or system pattern. Second bullet: the investment/market implication. Third bullet (optional): one specific thing to watch or act on. No paragraphs. No setup. Lead every bullet with the punchline.",
                        "items": { "type": "string" },
                        "minItems": 2,
                        "maxItems": 3
                    },
                    "price_moves": {
                        "type": "array",
                        "description": "ONLY populate when the story directly mentions a stock price move or has unambiguous direct ticker impact. Leave empty [] otherwise. Ghost jobs, Iran diplomacy, Canada tariffs with no specific ticker mentioned = empty. Moderna +177%, Marvell +9.85%, Nvidia earnings = populate.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "ticker":    { "type": "string",  "description": "e.g. $MRNA, $TLT, $GLD" },
                                "company":   { "type": "string",  "description": "Full company name. e.g. 'Moderna', 'iShares 20yr Treasury ETF', 'Gold ETF'" },
                                "direction": { "type": "string",  "enum": ["up", "dn", "watch"] },
                                "magnitude": { "type": "string",  "description": "Actual or estimated. e.g. '+177%' or '~5%' or '' if unknown" },
                                "reason":    { "type": "string",  "description": "One tight phrase explaining the link" }
                            },
                            "required": ["ticker", "company", "direction", "magnitude", "reason"],
                            "additionalProperties": False
                        }
                    },
                    "glossary_terms": {
                        "type": "array",
                        "description": "List of financial/technical terms used in this story that a non-expert reader might not understand. These will become hyperlinks to a glossary at the bottom of the page. Only include terms that are genuinely non-obvious. Examples: 'bond yield', 'DCF', 'short squeeze', 'duration risk', 'ASIC'. Do NOT include: revenue, profit, stock price, earnings.",
                        "items": { "type": "string" }
                    },
                    "highlights": {
                        "type": "array",
                        "description": "Key facts to visually highlight across ALL text fields (what, mechanism, so_what). Include numbers, company names, risk phrases, and positive signals that appear in any of those fields. The renderer will apply colored backgrounds to these phrases wherever they appear.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": { "type": "string" },
                                "type": { "type": "string", "enum": ["number", "company", "risk", "positive"] }
                            },
                            "required": ["text", "type"],
                            "additionalProperties": False
                        }
                    }
                },
                "required": ["title", "sources", "what", "mechanism", "so_what", "price_moves", "glossary_terms", "highlights"],
                "additionalProperties": False
            }
        },
        "quick_hits": {
            "type": "array",
            "description": "15-25 bullets for everything not covered in main stories. Cover ALL remaining content — nothing gets dropped.",
            "items": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "2-4 words. The subject. e.g. 'Tesla Cybercab' or 'TikTok DOJ' or 'Apple leak'"
                    },
                    "detail": {
                        "type": "string",
                        "description": "One tight sentence of detail. No filler."
                    },
                    "highlight": {
                        "type": "string",
                        "description": "The single most important word or number in the detail to visually emphasize. e.g. '$400M' or 'fully driverless' or '+13.7%'. Leave empty string if nothing worth highlighting."
                    },
                    "source": {
                        "type": "string",
                        "description": "Source abbreviation: MB, CNBC, Reuters, TLDR, Rundown, ITBrew, or SA"
                    }
                },
                "required": ["topic", "detail", "highlight", "source"],
                "additionalProperties": False
            }
        }
    },
    "required": ["date", "markets", "stories", "quick_hits"],
    "additionalProperties": False
}

# ── System prompt — intelligence only, no HTML ─────────────────────────────
SYSTEM_PROMPT = textwrap.dedent("""
    You are extracting and analyzing today's news for Anqi's Daily Brief.

    Your job is INTELLIGENCE ONLY — understanding, deduplication, causal analysis.
    You do NOT write HTML. You return structured JSON.

    ## YOUR READER: The Engineer
    Anqi thinks in systems and flowcharts. She wants to understand mechanisms,
    not just outcomes. Every causal link must be explained — why does A lead to B?
    She has finance/investing knowledge and wants market implications on everything.

    ## EXTRACTION RULES

    ### Deduplication
    If multiple sources cover the same story, merge them into ONE story.
    List all source IDs in the sources array. Take the best details from each.

    ### Mechanism field — SHORT AND TIGHT
    Max 4 steps. Each node is a short phrase (under 8 words). No parenthetical
    explanations in the chain itself. Just: A → B → C → D.
    The chain should be scannable in 3 seconds.

    Bad: "Treasury supply increases ($2T/yr borrowing) → bond prices fall (more supply, same demand) → yield rises (yield = coupon/price, inverse relationship)"
    Good: "US borrows $2T/yr → bond supply up → price falls → yield rises"

    ### One story = one theme
    If two events prove the same thesis, put them in ONE story with ONE chain.
    The chain can start with both events as evidence: 'Event A + Event B → shared implication → ...'
    Only use multiple labeled chains when the events have genuinely different causal paths
    that both need to be traced separately.
    When in doubt, one chain is cleaner.

    ### Mechanism — Cause → Intermediate mechanism → Result
    Every chain must have three layers:
    CAUSE: what triggered it
    INTERMEDIATE: why does the cause lead to the result? what is the actual mechanism?
    RESULT: what actually happened or will happen

    The intermediate steps are the most important — they explain the logic a reader
    wouldn't know without background knowledge. Don't skip them.

    BAD: 'Iran ceasefire expires → oil prices rise'
    GOOD: 'Iran ceasefire expires → Hormuz closure threatened (20% of global oil transits here) → supply disruption risk repriced → oil rises + bond yields spike (inflation fears return)'

    BAD: 'Cybercab removes safety driver → commercial launch'
    GOOD: 'Cybercab removes safety driver → safety driver was the legal buffer (without it, operator accepts full autonomous liability) → regulatory threshold crossed → commercial reality, not a demo'

    4-6 steps. Each step a complete phrase that makes the logic clear on its own.

    ### So what field — THIS IS THE VALUE, KEEP IT SHORT
    2-3 sentences MAXIMUM. Blend the insight and the investment angle together.
    Lead with the punchline. No setup paragraphs.
    Always end with one specific thing to watch or act on.

    ### No buzzwords without definition
    If any of these words appear in your output, they MUST be followed immediately
    by a plain-English definition in parentheses on first use:

    Finance: yield, DCF, duration, rate hike, basis points, liquidity, capex,
    rotation, short squeeze, put/call, hedge, spread, arbitrage, covenant,
    securitization, leverage, drawdown, alpha, beta, multiple, EBITDA, dilution,
    monetize, runway, burn rate, moat, TAM

    Tech: ASIC, GPU, TPU, LLM, inference, fine-tuning, RLHF, transformer,
    latency, throughput, SerDes, IP block, hyperscaler, TSMC, fabless,
    vector database, embedding, RAG, agentic, context window

    Macro: quantitative tightening, repo, reverse repo, TGA, bond vigilante,
    duration risk, credit spread, inverted yield curve, stagflation, PCE, CPI

    Rule: write the term, then immediately: term (plain English in one clause).
    Example: "bond yield (the interest rate paid on a bond — rises when bond price falls)"
    Do NOT define the same term twice in the same story.
    Do NOT add a definition if the term is already common knowledge
    (e.g. "stock price", "revenue", "profit" don't need definitions).
    Nothing gets dropped. If a story is in the source, it must appear somewhere.
    Format: "Company/Topic: one tight sentence (Source)"
""").strip()


def build_user_message(raw_text: str, today: str) -> str:
    MAX_CHARS = 50_000
    if len(raw_text) > MAX_CHARS:
        raw_text = raw_text[:MAX_CHARS] + "\n\n[... truncated ...]"

    return f"Today is {today}.\n\nExtract and analyze the following raw news content:\n\n{raw_text}"


def call_openai(system_prompt: str, user_message: str, model: str, api_key: str) -> dict:
    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        "temperature": 0.2,   # low = consistent, analytical output
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "daily_brief",
                "strict": True,
                "schema": RESPONSE_SCHEMA
            }
        }
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"✗ API error HTTP {e.code}: {body[:500]}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Request failed: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Step 1: Extract stories from raw sources via OpenAI")
    parser.add_argument("--dry-run", action="store_true", help="Show prompt, skip API call")
    parser.add_argument("--model", default=MODEL, help=f"OpenAI model (default: {MODEL})")
    args = parser.parse_args()

    if not RAW_FILE.exists():
        print(f"✗ {RAW_FILE} not found. Run brew_daily_nollm.py first.")
        sys.exit(1)

    raw_text = RAW_FILE.read_text(encoding="utf-8")
    today    = datetime.now().strftime("%A, %B %d, %Y")
    user_msg = build_user_message(raw_text, today)

    print(f"Model       : {args.model}")
    print(f"Raw sources : {len(raw_text):,} chars")
    print(f"Date        : {today}")

    if args.dry_run:
        print("\n" + "─" * 60)
        print("SYSTEM PROMPT (first 600 chars):")
        print(SYSTEM_PROMPT[:600] + "...")
        print("─" * 60)
        print("USER MESSAGE (first 300 chars):")
        print(user_msg[:300] + "...")
        print("─" * 60)
        print("JSON SCHEMA fields: date, markets, stories[], quick_hits[]")
        print("Dry run complete.")
        return

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("✗ OPENAI_API_KEY not set. Run: export OPENAI_API_KEY=sk-...")
        sys.exit(1)

    print("\nStep 1: Calling OpenAI API (extraction)...")
    result = call_openai(SYSTEM_PROMPT, user_msg, args.model, api_key)

    # Parse the structured output
    content = result["choices"][0]["message"]["content"]
    data    = json.loads(content)

    # Save to JSON file
    JSON_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    n_stories    = len(data.get("stories", []))
    n_quickhits  = len(data.get("quick_hits", []))
    usage        = result.get("usage", {})
    prompt_tok   = usage.get("prompt_tokens", 0)
    complete_tok = usage.get("completion_tokens", 0)
    cost         = (prompt_tok * 2.50 + complete_tok * 10.0) / 1_000_000

    print(f"✓ Extracted {n_stories} stories + {n_quickhits} quick hits")
    print(f"✓ Written to {JSON_FILE.name}")
    print(f"  Tokens: {prompt_tok:,} + {complete_tok:,} = {prompt_tok+complete_tok:,}")
    print(f"  Estimated cost: ${cost:.4f}")


if __name__ == "__main__":
    main()
