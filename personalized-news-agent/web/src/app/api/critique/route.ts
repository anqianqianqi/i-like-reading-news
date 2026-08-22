import { NextResponse } from "next/server";

const CRITIQUE_PROMPT = `You are a quality reviewer for a personalized news digest targeted at an engineer reader.
Your job is to review a generated news brief and flag stories that fall below quality standards.

## QUALITY STANDARDS

A story PASSES if ALL of these are true:
- "what" field contains specific numbers, names, dollar amounts from the sources
- mechanism chain explains WHY each step causes the next (not just what happened)
- so_what bullets give a specific investment direction (sector, ticker, direction) — not generic advice
- The story would teach something to someone who already knows the basics

A story FAILS if ANY of these are true:
- "what" is vague ("after failed talks" with no specifics)
- mechanism steps just restate events without explaining causality
  BAD: "Companies fail to agree → US imposes tariffs → Canada retaliates"
  GOOD: "Talks collapse → 50% tariff activates on $20B Canadian goods → tariff = tax on US importers not Canada → manufacturers absorb or raise prices → inflation input channel opens"
- so_what says "monitor developments" or "watch for changes" or "could affect" without specifics
- Missing key facts that were clearly in the source (dollar amounts, specific companies, timelines)

## OUTPUT FORMAT
Return a JSON object with exactly this shape:
{
  "issues": [
    {
      "story_index": 0,
      "story_title": "the title",
      "failures": ["what is missing or wrong — be specific"],
      "missing_facts": ["specific facts from sources that should be included"],
      "rewrite_priority": "high" | "medium"
    }
  ],
  "passed_count": 3,
  "failed_count": 2
}

Only flag stories that genuinely fail. If a story is good, don't flag it.
Focus on stories where adding depth would meaningfully improve the reader's understanding.`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });

  const { brief } = await req.json();
  if (!brief) return NextResponse.json({ error: "brief required" }, { status: 400 });

  // Send just the stories for review (not the full raw sources — cheaper)
  const storySummary = brief.stories.map((s: {
    title: string;
    what: string;
    mechanism: { label: string; steps: { text: string; type: string }[] }[];
    so_what: string[];
  }, i: number) => ({
    index: i,
    title: s.title,
    what: s.what,
    mechanism_steps: s.mechanism.flatMap((m: { steps: { text: string }[] }) => m.steps.map((step: { text: string }) => step.text)),
    so_what: s.so_what
  }));

  const userMessage = `Review these ${storySummary.length} stories from today's news brief and flag any that fail the quality standards.

Stories:
${JSON.stringify(storySummary, null, 2)}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: CRITIQUE_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: `OpenAI error: ${err}` }, { status: response.status });
  }

  const result = await response.json();
  const critique = JSON.parse(result.choices[0].message.content);
  const usage = result.usage;

  return NextResponse.json({ critique, usage });
}
