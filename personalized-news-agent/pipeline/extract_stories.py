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

BASE_DIR   = Path(__file__).parent  # pipeline/
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
                        "description": "One or more causal chains, written as a story a smart friend would tell you. Each step must carry its own 'because' — never just label what happened, always explain the logic that connects it to the next step. A reader who knows nothing about this topic should be able to follow every arrow without stopping to ask 'but why?' Steps should be complete, explanatory sentences or phrases. 4-6 steps per chain. Use multiple chains only when two genuinely separate causal paths both need to be traced. GOOD example: 'US-Canada talks collapse at midnight → 50% tariff activates on steel, autos, lumber → tariff is a tax paid by US importers, not Canada — American companies absorb the cost → Canadian input costs jump 50% for US manufacturers → manufacturers either squeeze their own margins or raise prices, feeding consumer inflation'. BAD example: 'talks collapse → tariff activates → costs rise → inflation'. The bad version is just labels — it tells the reader nothing they couldn't infer themselves.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": { "type": "string", "description": "2-4 word label for this chain if there are multiple chains. e.g. 'Bond market', 'Why buyback failed'. Leave empty string if only one chain." },
                                "steps": {
                                    "type": "array",
                                    "description": "Ordered steps of the causal chain. Each step is a sentence or phrase that explains BOTH what happened AND why it leads to the next thing. The step text should be long enough to carry the logic — 10-25 words is typical. Steps that are under 6 words are almost certainly just labels and will be rejected. Types: 'cause' = the triggering event, 'mechanism' = the connecting logic that explains why the cause propagates (this is where the value lives — don't skip these), 'result-short' = an immediate outcome that may be temporary, 'result-long' = the durable implication or where this ends up.",
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

    ### Mechanism field — TELL THE STORY, DON'T LABEL IT
    Your job here is to be the smart friend who actually explains how something works.
    Write each step as if you're talking to someone who is intelligent but doesn't have
    background knowledge on this topic. The reader should finish the chain thinking
    "oh, NOW I get why this matters" — not "I could have written that myself."

    The ONLY failure mode you must avoid: writing steps that just restate the event
    without explaining the connection. Every step must answer the implicit question
    "but why does that lead to the next thing?"

    GOOD (explains the connection):
    'US-Canada talks collapse at midnight deadline → 50% tariff activates on
    Canadian steel, autos, lumber → here's the key: the tariff is a tax on US
    importers, not Canada — American companies pay the 50% at the border →
    Canadian input costs jump 50% for US manufacturers → manufacturers either
    absorb the margin hit or raise prices on consumers, feeding inflation'

    BAD (just labels what happened, explains nothing):
    'talks collapse → tariff activates → costs rise → inflation'

    GOOD (explains WHY the mechanism works):
    'Cybercab removes safety driver → the safety driver was the legal buffer between
    Tesla and full autonomous liability — without one, Tesla is accepting that this
    car can operate with no human fallback → that regulatory threshold is what
    separates a demo from a commercial product → Cybercab just crossed it'

    BAD (connects dots without explaining them):
    'safety driver removed → regulatory threshold crossed → commercial launch'

    There is no word limit on steps. A step should be as long as it needs to be
    to carry the logic. Short steps are a warning sign that you're labeling, not explaining.

    4-6 steps per chain. Use 'mechanism' type steps liberally — they are where
    the value lives. Never have a cause step jumping directly to a result step
    without a mechanism step in between.

    ### One story = one theme
    If two events prove the same thesis, put them in ONE story with ONE chain.
    The chain can start with both events as evidence: 'Event A + Event B → shared implication → ...'
    Only use multiple labeled chains when the events have genuinely different causal paths
    that both need to be traced separately.
    When in doubt, one chain is cleaner.

    ### Mechanism — always three layers minimum
    CAUSE: what triggered it (the event)
    MECHANISM (one or more): WHY does this propagate? what is the actual connecting logic?
    RESULT: what actually happened or will happen

    The mechanism steps are the most important — they contain the knowledge a reader
    wouldn't know without background. These are what separates a good brief from a
    headline aggregator. Never skip them.

    ### So what field — INSIGHT FIRST, INVESTMENT SECOND
    2-3 bullets. Each bullet is one tight, punchy sentence. Lead with the punchline.
    NO setup, no "this means that", no restating what just happened.

    Bullet 1: the non-obvious insight — what would a smart analyst say that a casual
    reader would miss? The thing that reframes how you think about this.
    Bullet 2: the investment/market implication — specific direction, specific sector or
    ticker, specific thesis. Not "could impact tech" — "bearish on Uber 3-5yr as
    robotaxi undercuts their economics on every major route."
    Bullet 3 (if you have one): a single specific thing to WATCH or ACT ON.
    This must be concrete — a named event, a named ticker, a specific date or threshold.
    NEVER: "monitor developments", "watch for changes", "could affect markets."

    The bar for bullet 3 is high. Only include it if you have something genuinely
    actionable to say. Two strong bullets beat three weak ones.

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
