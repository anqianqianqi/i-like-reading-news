import { NextResponse } from "next/server";

const REWRITE_PROMPT = `You are rewriting specific stories in a news brief to improve their depth and quality.
You will receive: the original story, a list of specific failures, and the raw source content.
Your job is to rewrite ONLY the flagged fields to fix the issues.

## REWRITE STANDARDS

### what field
- Include specific numbers, dollar amounts, names, and timelines
- 2-4 sentences. Dense. Every sentence carries new information.
- Example of good: "US-Canada trade talks collapsed at midnight. 50% tariffs on $20B in Canadian
  goods (steel, aluminum, autos, lumber) activated at 12:01am. PM Carney confirmed dollar-for-dollar
  retaliation. A draft deal was close but negotiators couldn't bridge the final gap."

### mechanism steps
- Each step explains WHY it causes the next — not just what happened
- Label types: cause / mechanism / result-short / result-long
- 4-6 steps. Each step a complete phrase.
- Example of good mechanism:
  [cause] "50% tariff activates on Canadian steel, aluminum, autos, lumber"
  [mechanism] "tariff = tax on US importers not Canada — US companies pay the 50%, not Canadians"
  [mechanism] "Canadian input costs rise 50% for US manufacturers using Canadian materials"
  [result-short] "manufacturers immediately absorb margin hit or start raising prices"
  [result-long] "consumer inflation gets a new input channel — Fed watching inflation = can't cut rates"

### so_what
- 2-3 bullets, each max 20 words
- Must include: specific sector or ticker, direction (bullish/bearish), and why
- NEVER write: "monitor developments", "watch for changes", "could affect"
- ALWAYS write: "Bearish $X because Y", "Watch $Z — if X happens then Y"
- Example: "Tariff = tax on US importers, not Canada — US auto assemblers and homebuilders take the margin hit."

Return a JSON object:
{
  "story_index": 0,
  "updated_what": "...",
  "updated_mechanism": [
    { "label": "", "steps": [{ "text": "...", "type": "cause|mechanism|result-short|result-long" }] }
  ],
  "updated_so_what": ["bullet 1", "bullet 2", "bullet 3 optional"]
}`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });

  const { story, issue, rawSources } = await req.json();
  if (!story || !issue) return NextResponse.json({ error: "story and issue required" }, { status: 400 });

  // Truncate raw sources for context — don't need the full 50k, just enough for the story
  const MAX_SOURCE_CHARS = 30_000;
  const truncatedSources = rawSources?.length > MAX_SOURCE_CHARS
    ? rawSources.slice(0, MAX_SOURCE_CHARS) + "\n[... truncated ...]"
    : rawSources;

  const userMessage = `Rewrite this story to fix the identified quality issues.

ORIGINAL STORY:
Title: ${story.title}
What: ${story.what}
Mechanism steps: ${JSON.stringify(story.mechanism.flatMap((m: { steps: { text: string; type: string }[] }) => m.steps))}
So what: ${JSON.stringify(story.so_what)}

ISSUES TO FIX:
${issue.failures.join("\n")}

MISSING FACTS TO INCLUDE:
${(issue.missing_facts || []).join("\n")}

RAW SOURCE CONTENT (for reference):
${truncatedSources}

Return the improved story fields as JSON.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: REWRITE_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: `OpenAI error: ${err}` }, { status: response.status });
  }

  const result = await response.json();
  const rewrite = JSON.parse(result.choices[0].message.content);
  const usage = result.usage;

  return NextResponse.json({ rewrite, usage });
}
