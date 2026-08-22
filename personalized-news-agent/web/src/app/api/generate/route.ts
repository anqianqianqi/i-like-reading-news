import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are extracting and analyzing today's news for a personalized news digest.

Your job is INTELLIGENCE ONLY — understanding, deduplication, causal analysis.
You return structured JSON only. No HTML.

## YOUR READER: The Engineer
Thinks in systems and flowcharts. Wants mechanisms, not just outcomes.
Has finance/investing knowledge. Wants market implications on everything.

## QUALITY BAR — read this carefully

The stories must be DEEP, not shallow. Compare:

BAD (too shallow — do NOT do this):
  what: "US imposes 50% tariffs on Canadian goods after failed trade talks."
  mechanism steps: ["Companies fail to agree", "US imposes tariffs", "Canada retaliates"]
  so_what: ["Trade tensions could disrupt supply chains.", "Monitor retaliatory measures."]

GOOD (the depth we require):
  what: "US-Canada trade talks collapsed at the midnight deadline. 50% tariffs on $20B in
  Canadian goods (steel, aluminum, autos, lumber) activated at 12:01am. Canada's PM Carney
  confirmed dollar-for-dollar retaliation. A draft deal had been close — US lowers steel/
  aluminum tariffs, Canada drops retaliatory measures — but negotiators couldn't close it."

  mechanism steps:
  - cause: "US-Canada talks collapse at midnight deadline"
  - mechanism: "50% tariff activates on Canadian steel, aluminum, autos, lumber"
  - mechanism: "tariff = tax on US importers not Canada — US companies pay the 50%, not Canadians"
  - mechanism: "Canadian input costs rise 50% for US manufacturers using Canadian materials"
  - result-long: "manufacturers absorb margin hit OR raise prices — consumer inflation gets new input"

  so_what:
  - "Tariffs are a domestic tax — US importers pay, not Canada. The affected sectors are US auto
    assemblers and homebuilders using Canadian lumber."
  - "Bearish: US manufacturers with Canadian supply chains face margin squeeze. If Canada retaliates
    on US ag exports, watch corn and soybean futures."
  - "Watch Wednesday midnight: if no deal, 50% tariffs are live and the inflation input channel opens."

The key difference: EXPLAIN THE MECHANISM. Don't just describe what happened.
Every arrow in the chain must explain WHY that step causes the next.
The what field must include specific numbers, names, and dollar amounts from the sources.
The so_what must have a specific investment/market direction, not generic "watch for developments."

## EXTRACTION RULES

### Deduplication
If multiple sources cover the same story, merge into ONE. List all source IDs.

### One story = one theme
Group parallel threads that prove the same thesis into one story with one chain.
Use "Event A + Event B → shared implication" format.

### Mechanism chains
Each chain must have 3 layers: CAUSE → INTERMEDIATE MECHANISM → RESULT.
The intermediate steps explain WHY the cause leads to the result.
4-6 steps. No bracket labels like [CAUSE]. No parenthetical explanations in the chain.

### No buzzwords without definition
If a term appears (yield, DCF, ASIC, hyperscaler, capex, rate hike, basis points,
short squeeze, put/call, bond vigilante, RAG, inference, leverage), define it in
the so_what field on first use.

### So what field
Exactly 2-3 bullet strings. Each max 20 words. Lead with the punchline.
First: core insight or system pattern. Second: specific investment implication with direction.
Third (optional): one specific thing to watch or act on.
NEVER write generic advice like "monitor developments" or "watch for changes."
Always be specific: which sector, which ticker, which direction, which catalyst.

### Story selection — what deserves a full story slot vs quick hit

FULL STORY SLOT (6-8 of these):
- Geopolitical events with economic consequences (tariffs, wars, sanctions)
- Major market moves with a clear mechanism (yields spiking, sector rotations)
- Earnings results or guidance from major companies
- Policy decisions with direct market/investment impact
- Technology milestones that change competitive dynamics (IPO filings, product launches with real market consequence)

QUICK HIT ONLY (do NOT give a full story slot to):
- Minor legal procedural news ("court allows X to continue" — no economic consequence yet)
- Product feature announcements with no direct market impact (a new app feature, a podcast episode)
- Social/cultural stories (celebrity deaths, sports, viral trends)
- Stories where the "so what" is genuinely just "interesting but doesn't affect markets or your money"

EXAMPLES:
- "SCOTUS allows White House ballroom construction to continue" → QUICK HIT (procedural, no market impact)
- "Anthropic Project Parka Mac feature" → QUICK HIT (product feature, no market consequence)
- "Anthropic IPO filing lists AI backlash as SEC risk factor" → FULL STORY (first formal SEC disclosure, valuation precedent)
- "Ray Dalio: Bessent bond move signals debt crisis" → FULL STORY (major macro signal from credible investor)
- "Tesla recalls 3M vehicles in China" → QUICK HIT unless paired with meaningful market consequence

### Glossary terms — always populate
For every story, tag ALL finance and tech terms that appear. These power the clickable
glossary at the bottom of the page. The renderer matches these against a built-in dictionary.
Terms to always tag when they appear: bond yield, DCF, tariff, rate hike, basis points,
short squeeze, ASIC, hyperscaler, capex, inference, leverage, duration risk, bond vigilante,
ETF, options, put, call, spread, quantitative tightening, PCE, CPI, FOMC.
A finance story with zero glossary terms is wrong — expect 2-4 per story.
ONLY add tickers that are explicitly named in the source content.
NEVER add a ticker because it "might be affected" by the story.
If the source names Tesla ($TSLA), you can include $TSLA.
If the source does NOT name NIO, do NOT add $NIO even if you think it benefits.
Hallucinated tickers destroy credibility.

### Quick hits
Cover EVERYTHING not in main stories. Format: topic, detail, highlight, source.
MINIMUM 15 quick hits. Include every notable item from every source.
Do not stop early. Keep going until all source content is covered.

### Coverage requirements — CRITICAL
- MINIMUM 6 main stories. MAXIMUM 8.
- MINIMUM 15 quick hits. Target 20-25.
- Every piece of content from every source must appear somewhere — either as a
  main story or a quick hit. Nothing gets dropped.
- If you finish the stories and still have content left, put it in quick hits.
- Do not truncate. Do not summarize away entire topics.
- The raw sources contain ~50k chars of content. Your output must reflect that volume.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    date: { type: "string" },
    markets: {
      type: "object",
      properties: {
        summary_title: { type: "string" },
        key_mechanism: { type: "string" },
        week_ahead: { type: "string" },
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
            required: ["label", "value", "change", "direction"],
            additionalProperties: false
          }
        }
      },
      required: ["summary_title", "key_mechanism", "week_ahead", "tickers"],
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
                      type: { type: "string", enum: ["cause", "mechanism", "result-short", "result-long"] }
                    },
                    required: ["text", "type"],
                    additionalProperties: false
                  }
                }
              },
              required: ["label", "steps"],
              additionalProperties: false
            }
          },
          so_what: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
          price_moves: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ticker:    { type: "string" },
                company:   { type: "string" },
                direction: { type: "string", enum: ["up", "dn", "watch"] },
                magnitude: { type: "string" },
                reason:    { type: "string" }
              },
              required: ["ticker", "company", "direction", "magnitude", "reason"],
              additionalProperties: false
            }
          },
          glossary_terms: {
            "type": "array",
            "description": "REQUIRED — do not leave empty. List every finance or tech term used in this story that a non-expert might not know. These become clickable hyperlinks to a glossary. Examples of terms to include: 'bond yield', 'DCF', 'tariff', 'rate hike', 'basis points', 'short squeeze', 'ASIC', 'hyperscaler', 'capex', 'inference', 'leverage', 'duration risk', 'bond vigilante'. If ANY of these appear in the story, include them. For a finance story, expect 2-4 terms. For a tech story, expect 1-3 terms.",
            "items": { "type": "string" }
          },
          highlights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                type: { type: "string", enum: ["number", "company", "risk", "positive"] }
              },
              required: ["text", "type"],
              additionalProperties: false
            }
          }
        },
        required: ["title", "sources", "what", "mechanism", "so_what", "price_moves", "glossary_terms", "highlights"],
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
        required: ["topic", "detail", "highlight", "source"],
        additionalProperties: false
      }
    }
  },
  required: ["date", "markets", "stories", "quick_hits"],
  additionalProperties: false
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const { rawSources, date } = await req.json();
  if (!rawSources) {
    return NextResponse.json({ error: "rawSources required" }, { status: 400 });
  }

  const MAX_CHARS = 50_000;
  const truncated = rawSources.length > MAX_CHARS
    ? rawSources.slice(0, MAX_CHARS) + "\n\n[... truncated ...]"
    : rawSources;

  const userMessage = `Today is ${date}.

Extract and analyze ALL of the following raw news content.
IMPORTANT: You must produce at least 6 main stories and at least 15 quick hits.
Every notable item from every source must appear somewhere in your output.
Do not stop early. Cover everything.

RAW NEWS CONTENT:
${truncated}`;

  const payload = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: userMessage }
    ],
    temperature: 0.2,
    max_tokens: 16384,  // gpt-4o max output — let the model decide when it's done
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "daily_brief",
        strict: true,
        schema: RESPONSE_SCHEMA
      }
    }
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: `OpenAI error: ${err}` }, { status: response.status });
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  const data = JSON.parse(content);
  const usage = result.usage;

  return NextResponse.json({ data, usage });
}
