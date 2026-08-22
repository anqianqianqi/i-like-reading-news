#!/usr/bin/env python3
"""Anqi's Daily Brief — No-LLM multi-source, deduped by story.

Fetches Morning Brew, CNBC, Reuters, TLDR, Rundown AI, IT Brew, Seeking Alpha.
Deduplicates by topic (keyword clustering), merges source labels,
formats in Anqi's causal-chain style: Event → Market reaction → Why it matters.
No API key needed.
"""

import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

OUTPUT_PATH = Path(__file__).parent / "anqi_daily_news.html"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# ─── Sources ──────────────────────────────────────────────────────────────────
SOURCES = {
    "MB":      {"label": "☕ Morning Brew",  "badge": "b-mb", "url": "https://www.morningbrew.com/issues/latest",                                                       "rss": False},
    "CNBC":    {"label": "📺 CNBC",          "badge": "b-cn", "url": "https://www.cnbc.com/world/?region=world",                                                         "rss": False},
    "Reuters": {"label": "📡 Reuters",       "badge": "b-rt", "url": "https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en",                  "rss": True},
    "TLDR":    {"label": "⚡ TLDR",          "badge": "b-tl", "url": "https://tldr.tech/",                                                                               "rss": False},
    "Rundown": {"label": "🔵 Rundown AI",    "badge": "b-rd", "url": "https://www.therundown.ai/archive",                                                                "rss": False},
    "ITBrew":  {"label": "🔷 IT Brew",       "badge": "b-ib", "url": "https://www.itbrew.com/",                                                                          "rss": False},
    "SA":      {"label": "📈 Seeking Alpha", "badge": "b-sa", "url": "https://news.google.com/rss/search?q=site:seekingalpha.com+markets+earnings&hl=en-US&gl=US&ceid=US:en", "rss": True},
}

# Topic clusters: keyword → topic bucket name
# Stories matching the same bucket get merged into one entry
TOPIC_CLUSTERS = {
    "AI":        ["artificial intelligence", "openai", "claude", "gemini", "llm", "gpt", "anthropic",
                  "nvidia", "ai model", "machine learning", "deep learning", "rundown", "tldr ai",
                  "open-weight", "open weight", "capex ai", "ai spending", "ai safety"],
    "Finance":   ["earnings", "revenue", "profit", "ipo", "fed ", "federal reserve", "interest rate",
                  "s&p", "nasdaq", "dow ", "market", "stock", "bond", "treasury", "inflation",
                  "gdp", "recession", "pe ", "private equity", "valuation", "seeking alpha",
                  "tariff", "trade", "import", "export", "deal ", "merger", "acquisition"],
    "World":     ["iran", "ukraine", "russia", "israel", "war", "ceasefire", "sanctions",
                  "trump", "biden", "congress", "senate", "election", "zelenskyy", "nato",
                  "china", "taiwan", "north korea", "middle east", "geopolit"],
    "Tech":      ["cybersecurity", "hack", "breach", "ransomware", "data center", "cloud",
                  "apple", "meta", "google", "amazon", "microsoft", "software", "startup",
                  "funding", "raise", "semiconductor", "chip", "space", "satellite"],
    "Health":    ["ebola", "fda", "drug", "vaccine", "outbreak", "cancer", "alzheimer",
                  "obesity", "clinical trial", "hospital", "health"],
}

RAW_OUTPUT = Path(__file__).parent / "raw_sources.txt"


def fetch_text(url, max_chars=12000):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "iframe", "form"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        return text[:max_chars]
    except Exception as e:
        print(f"  ✗ {url}: {e}", file=sys.stderr)
        return ""


def fetch_rss(url, max_items=15):
    items = []
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "xml")
        for item in soup.find_all("item")[:max_items]:
            title = item.find("title")
            link = item.find("link")
            desc = item.find("description")
            t = title.get_text(strip=True) if title else ""
            l = link.get_text(strip=True) if link else ""
            d = BeautifulSoup(desc.get_text() if desc else "", "html.parser").get_text(strip=True)[:300]
            items.append(f"TITLE: {t}\nLINK: {l}\nSUMMARY: {d}")
    except Exception as e:
        print(f"  ✗ RSS {url}: {e}", file=sys.stderr)
    return "\n\n".join(items)


def main():
    print("=== Step 1: Fetching all sources ===")
    parts = []
    for key, cfg in SOURCES.items():
        print(f"  → {cfg['label']}...", end=" ", flush=True)
        if cfg["rss"]:
            text = fetch_rss(cfg["url"])
        else:
            text = fetch_text(cfg["url"])
        chars = len(text)
        print(f"{chars:,} chars")
        parts.append(f"\n\n{'='*60}\nSOURCE: {key} — {cfg['label']}\nURL: {cfg['url']}\n{'='*60}\n{text}")

    combined = "\n".join(parts)
    RAW_OUTPUT.write_text(combined, encoding="utf-8")
    print(f"\n✓ Raw text written to {RAW_OUTPUT.name} ({len(combined):,} chars total)")
    print("  → Ready for Kiro to read and generate HTML")


if __name__ == "__main__":
    main()
