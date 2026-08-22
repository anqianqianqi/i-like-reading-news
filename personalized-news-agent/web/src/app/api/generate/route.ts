import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are extracting and analyzing today's news for a personalized news digest.

Your job is INTELLIGENCE ONLY — understanding, deduplication, causal analysis.
You return structured JSON only. No HTML.

## YOUR READER: The Engineer
Thinks in systems and flowcharts. Wants mechanisms, not just outcomes.
Has finance/investing knowledge. Wants market implications on everything.

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
Exactly 2-3 bullet strings. Each max 15 words. Lead with the punchline.
First: core insight. Second: investment implication. Third (optional): what to watch.

### Price moves
Only populate price_moves if the story directly mentions a stock move or has
an unambiguous direct ticker impact. Leave empty [] otherwise.

### Quick hits
Cover EVERYTHING not in main stories. Format: topic, detail, highlight, source.`;

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
          glossary_terms: { type: "array", items: { type: "string" } },
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

  const userMessage = `Today is ${date}.\n\nExtract and analyze the following raw news content:\n\n${truncated}`;

  const payload = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: userMessage }
    ],
    temperature: 0.2,
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
