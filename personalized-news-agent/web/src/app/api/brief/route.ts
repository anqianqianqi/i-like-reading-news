/**
 * /api/brief — Agentic pipeline with Blob persistence.
 * All pipeline logic inlined — no internal HTTP calls.
 *
 * GET  ?date=2026-08-22  → load existing brief from Blob (or 404)
 * POST { force?: bool }  → run full pipeline, save to Blob, return final brief
 */

import { NextRequest, NextResponse } from "next/server";
import { todayKey, saveJSON, saveText, loadJSON, todayBriefExists, deleteBrief } from "@/lib/storage";

export const maxDuration = 300;

// ── Source scraper ─────────────────────────────────────────────────────────

const SOURCES = [
  { id: "MB",      label: "Morning Brew",  url: "https://www.morningbrew.com/issues/latest",                                                     rss: false },
  { id: "CNBC",    label: "CNBC",          url: "https://www.cnbc.com/world/?region=world",                                                       rss: false },
  { id: "Reuters", label: "Reuters",       url: "https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en",                rss: true  },
  { id: "TLDR",    label: "TLDR",          url: "https://tldr.tech/",                                                                             rss: false },
  { id: "Rundown", label: "Rundown AI",    url: "https://www.therundown.ai/archive",                                                              rss: false },
  { id: "ITBrew",  label: "IT Brew",       url: "https://www.itbrew.com/",                                                                        rss: false },
  { id: "SA",      label: "Seeking Alpha", url: "https://news.google.com/rss/search?q=site:seekingalpha.com+markets+earnings&hl=en-US&gl=US&ceid=US:en", rss: true },
];

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

async function fetchText(url: string, maxChars = 12000): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, maxChars);
  } catch { return ""; }
}

async function fetchRss(url: string, maxItems = 15): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    const xml = await res.text();
    const items: string[] = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m: RegExpExecArray | null;
    let count = 0;
    // eslint-disable-next-line no-cond-assign
    while (count < maxItems && (m = itemRe.exec(xml)) !== null) {
      const item = m[1];
      const title = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/)?.[1] || "";
      const link  = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
      const desc  = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/)?.[1] || "";
      const clean = desc.replace(/<[^>]+>/g, " ").trim().slice(0, 300);
      items.push(`TITLE: ${title}\nLINK: ${link}\nSUMMARY: ${clean}`);
      count++;
    }
    return items.join("\n\n");
  } catch { return ""; }
}

async function scrapeAllSources(): Promise<{ rawSources: string; date: string; srcLog: string[] }> {
  const parts: string[] = [];
  const srcLog: string[] = [];
  for (const src of SOURCES) {
    const text = src.rss ? await fetchRss(src.url) : await fetchText(src.url);
    srcLog.push(`  ${src.id}: ${text.length.toLocaleString()} chars`);
    parts.push(`\n\n${"=".repeat(60)}\nSOURCE: ${src.id} — ${src.label}\nURL: ${src.url}\n${"=".repeat(60)}\n${text}`);
  }
  const rawSources = parts.join("\n");
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return { rawSources, date, srcLog };
}

// ── OpenAI caller ──────────────────────────────────────────────────────────

async function openai(apiKey: string, payload: object): Promise<{ data: unknown; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${rawText.slice(0, 300)}`);
  }
  let result: { choices: { message: { content: string } }[]; usage: { prompt_tokens: number; completion_tokens: number } };
  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(`OpenAI response not JSON: ${rawText.slice(0, 200)}`);
  }
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`OpenAI empty content. Full response: ${rawText.slice(0, 300)}`);
  }
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error(`Content not valid JSON: ${content.slice(0, 200)}`);
  }
  return { data, usage: result.usage };
}

// ── Prompts (imported inline to avoid self-HTTP) ───────────────────────────

const GENERATE_SYSTEM = `You are extracting and analyzing today's news for a personalized news digest.
Your job is INTELLIGENCE ONLY — understanding, deduplication, causal analysis.
You return structured JSON only. No HTML.

## YOUR READER: The Engineer
Thinks in systems and flowcharts. Wants mechanisms, not just outcomes.
Has finance/investing knowledge. Wants market implications on everything.

## QUALITY BAR

BAD (too shallow):
  what: "US imposes 50% tariffs on Canadian goods after failed trade talks."
  mechanism: ["Companies fail to agree", "US imposes tariffs", "Canada retaliates"]
  so_what: ["Trade tensions could disrupt supply chains.", "Monitor retaliatory measures."]

GOOD (required depth):
  what: "US-Canada trade talks collapsed at midnight. 50% tariffs on $20B Canadian goods (steel, aluminum, autos, lumber) activated at 12:01am. PM Carney confirmed dollar-for-dollar retaliation. A draft deal was close but negotiators couldn't bridge the final gap."
  mechanism steps:
  - cause: "US-Canada talks collapse at midnight deadline"
  - mechanism: "50% tariff activates on Canadian steel, aluminum, autos, lumber"
  - mechanism: "tariff = tax on US importers not Canada — US companies pay the 50%, not Canadians"
  - mechanism: "Canadian input costs rise 50% for US manufacturers using Canadian materials"
  - result-long: "manufacturers absorb margin hit OR raise prices — consumer inflation gets new input"
  so_what:
  - "Tariffs are a domestic tax — US importers pay, not Canada. Affected: US auto assemblers, homebuilders."
  - "Bearish US manufacturers with Canadian supply chains. Watch corn/soybean futures if Canada retaliates on ag."
  - "Watch Sept 8 deadline — Canada retaliatory tariffs activate."

## EXTRACTION RULES

### Story selection
FULL STORY SLOT: geopolitical events with economic consequences, major market moves, earnings results, policy with direct market impact, tech milestones changing competitive dynamics.
QUICK HIT ONLY: minor legal procedural news, product feature announcements with no market impact, social/cultural stories, "court allows X to continue" with no economic consequence yet.

### Deduplication
Merge stories covered by multiple sources into ONE. List all source IDs.

### One story = one theme
Group parallel threads proving the same thesis into one story. Use "Event A + Event B → shared implication" format.

### Mechanism chains
3 layers: CAUSE → INTERMEDIATE MECHANISM → RESULT. 4-6 steps. No bracket labels. No parenthetical explanations in chain.

### No buzzwords without definition
Define in so_what on first use: yield, DCF, tariff, rate hike, basis points, short squeeze, ASIC, hyperscaler, capex, inference, leverage, duration risk, bond vigilante.

### Glossary terms — always populate
Tag ALL finance/tech terms per story: bond yield, DCF, tariff, rate hike, basis points, short squeeze, ASIC, hyperscaler, capex, inference, leverage, duration risk, bond vigilante, ETF, PCE, FOMC. Finance story with zero glossary terms is wrong.

### So what field
2-3 bullets, max 20 words each. Lead with punchline. Include specific sector/ticker/direction. NEVER write "monitor developments" or "watch for changes" — always name what specifically.

### Price moves — no hallucinations
ONLY add tickers explicitly named in sources. Never infer affected companies.

### Coverage requirements — CRITICAL
- MINIMUM 6 main stories. MAXIMUM 8.
- MINIMUM 15 quick hits. Target 20-25.
- Every source item must appear somewhere. Nothing gets dropped.
- Raw sources ~50k chars — output must reflect that volume.`;

const CRITIQUE_SYSTEM = `You are a quality reviewer for a personalized news digest.
Review each story and flag failures. Return JSON: { issues: [...], passed_count, failed_count }

A story FAILS if:
- "what" is vague — missing specific numbers, names, dollar amounts
- mechanism steps just restate events without explaining WHY each step causes the next
- so_what says "monitor developments" or "watch for changes" without specifics
- price_moves contains tickers NOT explicitly named in the source

A story PASSES if:
- "what" contains specific facts (numbers, names, amounts)
- mechanism explains causality at each step
- so_what gives specific investment direction (sector, ticker, direction)

Flag format: { story_index, story_title, failures: string[], missing_facts: string[], rewrite_priority: "high"|"medium" }
Only flag genuinely failing stories.`;

const REWRITE_SYSTEM = `You are rewriting a news story to fix quality issues. Fix only what is flagged.

what field: include specific numbers, dollar amounts, names, timelines.
mechanism steps: each step explains WHY it causes the next. 4-6 steps. Types: cause/mechanism/result-short/result-long.
so_what: 2-3 bullets, max 20 words, specific ticker/sector/direction. NEVER "monitor developments".

Return JSON: { story_index, updated_what, updated_mechanism: [{label, steps: [{text, type}]}], updated_so_what: string[] }`;

// ── JSON Schema for generation ─────────────────────────────────────────────

const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    date: { type: "string" },
    markets: {
      type: "object",
      properties: {
        summary_title: { type: "string" },
        key_mechanism:  { type: "string", description: "Single dominant market force today as one causal chain. MAX 4 steps." },
        week_ahead:     { type: "string" },
        tickers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label:     { type: "string" },
              value:     { type: "string" },
              change:    { type: "string" },
              direction: { type: "string", enum: ["up", "dn", "neutral"] }
            },
            required: ["label","value","change","direction"],
            additionalProperties: false
          }
        }
      },
      required: ["summary_title","key_mechanism","week_ahead","tickers"],
      additionalProperties: false
    },
    stories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title:   { type: "string" },
          sources: { type: "array", items: { type: "string" } },
          what:    { type: "string" },
          mechanism: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      type: { type: "string", enum: ["cause","mechanism","result-short","result-long"] }
                    },
                    required: ["text","type"],
                    additionalProperties: false
                  }
                }
              },
              required: ["label","steps"],
              additionalProperties: false
            }
          },
          so_what:        { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
          price_moves: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ticker:    { type: "string" },
                company:   { type: "string" },
                direction: { type: "string", enum: ["up","dn","watch"] },
                magnitude: { type: "string" },
                reason:    { type: "string" }
              },
              required: ["ticker","company","direction","magnitude","reason"],
              additionalProperties: false
            }
          },
          glossary_terms: {
            type: "array",
            description: "REQUIRED. List every finance/tech term in this story a non-expert might not know. Do not leave empty.",
            items: { type: "string" }
          },
          highlights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                type: { type: "string", enum: ["number","company","risk","positive"] }
              },
              required: ["text","type"],
              additionalProperties: false
            }
          }
        },
        required: ["title","sources","what","mechanism","so_what","price_moves","glossary_terms","highlights"],
        additionalProperties: false
      }
    },
    quick_hits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic:     { type: "string" },
          detail:    { type: "string" },
          highlight: { type: "string" },
          source:    { type: "string" }
        },
        required: ["topic","detail","highlight","source"],
        additionalProperties: false
      }
    }
  },
  required: ["date","markets","stories","quick_hits"],
  additionalProperties: false
};

// ── Route handlers ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || todayKey();
  const brief = await loadJSON(date, "brief_final.json");
  if (!brief) return NextResponse.json({ exists: false }, { status: 404 });
  const critique = await loadJSON(date, "critique.json");
  return NextResponse.json({ exists: true, brief, critique, date });
}

export async function DELETE(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || todayKey();
  await deleteBrief(date);
  return NextResponse.json({ deleted: true, date });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const { force } = body as { force?: boolean };
  const date = todayKey();
  // No persistent cache yet — always run the pipeline
  const log: string[] = [];

  try {
  // Return cached if exists and not forcing
  if (!force) {
    const exists = await todayBriefExists(date).catch(() => false);
    if (exists) {
      log.push(`✓ Cached brief for ${date} — loading from storage`);
      const brief = await loadJSON(date, "brief_final.json");
      const critique = await loadJSON(date, "critique.json");
      return NextResponse.json({ brief, critique, date, log, cached: true });
    }
  } else {
    log.push("Force regenerate...");
    await deleteBrief(date).catch(() => {});
  }

  // Step 1: Fetch
  log.push("Step 1: Fetching 7 news sources...");
  const { rawSources, date: fetchDate, srcLog } = await scrapeAllSources();
  srcLog.forEach(l => log.push(l));
  log.push(`✓ ${(rawSources.length / 1000).toFixed(0)}k chars`);
  saveText(date, "raw_sources.txt", rawSources).catch(() => {});

  const MAX_CHARS = 50000;
  const truncated = rawSources.length > MAX_CHARS ? rawSources.slice(0, MAX_CHARS) + "\n[truncated]" : rawSources;

  // Step 2: Generate
  log.push("Step 2: Generating brief...");
  const { data: brief_v1, usage: u1 } = await openai(apiKey, {
    model: "gpt-4o",
    messages: [
      { role: "system", content: GENERATE_SYSTEM },
      { role: "user", content: `Today is ${fetchDate}.\n\nGenerate at least 6 stories and 15 quick hits. Cover everything.\n\n${truncated}` }
    ],
    temperature: 0.2,
    max_tokens: 16384,
    response_format: { type: "json_schema", json_schema: { name: "daily_brief", strict: true, schema: BRIEF_SCHEMA } }
  }) as { data: { stories: unknown[]; quick_hits: unknown[] }; usage: { prompt_tokens: number; completion_tokens: number } };

  log.push(`✓ ${(brief_v1 as { stories: unknown[] }).stories.length} stories + ${(brief_v1 as { quick_hits: unknown[] }).quick_hits.length} quick hits`);
  log.push(`  Tokens: ${u1.prompt_tokens.toLocaleString()} + ${u1.completion_tokens.toLocaleString()}`);
  saveJSON(date, "brief_v1.json", brief_v1).catch(() => {});

  // Step 3: Critique
  log.push("Step 3: Critiquing quality...");
  const storySummary = (brief_v1 as { stories: { title: string; what: string; mechanism: { steps: { text: string }[] }[]; so_what: string[] }[] }).stories.map((s, i) => ({
    index: i, title: s.title, what: s.what,
    mechanism_steps: s.mechanism.flatMap(m => m.steps.map(step => step.text)),
    so_what: s.so_what
  }));

  const { data: critique, usage: u2 } = await openai(apiKey, {
    model: "gpt-4o",
    messages: [
      { role: "system", content: CRITIQUE_SYSTEM },
      { role: "user", content: `Review these stories:\n${JSON.stringify(storySummary, null, 2)}` }
    ],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" }
  }) as { data: { issues: { story_index: number; story_title: string; failures: string[]; missing_facts: string[]; rewrite_priority: string }[]; passed_count: number; failed_count: number }; usage: { prompt_tokens: number; completion_tokens: number } };

  log.push(`✓ ${critique.passed_count} passed, ${critique.failed_count} failed`);
  (critique.issues || []).forEach((i: { story_title: string; failures: string[] }) => log.push(`  ⚠ "${i.story_title}": ${i.failures[0]}`));
  saveJSON(date, "critique.json", critique).catch(() => {});

  // Step 4: Rewrite
  const highPri = (critique.issues || []).filter((i: { rewrite_priority: string }) => i.rewrite_priority === "high");
  let brief_final = { ...brief_v1 } as { stories: unknown[] };

  if (highPri.length > 0) {
    log.push(`Step 4: Rewriting ${highPri.length} story/stories...`);
    const results = await Promise.all(
      highPri.map(async (issue: { story_index: number; story_title: string; failures: string[]; missing_facts: string[] }) => {
        const story = (brief_v1 as { stories: unknown[] }).stories[issue.story_index];
        try {
          const { data: rewrite } = await openai(apiKey, {
            model: "gpt-4o",
            messages: [
              { role: "system", content: REWRITE_SYSTEM },
              { role: "user", content: `Rewrite this story.\n\nOriginal: ${JSON.stringify(story)}\n\nIssues: ${issue.failures.join("; ")}\n\nMissing facts: ${(issue.missing_facts||[]).join("; ")}\n\nSources (for reference):\n${truncated.slice(0, 25000)}` }
            ],
            temperature: 0.2,
            max_tokens: 4096,
            response_format: { type: "json_object" }
          }) as { data: { updated_what?: string; updated_mechanism?: unknown; updated_so_what?: string[] } };
          log.push(`  ✓ Rewrote "${issue.story_title}"`);
          return { index: issue.story_index, rewrite };
        } catch { return null; }
      })
    );

    const updatedStories = [...(brief_final.stories as { what: string; mechanism: unknown; so_what: string[] }[])];
    for (const r of results) {
      if (!r) continue;
      updatedStories[r.index] = {
        ...updatedStories[r.index],
        what:      r.rewrite.updated_what      ?? updatedStories[r.index].what,
        mechanism: r.rewrite.updated_mechanism  ?? updatedStories[r.index].mechanism,
        so_what:   r.rewrite.updated_so_what    ?? updatedStories[r.index].so_what,
      };
    }
    brief_final = { ...brief_final, stories: updatedStories };
  } else {
    log.push("Step 4: All stories passed.");
  }

  saveJSON(date, "brief_final.json", brief_final).catch(() => {});
  const cost = ((u1.prompt_tokens + u2.prompt_tokens) * 2.5 + (u1.completion_tokens + u2.completion_tokens) * 10) / 1_000_000;
  log.push(`✓ Done · $${cost.toFixed(4)}`);

  return NextResponse.json({ brief: brief_final, critique, date, log, cached: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.push(`✗ ${msg}`);
    return NextResponse.json({ error: msg, log }, { status: 500 });
  }
}
