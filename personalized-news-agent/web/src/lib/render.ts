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
.pmoves{display:flex;flex-direction:column;gap:4px;margin-top:8px;}
.pm{display:flex;align-items:center;gap:6px;border-radius:6px;padding:6px 11px;font-size:12px;}
.pm-up{background:#dcfce7;border:1px solid #bbf7d0;}
.pm-dn{background:#fce7f3;border:1px solid #fbcfe8;}
.pm-watch{background:#fff3cd;border:1px solid #fde68a;}
.pm-tick{font-weight:800;font-family:monospace;flex-shrink:0;}
.pm-up .pm-tick,.pm-up .pm-mag{color:#14532d;}
.pm-dn .pm-tick,.pm-dn .pm-mag{color:#831843;}
.pm-watch .pm-tick,.pm-watch .pm-mag{color:#713f12;}
.pm-company{flex-shrink:0;opacity:.7;}
.pm-sep{opacity:.35;flex-shrink:0;}
.pm-mag{font-weight:700;flex-shrink:0;}
.pm-why{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pm-up .pm-why,.pm-up .pm-company{color:#166534;}
.pm-dn .pm-why,.pm-dn .pm-company{color:#9d174d;}
.pm-watch .pm-why,.pm-watch .pm-company{color:#92400e;}
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
  const tickers = (markets.tickers || []).map((t: { label: string; value: string; change: string; direction: string }) => `
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
  <div class="mkts">${tickers}</div>
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

    // Price moves
    const DIR_CLS: Record<string, string> = { up: "pm-up", dn: "pm-dn", watch: "pm-watch" };
    const DIR_SYM: Record<string, string> = { up: "↑", dn: "↓", watch: "watch" };
    let movesHtml = "";
    if (story.price_moves?.length) {
      const cards = story.price_moves.map(m => {
        const dc = DIR_CLS[m.direction] || "pm-watch";
        const sym = DIR_SYM[m.direction] || "watch";
        const magStr = m.magnitude
          ? `<span class="pm-mag">${esc(m.magnitude)}</span>`
          : `<span class="pm-mag">${sym}</span>`;
        const company = m.company
          ? `<span class="pm-sep">/</span><span class="pm-company">${esc(m.company)}</span>`
          : "";
        const why = m.reason
          ? `<span class="pm-why">${esc(m.reason)}</span>`
          : "";
        return `<div class="pm ${dc}"><span class="pm-tick">${esc(m.ticker)}</span>${company} ${magStr} ${why}</div>`;
      }).join("\n");
      movesHtml = `<div class="pmoves">${cards}</div>`;
    }

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
// - No arrow chains — mechanism steps shown as flowing prose paragraphs
// - Warmer, softer typography
// - so_what framed as "why this matters" not investment bullets
// - Bigger type, more breathing room

const STORYTELLER_CSS = `
:root{--bg:#fffdf9;--card:#fff;--a:#d97706;--al:#fef3c7;--text:#1c1917;
--m:#78716c;--bd:#e7e5e4;--sh:0 2px 12px rgba(0,0,0,.06);}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:Georgia,serif;
font-size:16px;line-height:1.8;padding-bottom:60px;}
.hero{background:linear-gradient(135deg,#fffdf9,#fef3c7);
border-bottom:2px solid var(--bd);padding:28px 32px 18px;}
.hero h1{font-size:1.6rem;font-weight:700;margin-bottom:4px;font-family:Georgia,serif;}
.date{font-size:11px;color:var(--m);font-weight:600;letter-spacing:.5px;
text-transform:uppercase;margin-bottom:8px;font-family:system-ui,sans-serif;}
.srcs{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px;}
.src{background:var(--card);border:1px solid var(--bd);border-radius:10px;
padding:2px 9px;font-size:11px;color:var(--m);font-family:system-ui,sans-serif;}
.sec{margin-top:32px;max-width:680px;margin-left:auto;margin-right:auto;padding:0 24px;}
.story-num{color:var(--a);font-size:11px;font-weight:700;text-transform:uppercase;
letter-spacing:.8px;display:block;margin-bottom:6px;font-family:system-ui,sans-serif;}
.story-title{font-size:1.2rem;font-weight:700;margin-bottom:16px;line-height:1.4;}
.story-body{background:var(--card);border:1px solid var(--bd);border-radius:12px;
padding:20px 24px;box-shadow:var(--sh);}
.story-what{font-size:16px;line-height:1.8;margin-bottom:14px;}
.story-why{background:#fef3c7;border-left:3px solid var(--a);
border-radius:0 8px 8px 0;padding:12px 16px;font-size:15px;
line-height:1.75;margin-bottom:14px;font-style:italic;}
.story-why-label{font-style:normal;font-size:10px;font-weight:700;
text-transform:uppercase;letter-spacing:.6px;color:var(--a);
display:block;margin-bottom:4px;font-family:system-ui,sans-serif;}
.story-sowhat{margin-top:14px;padding-top:14px;border-top:1px solid var(--bd);}
.story-sowhat-label{font-size:10px;font-weight:700;text-transform:uppercase;
letter-spacing:.6px;color:var(--m);display:block;margin-bottom:8px;
font-family:system-ui,sans-serif;}
.story-sowhat p{font-size:15px;line-height:1.7;margin-bottom:8px;}
.story-sowhat p:last-child{margin-bottom:0;}
.mkts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;}
.mkt{background:var(--card);border:1px solid var(--bd);border-radius:8px;
padding:8px 10px;text-align:center;}
.mn{font-size:9px;color:var(--m);font-weight:700;text-transform:uppercase;
font-family:system-ui,sans-serif;}
.mv{font-size:.95rem;font-weight:700;font-family:system-ui,sans-serif;}
.mc{font-size:10px;font-weight:600;font-family:system-ui,sans-serif;}
.up{color:#059669;} .dn{color:#dc2626;}
.mkt-note{background:#fef3c7;border-left:3px solid var(--a);
border-radius:0 8px 8px 0;padding:10px 14px;font-size:14px;margin-top:8px;}
.hits-section{margin-top:32px;max-width:680px;margin-left:auto;
margin-right:auto;padding:0 24px;}
.hits-title{font-size:1rem;font-weight:700;margin-bottom:14px;
border-bottom:1.5px solid var(--bd);padding-bottom:8px;
font-family:system-ui,sans-serif;}
.hit{font-size:14px;line-height:1.6;margin-bottom:8px;
padding-bottom:8px;border-bottom:1px solid #f5f5f4;}
.hit:last-child{border-bottom:none;}
.hit-topic{font-weight:700;font-family:system-ui,sans-serif;}
footer{margin-top:32px;text-align:center;color:var(--m);font-size:11px;
padding:14px;border-top:1px solid var(--bd);font-family:system-ui,sans-serif;}
@media(max-width:560px){.hero{padding:18px 16px 14px;}
.sec,.hits-section{padding:0 12px;}.mkts{grid-template-columns:repeat(2,1fr);}}
`;

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
.date{font-size:11px;color:var(--m);letter-spacing:.8px;text-transform:uppercase;margin-bottom:8px;}
.sec{margin-top:32px;max-width:700px;margin-left:auto;margin-right:auto;padding:0 24px;}
.story-title{font-size:1.15rem;font-weight:700;margin-bottom:8px;
border-bottom:2px solid var(--a);padding-bottom:6px;font-family:Georgia,serif;}
.story{margin-bottom:8px;}
.narrative{font-size:15px;line-height:1.8;margin-bottom:14px;color:var(--text);}
.why-prose{background:var(--al);border-left:3px solid var(--a);
border-radius:0 6px 6px 0;padding:10px 14px;font-size:14px;
line-height:1.75;margin-bottom:10px;font-style:italic;}
.so-what-st{border-top:1px solid var(--bd);padding-top:10px;margin-top:10px;}
.so-what-label{font-size:10px;font-weight:700;text-transform:uppercase;
letter-spacing:.6px;color:var(--a);margin-bottom:6px;display:block;}
.so-what-item{font-size:13px;line-height:1.6;margin-bottom:5px;
padding-left:12px;border-left:2px solid var(--a);}
.mkts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px;}
.mkt{background:var(--card);border:1px solid var(--bd);border-radius:8px;
padding:8px 10px;text-align:center;}
.mn{font-size:9px;color:var(--m);font-weight:700;text-transform:uppercase;}
.mv{font-size:.95rem;font-weight:700;} .mc{font-size:10px;}
.up{color:#16a34a;} .dn{color:#dc2626;}
.note{background:var(--al);border-left:3px solid var(--a);
border-radius:0 6px 6px 0;padding:8px 12px;font-size:14px;margin-top:8px;}
.hits{margin-top:24px;}
.hits ul{padding-left:0;list-style:none;}
.hits li{font-size:13px;line-height:1.6;margin-bottom:8px;
padding-left:16px;position:relative;}
.hits li::before{content:"—";position:absolute;left:0;color:var(--a);}
footer{margin-top:32px;text-align:center;color:var(--m);font-size:11px;
padding:12px;border-top:1px solid var(--bd);}
.pmoves{display:flex;flex-direction:column;gap:4px;margin:10px 0;}
.pm{display:flex;align-items:center;gap:6px;border-radius:6px;padding:5px 10px;font-size:12px;}
.pm-up{background:#dcfce7;border:1px solid #bbf7d0;}
.pm-dn{background:#fce7f3;border:1px solid #fbcfe8;}
.pm-watch{background:#fff3cd;border:1px solid #fde68a;}
.pm-tick{font-weight:800;font-family:monospace;flex-shrink:0;}
.pm-up .pm-tick,.pm-up .pm-mag{color:#14532d;}
.pm-dn .pm-tick,.pm-dn .pm-mag{color:#831843;}
.pm-watch .pm-tick,.pm-watch .pm-mag{color:#713f12;}
.pm-company{flex-shrink:0;opacity:.7;}.pm-sep{opacity:.35;flex-shrink:0;}
.pm-mag{font-weight:700;flex-shrink:0;}
.pm-why{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
@media(max-width:560px){.hero{padding:16px;}.sec{padding:0 12px;}
.mkts{grid-template-columns:repeat(2,1fr);}}
`;

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

  // Markets — simpler summary for storyteller
  const tickers = (markets.tickers || []).map((t: { label: string; value: string; change: string; direction: string }) => `
    <div class="mkt">
      <div class="mn">${esc(t.label)}</div>
      <div class="mv ${t.direction === "neutral" ? "" : t.direction}">${esc(t.value)}</div>
      <div class="mc ${t.direction === "neutral" ? "" : t.direction}">${esc(t.change)}</div>
    </div>`).join("");

  sections.push(`
<div class="sec">
  <div class="story-title">The Market Picture</div>
  <div class="mkts">${tickers}</div>
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
      return applyHighlights(esc(text), hl);
    }

    const soWhatItems = (story.so_what || []).map(b =>
      `<div class="so-what-item">${processNarrative(b)}</div>`
    ).join("");

    // Price moves — keep the same compact cards
    const DIR_CLS: Record<string, string> = { up: "pm-up", dn: "pm-dn", watch: "pm-watch" };
    const DIR_SYM: Record<string, string> = { up: "↑", dn: "↓", watch: "watch" };
    let movesHtml = "";
    if (story.price_moves?.length) {
      const cards = story.price_moves.map((m: { ticker: string; company: string; direction: string; magnitude: string; reason: string }) => {
        const dc = DIR_CLS[m.direction] || "pm-watch";
        const sym = DIR_SYM[m.direction] || "watch";
        const magStr = m.magnitude ? `<span class="pm-mag">${esc(m.magnitude)}</span>` : `<span class="pm-mag">${sym}</span>`;
        const company = m.company ? `<span class="pm-sep">/</span><span class="pm-company">${esc(m.company)}</span>` : "";
        const why = m.reason ? `<span class="pm-why">${esc(m.reason)}</span>` : "";
        return `<div class="pm ${dc}" style="font-family:system-ui,sans-serif;font-size:12px;"><span class="pm-tick">${esc(m.ticker)}</span>${company} ${magStr} ${why}</div>`;
      }).join("");
      movesHtml = `<div class="pmoves" style="margin:10px 0;">${cards}</div>`;
    }

    sections.push(`
<div class="sec">
  <div class="story-title">${i + 1}. ${esc(story.title)}</div>
  <div class="story">
    <p class="narrative">${processNarrative(narrativeText)}</p>
    ${whyText ? `<div class="why-prose">${processNarrative(whyText)}</div>` : ""}
    ${movesHtml}
    <div class="so-what-st">
      <span class="so-what-label">Why it matters</span>
      ${soWhatItems}
    </div>
  </div>
</div>`);
  });

  // Quick hits — conversational list
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
