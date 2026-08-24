/* render.ts — TypeScript port of render_html.py */

const CSS = `
:root{--bg:#faf8f5;--card:#fff;--a:#6c5ce7;--al:#f0e6ff;--amber:#f59e0b;
--ambl:#fff3cd;--g:#10b981;--r:#ef4444;--text:#2d3436;--m:#636e72;
--bd:#e8e4e0;--sh:0 2px 8px rgba(0,0,0,.04);}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,
sans-serif;font-size:14px;line-height:1.65;padding-bottom:60px;}
a{color:var(--a);}
.hero{background:linear-gradient(135deg,#faf8f5,#f0e6ff);
border-bottom:1px solid var(--bd);padding:22px 28px 14px;}
.hero h1{font-size:1.4rem;font-weight:800;margin-bottom:3px;}
.date{font-size:11px;color:var(--m);font-weight:600;letter-spacing:.5px;
text-transform:uppercase;margin-bottom:6px;}
.srcs{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px;}
.src{background:var(--card);border:1px solid var(--bd);border-radius:10px;
padding:2px 8px;font-size:11px;color:var(--m);}
.sec{margin-top:24px;max-width:740px;margin-left:auto;margin-right:auto;padding:0 20px;}
.sh{display:flex;align-items:center;gap:7px;margin-bottom:8px;padding-bottom:6px;
border-bottom:1.5px solid var(--bd);}
.sn{background:var(--a);color:#fff;font-size:10px;font-weight:700;width:20px;
height:20px;border-radius:50%;display:flex;align-items:center;
justify-content:center;flex-shrink:0;}
.sh h2{font-size:.9rem;font-weight:700;}
.badges{display:flex;gap:3px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end;}
.badge{font-size:9px;font-weight:700;text-transform:uppercase;padding:2px 6px;border-radius:7px;}
.b-mb{background:#fff3cd;color:#92400e;} .b-cn{background:#fef2f2;color:#991b1b;}
.b-rt{background:#fee2e2;color:#9a1515;} .b-tl{background:#f3e8ff;color:#6b21a8;}
.b-rd{background:#eff6ff;color:#1e40af;} .b-ib{background:#e0f2fe;color:#0c4a6e;}
.b-sa{background:#ecfdf5;color:#065f46;} .b-multi{background:#f1f5f9;color:#334155;}
.story{background:var(--card);border:1px solid var(--bd);border-radius:9px;
padding:12px 16px;margin-bottom:9px;box-shadow:var(--sh);}
.what{font-size:14px;margin-bottom:6px;line-height:1.6;}
.chains{margin:6px 0;}
.chain{font-size:13px;color:var(--text);padding:7px 12px;
border-left:3px solid var(--bd);background:#fafafa;
border-radius:0 6px 6px 0;margin-bottom:5px;line-height:1.7;}
.chain:last-child{margin-bottom:0;}
.chain-label{font-size:9px;font-weight:700;text-transform:uppercase;
letter-spacing:.5px;color:var(--m);display:block;margin-bottom:4px;}
.arr{color:var(--a);font-weight:800;margin:0 3px;}
.step-tag{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;
padding:1px 5px;border-radius:3px;margin-right:5px;vertical-align:middle;}
.st-cause{background:#fee2e2;color:#9a1515;}
.st-mechanism{background:#f1f5f9;color:#475569;}
.st-result-short{background:#fff3cd;color:#713f12;}
.st-result-long{background:#dcfce7;color:#14532d;}
.sowhat{background:var(--al);border-left:3px solid var(--a);
border-radius:0 6px 6px 0;padding:8px 12px;font-size:13px;margin-top:8px;}
.swl{color:var(--a);font-weight:700;font-size:9px;text-transform:uppercase;
letter-spacing:.7px;display:block;margin-bottom:7px;}
.sowhat-line{display:flex;align-items:flex-start;gap:8px;
line-height:1.6;margin-bottom:6px;}
.sowhat-line:last-child{margin-bottom:0;}
.swbullet{width:6px;height:6px;border-radius:50%;background:var(--a);
flex-shrink:0;margin-top:5px;}
.note{background:var(--ambl);border-left:3px solid var(--amber);
border-radius:0 6px 6px 0;padding:7px 11px;font-size:13px;margin-top:7px;}
.hn{background:#fef9c3;color:#713f12;border-radius:3px;padding:0 3px;font-weight:700;}
.hc{background:#e0f2fe;color:#0c4a6e;border-radius:3px;padding:0 3px;font-weight:700;}
.hw{background:#fce7f3;color:#831843;border-radius:3px;padding:0 3px;font-weight:700;}
.hg{background:#dcfce7;color:#14532d;border-radius:3px;padding:0 3px;font-weight:700;}
a.gl{color:var(--a);text-decoration:underline dotted;}
.glossary{max-width:740px;margin:32px auto 0;padding:0 20px 32px;}
.gl-hdr{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
color:var(--m);border-bottom:1.5px solid var(--bd);padding-bottom:6px;margin-bottom:12px;}
.gl-entry{margin-bottom:10px;padding:10px 14px;background:var(--card);
border:1px solid var(--bd);border-radius:7px;box-shadow:var(--sh);}
.gl-term{font-size:13px;font-weight:700;color:var(--a);margin-bottom:4px;}
.gl-def{font-size:13px;line-height:1.6;}
.gl-chain{font-size:12px;color:var(--m);margin-top:5px;padding-left:8px;
border-left:2px solid var(--bd);line-height:1.7;}
.mkts{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:7px;}
.mkt{background:var(--card);border:1px solid var(--bd);border-radius:7px;padding:7px 9px;text-align:center;}
.mn{font-size:9px;color:var(--m);font-weight:700;text-transform:uppercase;}
.mv{font-size:.9rem;font-weight:800;} .mc{font-size:10px;font-weight:600;}
.up{color:var(--g);} .dn{color:var(--r);}
.hits{background:var(--card);border:1px solid var(--bd);border-radius:9px;
padding:12px 16px;box-shadow:var(--sh);}
.hits ul{padding-left:16px;} .hits li{margin-bottom:6px;font-size:13px;}
footer{margin-top:32px;text-align:center;color:var(--m);font-size:11px;
padding:12px;border-top:1px solid var(--bd);}
@media(max-width:560px){.hero{padding:14px 14px 10px;}
.sec{padding:0 10px;}.mkts{grid-template-columns:repeat(2,1fr);}}
`;

const GLOSSARY: Record<string, { term: string; def: string; chain: string }> = {
  "bond yield": {
    term: "Bond Yield",
    def: "The interest rate a bond pays. Rises when bond price falls.",
    chain: "Bond price falls → yield rises (yield = coupon ÷ price, inverse) → all borrowing gets more expensive"
  },
  "dcf": {
    term: "DCF — Discounted Cash Flow",
    def: "Values a company by calculating what its future earnings are worth today.",
    chain: "Higher discount rate → future earnings worth less today → stock price falls even if earnings unchanged"
  },
  "duration risk": {
    term: "Duration Risk",
    def: "How sensitive a bond's price is to interest rate changes. Longer bonds = higher risk.",
    chain: "Rates rise 1% → 30-yr bond loses ~15-20% → 2-yr bond loses only ~2%"
  },
  "short squeeze": {
    term: "Short Squeeze",
    def: "When a heavily shorted stock rises, forcing short sellers to buy — driving the price higher.",
    chain: "Stock rises → short sellers must buy to close positions → buying pressure pushes price higher → feedback loop"
  },
  "asic": {
    term: "ASIC",
    def: "A chip built for one specific task. More efficient than a general GPU for that task.",
    chain: "Task-specific design → 10-100x more efficient than GPU for that task → threatens Nvidia GPU dominance for inference"
  },
  "hyperscaler": {
    term: "Hyperscaler",
    def: "A company running massive cloud infrastructure: Google, Amazon AWS, Microsoft Azure, Meta.",
    chain: "Hyperscalers buy 80%+ of AI chips → whoever wins hyperscaler contracts wins the AI chip market"
  },
  "capex": {
    term: "Capex — Capital Expenditure",
    def: "Money spent on long-term physical assets: data centers, servers, chips.",
    chain: "High capex now → depreciates over years → hits earnings today → builds future revenue capacity"
  },
  "rate hike": {
    term: "Rate Hike",
    def: "When the Fed raises its benchmark interest rate, making all borrowing more expensive.",
    chain: "Fed raises rate → mortgages/loans more expensive → consumers borrow less → economic growth slows → stocks fall"
  },
  "basis points": {
    term: "Basis Points (bps)",
    def: "Unit for interest rates. 1 basis point = 0.01%. So +50 bps = +0.5%.",
    chain: "+100 bps on $40T US debt = $400B more in annual interest payments"
  },
  "bond vigilante": {
    term: "Bond Vigilante",
    def: "An investor who sells government bonds to protest fiscal irresponsibility, forcing yields higher.",
    chain: "Government overspends → vigilantes sell bonds → yields spike → government pays more to borrow → market forces fiscal discipline"
  },
  "inference": {
    term: "AI Inference",
    def: "Running an already-trained AI model to generate responses. Opposite of training.",
    chain: "Training: expensive, done once → Inference: cheap per-query, billions of times daily → inference cost determines profitability"
  },
  "leverage": {
    term: "Leverage",
    def: "Using borrowed money to amplify returns — and losses.",
    chain: "Borrow $9, add $1 own → buy $10 asset → asset +10% = own money doubled → asset -10% = own money wiped out"
  },
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function glossaryId(term: string): string {
  return "gl-" + term.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function applyHighlights(text: string, highlights: { text: string; type: string }[]): string {
  const cls: Record<string, string> = { number: "hn", company: "hc", risk: "hw", positive: "hg" };
  const sorted = [...highlights].sort((a, b) => b.text.length - a.text.length);
  for (const h of sorted) {
    const c = cls[h.type] || "hn";
    text = text.replace(h.text, `<span class="${c}">${h.text}</span>`);
  }
  return text;
}

function injectGlossaryLinks(text: string, terms: string[]): string {
  for (const term of terms) {
    const id = glossaryId(term);
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) continue;
    const original = text.slice(idx, idx + term.length);
    text = text.slice(0, idx)
      + `<a class="gl" href="#${id}" title="See glossary">${original}</a>`
      + text.slice(idx + term.length);
  }
  return text;
}

function renderChains(
  mechanism: { label: string; steps?: { text: string; type: string }[]; chain?: string }[],
  highlights: { text: string; type: string }[],
  glossaryTerms: string[]
): string {
  const STEP_TAG: Record<string, [string, string]> = {
    "cause":        ["st-cause",        "cause"],
    "mechanism":    ["st-mechanism",    "why"],
    "result-short": ["st-result-short", "short-term"],
    "result-long":  ["st-result-long",  "outcome"],
  };

  const blocks = mechanism.map(entry => {
    const labelHtml = entry.label
      ? `<span class="chain-label">${esc(entry.label)}</span>`
      : "";

    if (entry.steps) {
      const parts = entry.steps.map((step, j) => {
        let t = esc(step.text);
        t = applyHighlights(t, highlights);
        t = injectGlossaryLinks(t, glossaryTerms);
        const [tagCls, tagLabel] = STEP_TAG[step.type] || ["st-mechanism", "why"];
        const tag = `<span class="step-tag ${tagCls}">${tagLabel}</span>`;
        return j === 0 ? `${tag}${t}` : `<span class="arr">→</span>${tag}${t}`;
      });
      return `<div class="chain">${labelHtml}${parts.join("")}</div>`;
    }

    // Legacy string chain
    const steps = (entry.chain || "").split("→").map(s => s.trim()).filter(Boolean);
    const parts = steps.map((step, j) => {
      let t = esc(step);
      t = applyHighlights(t, highlights);
      t = injectGlossaryLinks(t, glossaryTerms);
      return j === 0 ? t : `<span class="arr">→</span>${t}`;
    });
    return `<div class="chain">${labelHtml}${parts.join("")}</div>`;
  });

  return `<div class="chains">${blocks.join("")}</div>`;
}

// ── Shared price moves renderer — always inline styles, never CSS class descendants ──
// This guarantees green/red/amber colors work inside iframes and across all render targets.
function renderPriceMoves(
  price_moves: { ticker: string; company: string; direction: string; magnitude: string; reason: string }[]
): string {
  if (!price_moves?.length) return "";

  const DIR_COLORS: Record<string, { bg: string; border: string; text: string; dimText: string }> = {
    up:    { bg: "#dcfce7", border: "#bbf7d0", text: "#14532d", dimText: "#166534" },
    dn:    { bg: "#fce7f3", border: "#fbcfe8", text: "#831843", dimText: "#9d174d" },
    watch: { bg: "#f3e8ff", border: "#d8b4fe", text: "#6b21a8", dimText: "#7c3aed" },
  };
  const DIR_SYM: Record<string, string> = { up: "↑", dn: "↓", watch: "~" };

  // Normalize direction — LLMs sometimes output variants like "down", "bearish", "negative"
  // Also catches magnitude hints like "-3.2%" that clearly indicate direction
  function normalizeDir(raw: string, magnitude?: string, reason?: string): "up" | "dn" | "watch" {
    const d = (raw || "").toLowerCase().trim();
    if (d === "up" || d === "bullish" || d === "positive" || d === "bull" || d === "green") return "up";
    if (d === "dn" || d === "down" || d === "bearish" || d === "negative" || d === "bear" || d === "red") return "dn";
    // If direction is watch but magnitude starts with - or has explicit bearish signal, infer dn
    if (d === "watch") {
      const mag = (magnitude || "").trim();
      if (mag.startsWith("-") || mag.startsWith("−")) return "dn";
      if (mag.startsWith("+")) return "up";
      const rsn = (reason || "").toLowerCase();
      if (/tariff exposure|cost increase|margin squeeze|supply.chain cost|higher.*tax|import tax|pays more|bearish/.test(rsn)) return "dn";
      if (/safe haven|hedge|bullish|demand rising|beat|tailwind/.test(rsn)) return "up";
    }
    return "watch";
  }

  const cards = price_moves.map(m => {
    const dir = normalizeDir(m.direction, m.magnitude, m.reason);
    const c = DIR_COLORS[dir];
    const sym = DIR_SYM[dir];
    // Always show the directional symbol, then magnitude if it adds info
    const magDisplay = m.magnitude ? `${sym} ${esc(m.magnitude)}` : sym;
    const companyHtml = m.company
      ? `<span style="opacity:.65;flex-shrink:0;color:${c.dimText};font-size:11px;"> / ${esc(m.company)}</span>`
      : "";
    const sepHtml = `<span style="opacity:.3;flex-shrink:0;color:${c.text};margin:0 2px;">·</span>`;
    const whyHtml = m.reason
      ? `${sepHtml}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${c.dimText};font-size:11px;">${esc(m.reason)}</span>`
      : "";
    return `<div style="display:flex;align-items:center;gap:5px;border-radius:6px;padding:5px 10px;font-size:12px;font-family:system-ui,sans-serif;background:${c.bg};border:1px solid ${c.border};margin-bottom:4px;min-width:0;">
  <span style="font-weight:800;font-family:monospace;flex-shrink:0;color:${c.text};">${esc(m.ticker)}</span>
  ${companyHtml}
  <span style="font-weight:700;flex-shrink:0;color:${c.text};margin-left:2px;">${magDisplay}</span>
  ${whyHtml}
</div>`;
  }).join("");

  return `<div style="display:flex;flex-direction:column;gap:0;margin:8px 0;">${cards}</div>`;
}

// ── Engineer Renderer ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderEngineer(data: any): string {
  const today = data.date || new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const markets = data.markets || {};
  const sections: string[] = [];

  // Collect all glossary terms across stories
  const allTerms: string[] = [];
  for (const story of data.stories || []) {
    for (const t of story.glossary_terms || []) allTerms.push(t);
  }
  const uniqueTerms = [...new Set(allTerms.map((t: string) => t.toLowerCase()))];

  // Hero
  sections.push(`
<div class="hero">
  <div class="date">${today.toUpperCase()}</div>
  <h1>Anqi's Daily Brief</h1>
  <p style="color:#636e72;font-size:11px;margin-top:3px;">7 sources · engineer format · causal chains</p>
  <div class="srcs">
    <span class="src">Morning Brew</span><span class="src">CNBC</span>
    <span class="src">Reuters</span><span class="src">TLDR</span>
    <span class="src">Rundown AI</span><span class="src">IT Brew</span><span class="src">SA</span>
  </div>
</div>`);

  // Markets
  const mktTickers = (markets.tickers || []).map((t: { label: string; value: string; change: string; direction: string }) => `
    <div class="mkt">
      <div class="mn">${esc(t.label)}</div>
      <div class="mv ${t.direction === "neutral" ? "" : t.direction}">${esc(t.value)}</div>
      <div class="mc ${t.direction === "neutral" ? "" : t.direction}">${esc(t.change)}</div>
    </div>`).join("");

  const mechInline = esc(markets.key_mechanism || "").replace(/→/g, '<span class="arr">→</span>');
  sections.push(`
<div class="sec">
  <div class="sh"><div class="sn">$</div>
    <h2>Markets — ${esc(markets.summary_title || "")}</h2>
  </div>
  <div class="mkts">${mktTickers}</div>
  <div class="note">
    <strong>Why:</strong> ${mechInline}<br/><br/>
    <strong>Watch:</strong> ${esc(markets.week_ahead || "")}
  </div>
</div>`);

  // Stories
  (data.stories || []).forEach((story: {
    title: string;
    sources: string[];
    what: string;
    mechanism: { label: string; steps?: { text: string; type: string }[]; chain?: string }[];
    so_what: string[];
    price_moves: { ticker: string; company: string; direction: string; magnitude: string; reason: string }[];
    glossary_terms: string[];
    highlights: { text: string; type: string }[];
  }, i: number) => {
    const hl = story.highlights || [];
    const gl = story.glossary_terms || [];

    function process(text: string): string {
      let t = esc(text);
      t = applyHighlights(t, hl);
      t = injectGlossaryLinks(t, gl);
      return t;
    }

    const srcMeta: Record<string, [string, string]> = {
      MB: ["Morning Brew","b-mb"], CNBC: ["CNBC","b-cn"], Reuters: ["Reuters","b-rt"],
      TLDR: ["TLDR","b-tl"], Rundown: ["Rundown AI","b-rd"], ITBrew: ["IT Brew","b-ib"], SA: ["SA","b-sa"]
    };
    const badgesHtml = story.sources.length > 2
      ? `<span class="badge b-multi">Multi-source</span>`
      : story.sources.map(s => {
          const [label, cls] = srcMeta[s] || [s, "b-multi"];
          return `<span class="badge ${cls}">${label}</span>`;
        }).join("");

    const chainsHtml = renderChains(story.mechanism || [], hl, gl);
    const movesHtml = renderPriceMoves(story.price_moves || []);

    // So what bullets
    const bullets = (story.so_what || []).map((b: string) =>
      `<span class="sowhat-line"><span class="swbullet"></span><span>${process(b)}</span></span>`
    ).join("\n");

    sections.push(`
<div class="sec">
  <div class="sh">
    <div class="sn">${i + 1}</div>
    <h2>${esc(story.title)}</h2>
    <div class="badges">${badgesHtml}</div>
  </div>
  <div class="story">
    <p class="what"><strong>What:</strong> ${process(story.what)}</p>
    ${chainsHtml}
    ${movesHtml}
    <div class="sowhat">
      <span class="swl">so what</span>
      ${bullets}
    </div>
  </div>
</div>`);
  });

  // Quick hits
  const hitsHtml = (data.quick_hits || []).map((h: { topic: string; detail: string; highlight: string; source: string }) => {
    let detail = esc(h.detail);
    if (h.highlight && detail.includes(h.highlight)) {
      detail = detail.replace(h.highlight, `<span class="hn">${h.highlight}</span>`);
    }
    const srcMap: Record<string, string> = {
      MB:"b-mb", CNBC:"b-cn", Reuters:"b-rt", TLDR:"b-tl", Rundown:"b-rd", ITBrew:"b-ib", SA:"b-sa"
    };
    const badgeCls = srcMap[h.source] || "b-multi";
    const badge = h.source
      ? `<span class="badge ${badgeCls}" style="margin-left:5px;vertical-align:middle;">${esc(h.source)}</span>`
      : "";
    return `<li><strong>${esc(h.topic)}:</strong> ${detail}${badge}</li>`;
  }).join("\n    ");

  sections.push(`
<div class="sec">
  <div class="sh"><div class="sn">#</div><h2>Quick Hits</h2>
    <div class="badges"><span class="badge b-multi">All Sources</span></div>
  </div>
  <div class="hits"><ul>
    ${hitsHtml}
  </ul></div>
</div>`);

  // Glossary
  const glossaryEntries = uniqueTerms
    .filter(t => GLOSSARY[t])
    .map(t => {
      const e = GLOSSARY[t];
      const id = glossaryId(t);
      const chainHtml = e.chain
        ? `<div class="gl-chain">${esc(e.chain).replace(/→/g, '<span class="arr">→</span>')}</div>`
        : "";
      return `
<div class="gl-entry" id="${id}">
  <div class="gl-term">${esc(e.term)}</div>
  <div class="gl-def">${esc(e.def)}</div>
  ${chainHtml}
</div>`;
    });

  if (glossaryEntries.length) {
    sections.push(`
<div class="glossary">
  <div class="gl-hdr">Finance &amp; Tech Glossary</div>
  ${glossaryEntries.join("")}
</div>`);
  }

  sections.push(`
<footer style="max-width:740px;margin:0 auto;">
  Sources: Morning Brew · CNBC · Reuters · TLDR · Rundown AI · IT Brew · Seeking Alpha<br/>
  Engineer format · Generated ${today}
</footer>`);

  const body = sections.join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Anqi's Daily Brief — ${today}</title>
<style>${CSS}</style>
</head>
<body>${body}</body>
</html>`;
}

// ── Storyteller Renderer ───────────────────────────────────────────────────
// Same JSON, different visual treatment:
// - No arrow chains — mechanism shown as prose with visual step-labels
// - narrative_why split into backdrop / mechanism / result tagged sentences
// - Warmer serif typography, sentence-level paragraphs, emoji so-what bullets
// - Inline number + company auto-highlights

const CSS_STORYTELLER = `
:root{--bg:#fffef9;--card:#fff;--a:#d97706;--al:#fef3c7;--text:#1c1917;
--m:#78716c;--bd:#e7e5e4;--sh:0 2px 8px rgba(0,0,0,.04);}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:Georgia,serif;
font-size:15px;line-height:1.75;padding-bottom:60px;}
a{color:var(--a);}
.hero{background:linear-gradient(135deg,#fffef9,#fef3c7);
border-bottom:2px solid var(--bd);padding:28px 32px 16px;}
.hero h1{font-size:1.6rem;font-weight:700;margin-bottom:4px;font-family:Georgia,serif;}
.date{font-size:11px;color:var(--m);letter-spacing:.8px;text-transform:uppercase;
margin-bottom:8px;font-family:system-ui,sans-serif;}
.sec{margin-top:32px;max-width:700px;margin-left:auto;margin-right:auto;padding:0 24px;}
.story-title{font-size:1.15rem;font-weight:700;margin-bottom:8px;
border-bottom:2px solid var(--a);padding-bottom:6px;font-family:Georgia,serif;}
.story{margin-bottom:8px;}
.narrative{font-size:15px;line-height:1.8;margin-bottom:8px;color:var(--text);}
.why-block{background:var(--al);border-left:3px solid var(--a);
border-radius:0 6px 6px 0;padding:10px 14px;margin-bottom:10px;}
.why-label{font-style:normal;font-size:10px;font-weight:700;text-transform:uppercase;
letter-spacing:.6px;color:var(--a);display:block;margin-bottom:8px;
font-family:system-ui,sans-serif;}
.why-sentence{font-size:14px;line-height:1.75;font-style:italic;
margin-bottom:6px;padding-left:10px;border-left:2px solid transparent;}
.why-sentence:last-child{margin-bottom:0;}
.wt-backdrop{border-left-color:#d97706;}
.wt-mechanism{border-left-color:#6c5ce7;}
.wt-result{border-left-color:#10b981;}
.wt-tag{font-style:normal;font-size:9px;font-weight:700;text-transform:uppercase;
letter-spacing:.4px;padding:1px 5px;border-radius:3px;margin-right:5px;
vertical-align:middle;font-family:system-ui,sans-serif;}
.wt-tag-backdrop{background:#fef3c7;color:#92400e;}
.wt-tag-mechanism{background:#f1f5f9;color:#475569;}
.wt-tag-result{background:#dcfce7;color:#14532d;}
.so-what-st{border-top:1px solid var(--bd);padding-top:10px;margin-top:10px;}
.so-what-label{font-size:10px;font-weight:700;text-transform:uppercase;
letter-spacing:.6px;color:var(--a);margin-bottom:6px;display:block;
font-family:system-ui,sans-serif;}
.so-what-item{font-size:13px;line-height:1.6;margin-bottom:6px;
display:flex;align-items:flex-start;gap:8px;}
.so-icon{flex-shrink:0;font-size:14px;}
.mkts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px;}
.mkt{background:var(--card);border:1px solid var(--bd);border-radius:8px;
padding:8px 10px;text-align:center;}
.mn{font-size:9px;color:var(--m);font-weight:700;text-transform:uppercase;
font-family:system-ui,sans-serif;}
.mv{font-size:.95rem;font-weight:700;font-family:system-ui,sans-serif;}
.mc{font-size:10px;font-family:system-ui,sans-serif;}
.up{color:#16a34a;} .dn{color:#dc2626;}
.note{background:var(--al);border-left:3px solid var(--a);
border-radius:0 6px 6px 0;padding:8px 12px;font-size:14px;margin-top:8px;}
.hn{background:#fef9c3;color:#713f12;border-radius:3px;padding:0 3px;font-weight:700;font-style:normal;}
.hc{background:#e0f2fe;color:#0c4a6e;border-radius:3px;padding:0 3px;font-weight:700;font-style:normal;}
.hits{margin-top:24px;}
.hits ul{padding-left:0;list-style:none;}
.hits li{font-size:13px;line-height:1.6;margin-bottom:8px;
padding-left:16px;position:relative;font-family:system-ui,sans-serif;}
.hits li::before{content:"—";position:absolute;left:0;color:var(--a);}
footer{margin-top:32px;text-align:center;color:var(--m);font-size:11px;
padding:12px;border-top:1px solid var(--bd);font-family:system-ui,sans-serif;}
@media(max-width:560px){.hero{padding:16px;}.sec{padding:0 12px;}
.mkts{grid-template-columns:repeat(2,1fr);}}
`;

// Split narrative_why into sentences and tag them as backdrop / mechanism / result.
// Works on 2-3 sentence prose: first = backdrop, middle = mechanism, last = result.
function renderNarrativeWhy(rawText: string): string {
  if (!rawText) return "";

  // Auto-highlight numbers and dollar amounts in the text
  function autoHL(t: string): string {
    // Escape first, then inject highlights — careful not to double-escape
    t = t.replace(/\$[\d,.]+[BMKbmk]?/g, m => `<span class="hn">${m}</span>`);
    t = t.replace(/\b\d+[.,]?\d*%/g, m => `<span class="hn">${m}</span>`);
    return t;
  }

  // Split on sentence boundaries
  const raw = esc(rawText);
  const sentences = raw
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  if (sentences.length === 0) return "";

  // Tag assignments by position
  const TAGS: { cls: string; tagCls: string; label: string }[] = [
    { cls: "wt-backdrop",  tagCls: "wt-tag-backdrop",  label: "backdrop"   },
    { cls: "wt-mechanism", tagCls: "wt-tag-mechanism",  label: "mechanism"  },
    { cls: "wt-result",    tagCls: "wt-tag-result",     label: "result"     },
  ];

  const sentenceHtml = sentences.map((s, i) => {
    // Last sentence always gets "result" tag regardless of total count
    let tagIdx = i;
    if (i >= TAGS.length - 1) tagIdx = TAGS.length - 1;
    // If only 2 sentences: backdrop + result (skip mechanism)
    if (sentences.length === 2 && i === 1) tagIdx = 2;

    const tag = TAGS[tagIdx];
    const highlighted = autoHL(s);
    return `<div class="why-sentence ${tag.cls}"><span class="wt-tag ${tag.cls} ${tag.tagCls}">${tag.label}</span>${highlighted}</div>`;
  }).join("\n");

  return `<div class="why-block">
  <span class="why-label">Why it happened</span>
  ${sentenceHtml}
</div>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderStoryteller(data: any): string {
  const today = data.date || new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const markets = data.markets || {};
  const sections: string[] = [];

  // Hero
  sections.push(`
<div class="hero">
  <div class="date">${today.toUpperCase()}</div>
  <h1>Today's Stories</h1>
  <p style="color:#78716c;font-size:13px;margin-top:4px;font-family:system-ui,sans-serif;">
    What happened, why it matters, what it means for you
  </p>
</div>`);

  // Markets
  const stTickers = (markets.tickers || []).map((t: { label: string; value: string; change: string; direction: string }) => `
    <div class="mkt">
      <div class="mn">${esc(t.label)}</div>
      <div class="mv ${t.direction === "neutral" ? "" : t.direction}">${esc(t.value)}</div>
      <div class="mc ${t.direction === "neutral" ? "" : t.direction}">${esc(t.change)}</div>
    </div>`).join("");

  sections.push(`
<div class="sec">
  <div class="story-title">The Market Picture</div>
  <div class="mkts">${stTickers}</div>
  <div class="note">${esc(markets.key_mechanism || "")} — <em>${esc(markets.week_ahead || "")}</em></div>
</div>`);

  // Stories
  (data.stories || []).forEach((story: {
    title: string;
    narrative?: string;
    what: string;
    narrative_why?: string;
    so_what: string[];
    price_moves?: { ticker: string; company: string; direction: string; magnitude: string; reason: string }[];
    highlights: { text: string; type: string }[];
  }, i: number) => {
    const hl = story.highlights || [];
    const narrativeText = story.narrative || story.what;
    const whyText = story.narrative_why || "";

    function processNarrative(text: string): string {
      let t = esc(text);
      t = applyHighlights(t, hl);
      // Auto-highlight numbers and dollar amounts
      t = t.replace(/\$[\d,.]+[BMKbmk]?/g, m => `<span class="hn">${m}</span>`);
      t = t.replace(/\b\d+[.,]?\d*%/g, m => `<span class="hn">${m}</span>`);
      return t;
    }

    // Split narrative into sentence-level paragraphs for readability
    function formatNarrative(text: string): string {
      const processed = processNarrative(text);
      const sentences = processed.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
      if (sentences.length <= 1) return `<p class="narrative">${processed}</p>`;
      return sentences.map(s => `<p class="narrative">${s}</p>`).join("\n");
    }

    // So what — plain bullets, no emoji
    const soWhatItems = (story.so_what || []).map((b) => {
      return `<div class="so-what-item"><span class="so-icon">—</span><span>${processNarrative(b)}</span></div>`;
    }).join("");

    // Price moves — inline styles via shared renderer
    const movesHtml = renderPriceMoves(story.price_moves || []);

    // narrative_why — visual step tags
    const whyBlockHtml = renderNarrativeWhy(whyText);

    sections.push(`
<div class="sec">
  <div class="story-title">${i + 1}. ${esc(story.title)}</div>
  <div class="story">
    ${formatNarrative(narrativeText)}
    ${movesHtml}
    ${whyBlockHtml}
    <div class="so-what-st">
      <span class="so-what-label">Why it matters</span>
      ${soWhatItems}
    </div>
  </div>
</div>`);
  });

  // Quick hits
  const hitsHtml = (data.quick_hits || []).map((h: { topic: string; detail: string }) =>
    `<li><strong>${esc(h.topic)}:</strong> ${esc(h.detail)}</li>`
  ).join("\n    ");

  sections.push(`
<div class="sec hits">
  <div class="story-title">Also today</div>
  <ul>
    ${hitsHtml}
  </ul>
</div>`);

  sections.push(`
<footer style="max-width:700px;margin:0 auto;">
  Sources: Morning Brew · CNBC · Reuters · TLDR · Rundown AI · IT Brew · Seeking Alpha<br/>
  Storyteller format · ${today}
</footer>`);

  const body = sections.join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Today's Stories — ${today}</title>
<style>${CSS_STORYTELLER}</style>
</head>
<body>${body}</body>
</html>`;
}
