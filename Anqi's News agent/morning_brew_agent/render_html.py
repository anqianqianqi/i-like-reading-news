#!/usr/bin/env python3
"""
render_html.py — Step 2 of the two-step pipeline.
Reads stories_today.json → applies reader-type template → writes anqi_daily_news.html
No API call. Pure Python. Fast, free, deterministic.
"""

import argparse
import html as html_lib
import json
import sys
from datetime import datetime
from pathlib import Path

BASE_DIR  = Path(__file__).parent
JSON_FILE = BASE_DIR / "stories_today.json"
OUTPUT    = BASE_DIR / "anqi_daily_news.html"

# ── CSS ────────────────────────────────────────────────────────────────────
CSS = """\
:root{--bg:#faf8f5;--card:#fff;--a:#6c5ce7;--al:#f0e6ff;--amber:#f59e0b;
--ambl:#fff3cd;--g:#10b981;--r:#ef4444;--text:#2d3436;--m:#636e72;
--bd:#e8e4e0;--sh:0 2px 8px rgba(0,0,0,.04);}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,
sans-serif;font-size:14px;line-height:1.65;padding-bottom:60px;}
a{color:var(--a);}
/* Hero */
.hero{background:linear-gradient(135deg,#faf8f5,#f0e6ff);
border-bottom:1px solid var(--bd);padding:22px 28px 14px;}
.hero h1{font-size:1.4rem;font-weight:800;margin-bottom:3px;}
.date{font-size:11px;color:var(--m);font-weight:600;letter-spacing:.5px;
text-transform:uppercase;margin-bottom:6px;}
.srcs{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px;}
.src{background:var(--card);border:1px solid var(--bd);border-radius:10px;
padding:2px 8px;font-size:11px;color:var(--m);}
/* Sections */
.sec{margin-top:24px;max-width:740px;margin-left:auto;margin-right:auto;padding:0 20px;}
.sh{display:flex;align-items:center;gap:7px;margin-bottom:8px;padding-bottom:6px;
border-bottom:1.5px solid var(--bd);}
.sn{background:var(--a);color:#fff;font-size:10px;font-weight:700;width:20px;
height:20px;border-radius:50%;display:flex;align-items:center;
justify-content:center;flex-shrink:0;}
.sh h2{font-size:.9rem;font-weight:700;}
.badges{display:flex;gap:3px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end;}
.badge{font-size:9px;font-weight:700;text-transform:uppercase;
padding:2px 6px;border-radius:7px;}
.b-mb{background:#fff3cd;color:#92400e;}
.b-cn{background:#fef2f2;color:#991b1b;}
.b-rt{background:#fee2e2;color:#9a1515;}
.b-tl{background:#f3e8ff;color:#6b21a8;}
.b-rd{background:#eff6ff;color:#1e40af;}
.b-ib{background:#e0f2fe;color:#0c4a6e;}
.b-sa{background:#ecfdf5;color:#065f46;}
.b-multi{background:#f1f5f9;color:#334155;}
/* Story card */
.story{background:var(--card);border:1px solid var(--bd);border-radius:9px;
padding:12px 16px;margin-bottom:9px;box-shadow:var(--sh);}
.what{font-size:14px;margin-bottom:6px;line-height:1.6;}
/* Causal chain — inline flow, multiple chains stacked */
.chains{margin:6px 0;}
.chain{font-size:13px;color:var(--text);
padding:7px 12px;border-left:3px solid var(--bd);background:#fafafa;
border-radius:0 6px 6px 0;margin-bottom:5px;line-height:1.7;}
.chain:last-child{margin-bottom:0;}
.chain-label{font-size:9px;font-weight:700;text-transform:uppercase;
letter-spacing:.5px;color:var(--m);display:block;margin-bottom:4px;}
.arr{color:var(--a);font-weight:800;margin:0 3px;}
/* Price moves — single line, full color fill */
.pmoves{display:flex;flex-direction:column;gap:4px;margin-top:8px;}
.pm{display:flex;align-items:center;gap:6px;border-radius:6px;
padding:6px 11px;font-size:12px;}
.pm-up{background:#dcfce7;border:1px solid #bbf7d0;}
.pm-dn{background:#fce7f3;border:1px solid #fbcfe8;}
.pm-watch{background:#fff3cd;border:1px solid #fde68a;}
.pm-tick{font-weight:800;font-family:monospace;flex-shrink:0;}
.pm-up .pm-tick,.pm-up .pm-mag{color:#14532d;}
.pm-dn .pm-tick,.pm-dn .pm-mag{color:#831843;}
.pm-watch .pm-tick,.pm-watch .pm-mag{color:#713f12;}
.pm-company{flex-shrink:0;}
.pm-up .pm-company{color:#166534;font-weight:400;opacity:.7;}
.pm-dn .pm-company{color:#9d174d;font-weight:400;opacity:.7;}
.pm-watch .pm-company{color:#92400e;font-weight:400;opacity:.7;}
.pm-sep{opacity:.35;flex-shrink:0;margin:0 1px;}
.pm-mag{font-weight:700;flex-shrink:0;}
.pm-why{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pm-up .pm-why{color:#166534;}
.pm-dn .pm-why{color:#9d174d;}
.pm-watch .pm-why{color:#92400e;}
/* So what — custom bullet */
.sowhat{background:var(--al);border-left:3px solid var(--a);
border-radius:0 6px 6px 0;padding:8px 12px;font-size:13px;margin-top:8px;}
.swl{color:var(--a);font-weight:700;font-size:9px;text-transform:uppercase;
letter-spacing:.7px;display:block;margin-bottom:7px;}
.sowhat-line{display:flex;align-items:flex-start;gap:8px;
line-height:1.6;margin-bottom:6px;}
.sowhat-line:last-child{margin-bottom:0;}
.swbullet{width:6px;height:6px;border-radius:50%;background:var(--a);
flex-shrink:0;margin-top:5px;}
/* Amber note box */
.note{background:var(--ambl);border-left:3px solid var(--amber);
border-radius:0 6px 6px 0;padding:7px 11px;font-size:13px;margin-top:7px;}
/* Inline highlights */
.hn{background:#fef9c3;color:#713f12;border-radius:3px;padding:0 3px;font-weight:700;}
.hc{background:#e0f2fe;color:#0c4a6e;border-radius:3px;padding:0 3px;font-weight:700;}
.hw{background:#fce7f3;color:#831843;border-radius:3px;padding:0 3px;font-weight:700;}
.hg{background:#dcfce7;color:#14532d;border-radius:3px;padding:0 3px;font-weight:700;}
/* Step type tags in chain */
.step-tag{font-size:9px;font-weight:700;text-transform:uppercase;
letter-spacing:.4px;padding:1px 5px;border-radius:3px;margin-right:5px;
vertical-align:middle;flex-shrink:0;}
.st-cause{background:#fee2e2;color:#9a1515;}
.st-mechanism{background:#f1f5f9;color:#475569;}
.st-result-short{background:#fff3cd;color:#713f12;}
.st-result-long{background:#dcfce7;color:#14532d;}
a.gl{color:var(--a);text-decoration:underline dotted;cursor:pointer;}
a.gl:hover{text-decoration:underline;}
/* Glossary section */
.glossary{max-width:740px;margin:32px auto 0;padding:0 20px 32px;}
.gl-hdr{font-size:11px;font-weight:700;text-transform:uppercase;
letter-spacing:.6px;color:var(--m);border-bottom:1.5px solid var(--bd);
padding-bottom:6px;margin-bottom:12px;}
.gl-entry{margin-bottom:10px;padding:10px 14px;background:var(--card);
border:1px solid var(--bd);border-radius:7px;box-shadow:var(--sh);}
.gl-term{font-size:13px;font-weight:700;color:var(--a);margin-bottom:4px;}
.gl-def{font-size:13px;line-height:1.6;}
.gl-chain{font-size:12px;color:var(--m);margin-top:5px;padding-left:8px;
border-left:2px solid var(--bd);line-height:1.7;}
/* Markets grid */
.mkts{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:7px;}
.mkt{background:var(--card);border:1px solid var(--bd);border-radius:7px;
padding:7px 9px;text-align:center;}
.mn{font-size:9px;color:var(--m);font-weight:700;text-transform:uppercase;}
.mv{font-size:.9rem;font-weight:800;}
.mc{font-size:10px;font-weight:600;}
.up{color:var(--g);}.dn{color:var(--r);}
/* Quick hits */
.hits{background:var(--card);border:1px solid var(--bd);border-radius:9px;
padding:12px 16px;box-shadow:var(--sh);}
.hits ul{padding-left:16px;}
.hits li{margin-bottom:6px;font-size:13px;}
footer{margin-top:32px;text-align:center;color:var(--m);font-size:11px;
padding:12px;border-top:1px solid var(--bd);}
@media(max-width:560px){.hero{padding:14px 14px 10px;}
.sec{padding:0 10px;}.mkts{grid-template-columns:repeat(2,1fr);}}"""

# ── Built-in glossary definitions ─────────────────────────────────────────
# term (lowercase) → { def, chain }
GLOSSARY = {
    "bond yield": {
        "term": "Bond Yield",
        "def": "The interest rate a bond pays its holder. It's expressed as a percentage of the bond's face value.",
        "chain": "Bond price falls (people sell bonds) → yield rises (same coupon payment ÷ lower price = higher %) → vice versa when price rises"
    },
    "dcf": {
        "term": "DCF — Discounted Cash Flow",
        "def": "A valuation method that calculates what a company's future earnings are worth in today's dollars.",
        "chain": "Higher discount rate (= higher interest rates) → future earnings worth less today → stock price falls even if earnings didn't change"
    },
    "duration risk": {
        "term": "Duration Risk",
        "def": "The sensitivity of a bond's price to changes in interest rates. Longer-dated bonds have higher duration risk.",
        "chain": "Rates rise 1% → a 30-year bond loses ~15-20% in value → a 2-year bond loses only ~2%"
    },
    "short squeeze": {
        "term": "Short Squeeze",
        "def": "When a heavily shorted stock rises, forcing short sellers to buy shares to limit losses — which drives the price up further.",
        "chain": "Stock rises → short sellers must buy to cover → buying pressure pushes price higher → more short sellers forced to buy → feedback loop"
    },
    "asic": {
        "term": "ASIC — Application-Specific Integrated Circuit",
        "def": "A chip designed for one specific task (e.g. AI inference), as opposed to a general-purpose GPU.",
        "chain": "Task-specific design → can be 10-100x more efficient than a general GPU for that task → lower cost per operation at scale → threatens Nvidia GPU dominance for inference workloads"
    },
    "hyperscaler": {
        "term": "Hyperscaler",
        "def": "A company that operates massive-scale cloud computing infrastructure: Google, Amazon (AWS), Microsoft (Azure), Meta.",
        "chain": "Hyperscalers buy billions in chips → drive 80%+ of AI chip demand → chip companies build to hyperscaler specs → whoever wins hyperscaler contracts wins the AI chip market"
    },
    "capex": {
        "term": "Capex — Capital Expenditure",
        "def": "Money a company spends on long-term physical assets: data centers, servers, chips, equipment.",
        "chain": "High capex now → depreciates over years → hits earnings today → but builds future revenue capacity → investors debate whether future revenue justifies today's spending"
    },
    "rate hike": {
        "term": "Rate Hike",
        "def": "When the Federal Reserve raises its benchmark interest rate, making all borrowing more expensive.",
        "chain": "Fed raises rate → mortgages, car loans, credit cards get more expensive → consumers borrow less → businesses invest less → economic growth slows → stock valuations compress"
    },
    "basis points": {
        "term": "Basis Points (bps)",
        "def": "A unit for interest rates. 1 basis point = 0.01%. So +50 bps = +0.5%.",
        "chain": "Used because small rate moves matter enormously at scale: +100 bps on $40T of US debt = $400B more in annual interest payments"
    },
    "put option": {
        "term": "Put Option",
        "def": "A contract giving the buyer the right to sell a stock at a fixed price — a bet that the stock will fall.",
        "chain": "Buy a put at $100 → stock falls to $80 → sell at $100, profit $20 per share → high put volume on a stock = many investors hedging against or betting on a decline"
    },
    "call option": {
        "term": "Call Option",
        "def": "A contract giving the buyer the right to buy a stock at a fixed price — a bet that the stock will rise.",
        "chain": "Buy a call at $100 → stock rises to $130 → buy at $100, profit $30 per share → high call volume = bullish sentiment or hedging against a rise"
    },
    "bond vigilante": {
        "term": "Bond Vigilante",
        "def": "An investor who protests fiscal irresponsibility by selling government bonds, forcing yields higher and borrowing costs up.",
        "chain": "Government spends too much → vigilantes sell bonds → yields spike → government pays more to borrow → market forces fiscal discipline that politicians won't impose"
    },
    "rag": {
        "term": "RAG — Retrieval-Augmented Generation",
        "def": "An AI technique that lets a language model look up external documents before answering, instead of relying only on its training data.",
        "chain": "User asks question → system searches relevant docs → docs fed to LLM as context → LLM answers using real data, not just memorized patterns → reduces hallucinations"
    },
    "inference": {
        "term": "AI Inference",
        "def": "Running an already-trained AI model to generate responses. Opposite of training (which builds the model).",
        "chain": "Training: expensive, done once, builds the model → Inference: cheap per-query, done billions of times per day → inference cost is what determines whether an AI product is profitable at scale"
    },
    "leverage": {
        "term": "Leverage",
        "def": "Using borrowed money to amplify returns — and losses.",
        "chain": "Borrow $9, add $1 own money → buy $10 asset → asset rises 10% → own money doubled (100% return) → asset falls 10% → own money wiped out (100% loss) → leverage amplifies both directions"
    },
}


def get_glossary_id(term: str) -> str:
    """Convert term to a valid HTML anchor ID."""
    return "gl-" + term.lower().replace(" ", "-").replace("/", "-").replace("(", "").replace(")", "")


def inject_glossary_links(text: str, glossary_terms: list) -> str:
    """Wrap first occurrence of each glossary term in a hyperlink to the glossary entry."""
    for raw_term in glossary_terms:
        key = raw_term.lower().strip()
        anchor_id = get_glossary_id(key)
        # Find the term in text (case-insensitive, first occurrence only)
        idx = text.lower().find(key)
        if idx == -1:
            continue
        original = text[idx:idx + len(key)]
        linked = f'<a class="gl" href="#{anchor_id}" title="See glossary">{original}</a>'
        text = text[:idx] + linked + text[idx + len(key):]
    return text


# ── Highlight injection ────────────────────────────────────────────────────
HIGHLIGHT_CLASS = {"number": "hn", "company": "hc", "risk": "hw", "positive": "hg"}

def apply_highlights(text: str, highlights: list) -> str:
    if not highlights:
        return text
    for h in sorted(highlights, key=lambda x: len(x["text"]), reverse=True):
        phrase = h["text"]
        cls    = HIGHLIGHT_CLASS.get(h["type"], "hn")
        text   = text.replace(phrase, f'<span class="{cls}">{phrase}</span>', 1)
    return text


def arrow_format(text: str) -> str:
    """Split a chain string at arrows (→ or →), render each step on its own line."""
    # Normalise both unicode and ascii arrows
    normalised = text.replace("→", "→")
    steps = [s.strip() for s in normalised.split("→") if s.strip()]
    if len(steps) <= 1:
        return f'<span class="chain-step">{text}</span>'
    lines = [f'<span class="chain-step">{steps[0]}</span>']
    for step in steps[1:]:
        lines.append(f'<span class="chain-step"><span class="arr">→</span>{step}</span>')
    return "\n".join(lines)


def render_chains(mechanism, highlights: list) -> str:
    """Render one or more causal chains. Supports new steps[] format and legacy chain string."""
    if isinstance(mechanism, str):
        mechanism = [{"label": "", "chain": mechanism}]
    if not mechanism:
        return ""

    STEP_TAG = {
        "cause":        ("st-cause",        "cause"),
        "mechanism":    ("st-mechanism",    "why"),
        "result-short": ("st-result-short", "short-term"),
        "result-long":  ("st-result-long",  "outcome"),
    }

    chain_blocks = []
    for entry in mechanism:
        label = entry.get("label", "")
        label_html = f'<span class="chain-label">{html_lib.escape(label)}</span>' if label else ""

        # New format: steps array
        if "steps" in entry:
            parts = []
            for j, step in enumerate(entry["steps"]):
                text     = apply_highlights(html_lib.escape(step.get("text", "")), highlights)
                stype    = step.get("type", "mechanism")
                tag_cls, tag_label = STEP_TAG.get(stype, ("st-mechanism", "why"))
                tag_html = f'<span class="step-tag {tag_cls}">{tag_label}</span>'
                if j == 0:
                    parts.append(f'{tag_html}{text}')
                else:
                    parts.append(f'<span class="arr">→</span>{tag_html}{text}')
            chain_blocks.append(f'<div class="chain">{label_html}{"".join(parts)}</div>')

        # Legacy format: plain chain string with → arrows
        else:
            chain_str = entry.get("chain", "")
            steps = [s.strip() for s in chain_str.split("→") if s.strip()]
            parts = []
            for j, step in enumerate(steps):
                rendered = apply_highlights(html_lib.escape(step), highlights)
                if j == 0:
                    parts.append(rendered)
                else:
                    parts.append(f'<span class="arr">→</span>{rendered}')
            chain_blocks.append(f'<div class="chain">{label_html}{"".join(parts)}</div>')

    return f'<div class="chains">{"".join(chain_blocks)}</div>'


# ── Badge renderer ─────────────────────────────────────────────────────────
SOURCE_META = {
    "MB":      ("Morning Brew", "b-mb"),
    "CNBC":    ("CNBC",         "b-cn"),
    "Reuters": ("Reuters",      "b-rt"),
    "TLDR":    ("TLDR",         "b-tl"),
    "Rundown": ("Rundown AI",   "b-rd"),
    "ITBrew":  ("IT Brew",      "b-ib"),
    "SA":      ("SA",           "b-sa"),
}

def render_badges(sources: list) -> str:
    if len(sources) > 2:
        return '<span class="badge b-multi">Multi-source</span>'
    return "\n".join(
        f'<span class="badge {SOURCE_META.get(s, (s,"b-multi"))[1]}">{SOURCE_META.get(s,(s,"b-multi"))[0]}</span>'
        for s in sources
    )


# ── Engineer renderer ──────────────────────────────────────────────────────
def render_engineer(data: dict) -> str:
    sections = []
    today    = data.get("date", datetime.now().strftime("%A, %B %d, %Y"))
    markets  = data.get("markets", {})

    # Collect all glossary terms used across all stories
    all_glossary_terms = []
    for story in data.get("stories", []):
        all_glossary_terms.extend(story.get("glossary_terms", []))
    # Deduplicate, preserve order
    seen = set()
    unique_terms = []
    for t in all_glossary_terms:
        k = t.lower().strip()
        if k not in seen:
            seen.add(k)
            unique_terms.append(t)

    # Hero
    sections.append(f"""\
<div class="hero">
  <div class="date">{today.upper()}</div>
  <h1>Anqi's Daily Brief</h1>
  <p style="color:#636e72;font-size:11px;margin-top:3px;">7 sources · engineer format · causal chains</p>
  <div class="srcs">
    <span class="src">Morning Brew</span><span class="src">CNBC</span>
    <span class="src">Reuters</span><span class="src">TLDR</span>
    <span class="src">Rundown AI</span><span class="src">IT Brew</span>
    <span class="src">SA</span>
  </div>
</div>""")

    # Markets
    tickers_html = "".join(f"""\
    <div class="mkt">
      <div class="mn">{html_lib.escape(t['label'])}</div>
      <div class="mv {'' if t.get('direction','neutral')=='neutral' else t.get('direction','')}">{html_lib.escape(t['value'])}</div>
      <div class="mc {'' if t.get('direction','neutral')=='neutral' else t.get('direction','')}">{html_lib.escape(t['change'])}</div>
    </div>\n""" for t in markets.get("tickers", []))

    mech_inline = html_lib.escape(markets.get("key_mechanism", "")).replace("→", '<span class="arr">→</span>')
    ahead = html_lib.escape(markets.get("week_ahead", ""))
    sections.append(f"""\
<div class="sec">
  <div class="sh"><div class="sn">$</div>
    <h2>Markets — {html_lib.escape(markets.get('summary_title',''))}</h2>
  </div>
  <div class="mkts">{tickers_html}</div>
  <div class="note">
    <strong>Why:</strong> {mech_inline}<br/><br/>
    <strong>Watch:</strong> {ahead}
  </div>
</div>""")

    # Stories
    for i, story in enumerate(data.get("stories", []), start=1):
        highlights = story.get("highlights", [])
        gl_terms   = story.get("glossary_terms", [])

        def process(text):
            t = html_lib.escape(text)
            t = apply_highlights(t, highlights)
            t = inject_glossary_links(t, gl_terms)
            return t

        what_text  = process(story.get("what", ""))
        chains_html = render_chains(story.get("mechanism", []), highlights)
        title      = html_lib.escape(story.get("title", ""))
        badges     = render_badges(story.get("sources", []))

        # So what — plain lines, no bullets
        bullets = story.get("so_what", [])
        if isinstance(bullets, str):
            bullets = [s.strip() for s in bullets.split(". ") if s.strip()]
        sowhat_html = "\n".join(
            f'<span class="sowhat-line"><span class="swbullet"></span><span>{process(b)}</span></span>'
            for b in bullets
        )

        # Price moves — compact colored cards
        moves = story.get("price_moves", [])
        moves_html = ""
        if moves:
            dir_cls = {"up": "pm-up", "dn": "pm-dn", "watch": "pm-watch"}
            dir_sym = {"up": "↑", "dn": "↓", "watch": "watch"}
            cards = ""
            for m in moves:
                dc      = dir_cls.get(m.get("direction","watch"), "pm-watch")
                sym     = dir_sym.get(m.get("direction","watch"), "~")
                tick    = html_lib.escape(m.get("ticker",""))
                company = html_lib.escape(m.get("company",""))
                mag     = html_lib.escape(m.get("magnitude",""))
                why     = html_lib.escape(m.get("reason",""))
                # If magnitude exists, show it directly (no arrow prefix)
                # If no magnitude, fall back to direction arrow
                if mag:
                    mag_str = f'<span class="pm-mag">{mag}</span>'
                else:
                    mag_str = f'<span class="pm-mag">{sym}</span>'
                company_str = f'<span class="pm-sep">/</span><span class="pm-company">{company}</span>' if company else ""
                why_str     = f'<span class="pm-why">{why}</span>' if why else ""
                # Single space between elements, no dots between ticker section and magnitude
                cards += f'<div class="pm {dc}"><span class="pm-tick">{tick}</span>{company_str} {mag_str} {why_str}</div>\n'
            moves_html = f'<div class="pmoves">{cards}</div>'

        sections.append(f"""\
<div class="sec">
  <div class="sh">
    <div class="sn">{i}</div>
    <h2>{title}</h2>
    <div class="badges">{badges}</div>
  </div>
  <div class="story">
    <p class="what"><strong>What:</strong> {what_text}</p>
    {chains_html}
    {moves_html}
    <div class="sowhat">
      <span class="swl">so what</span>
      {sowhat_html}
    </div>
  </div>
</div>""")

    # Quick Hits
    def render_hit(h):
        if isinstance(h, str):
            return f"<li>{html_lib.escape(h)}</li>"
        topic  = html_lib.escape(h.get("topic",""))
        detail = html_lib.escape(h.get("detail",""))
        hl     = h.get("highlight","")
        src    = h.get("source","")
        badge_cls = {"MB":"b-mb","CNBC":"b-cn","Reuters":"b-rt","TLDR":"b-tl",
                     "Rundown":"b-rd","ITBrew":"b-ib","SA":"b-sa"}.get(src,"b-multi")
        if hl and hl in detail:
            detail = detail.replace(hl, f'<span class="hn">{hl}</span>', 1)
        src_badge = f'<span class="badge {badge_cls}" style="margin-left:5px;vertical-align:middle;">{html_lib.escape(src)}</span>' if src else ""
        return f'<li><strong>{topic}:</strong> {detail}{src_badge}</li>'

    hits_html = "\n    ".join(render_hit(h) for h in data.get("quick_hits", []))
    sections.append(f"""\
<div class="sec">
  <div class="sh"><div class="sn">#</div><h2>Quick Hits</h2>
    <div class="badges"><span class="badge b-multi">All Sources</span></div>
  </div>
  <div class="hits"><ul>
    {hits_html}
  </ul></div>
</div>""")

    # Glossary section — only terms that appear in today's stories AND have definitions
    glossary_entries = []
    for raw_term in unique_terms:
        key = raw_term.lower().strip()
        if key in GLOSSARY:
            entry     = GLOSSARY[key]
            anchor_id = get_glossary_id(key)
            chain_html = f'<div class="gl-chain">{arrow_format(html_lib.escape(entry["chain"]))}</div>' if entry.get("chain") else ""
            glossary_entries.append(f"""\
<div class="gl-entry" id="{anchor_id}">
  <div class="gl-term">{html_lib.escape(entry['term'])}</div>
  <div class="gl-def">{html_lib.escape(entry['def'])}</div>
  {chain_html}
</div>""")

    if glossary_entries:
        gl_html = "\n".join(glossary_entries)
        sections.append(f"""\
<div class="glossary">
  <div class="gl-hdr">Finance & Tech Glossary</div>
  {gl_html}
</div>""")

    # Footer
    sections.append(f"""\
<footer style="max-width:740px;margin:0 auto;">
  Sources: Morning Brew · CNBC · Reuters · TLDR · Rundown AI · IT Brew · Seeking Alpha<br/>
  Engineer format · Generated {today}
</footer>""")

    return "\n\n".join(sections)


# ── Registry ───────────────────────────────────────────────────────────────
RENDERERS = {"engineer": render_engineer}


def wrap_html(body: str, title: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{html_lib.escape(title)}</title>
<style>{CSS}</style>
</head>
<body>
{body}
</body>
</html>"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reader-type", default="engineer", choices=list(RENDERERS.keys()))
    args = parser.parse_args()

    if not JSON_FILE.exists():
        print(f"✗ {JSON_FILE} not found. Run extract_stories.py first.")
        sys.exit(1)

    data  = json.loads(JSON_FILE.read_text(encoding="utf-8"))
    today = data.get("date", datetime.now().strftime("%A, %B %d, %Y"))
    render = RENDERERS[args.reader_type]

    print(f"Reader type : {args.reader_type}")
    print(f"Date        : {today}")
    print(f"Stories     : {len(data.get('stories', []))}")
    print(f"Quick hits  : {len(data.get('quick_hits', []))}")

    body      = render(data)
    full_html = wrap_html(body, f"Anqi's Daily Brief — {today}")
    OUTPUT.write_text(full_html, encoding="utf-8")
    print(f"✓ Written to {OUTPUT.name} ({len(full_html):,} chars)")


if __name__ == "__main__":
    main()
