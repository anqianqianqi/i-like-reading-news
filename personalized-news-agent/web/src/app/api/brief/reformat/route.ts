/**
 * /api/brief/reformat — rewrite brief_final.json for a different reader type.
 *
 * POST { readerType: "storyteller" | "visualizer" | "actor" }
 * → loads brief_final.json from Blob
 * → rewrites text fields for the target reader type (gpt-4.1-mini, cheap)
 * → saves brief_{readerType}.json to Blob
 * → returns { brief, readerType }
 */

import { NextResponse } from "next/server";
import { todayKey, loadJSON, saveJSON } from "@/lib/storage";
import { STORYTELLER_REFORMAT_SYSTEM } from "@/lib/prompts";

const READER_PROMPTS: Record<string, string> = {
  storyteller: STORYTELLER_REFORMAT_SYSTEM,
  // visualizer: VISUALIZER_REFORMAT_SYSTEM,  // coming soon
  // actor: ACTOR_REFORMAT_SYSTEM,             // coming soon
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });

  const { readerType } = await req.json().catch(() => ({})) as { readerType?: string };
  if (!readerType || !READER_PROMPTS[readerType]) {
    return NextResponse.json({
      error: `Unknown reader type. Supported: ${Object.keys(READER_PROMPTS).join(", ")}`
    }, { status: 400 });
  }

  const date = todayKey();

  // Load the raw brief from Blob
  const brief_final = await loadJSON(date, "brief_final.json").catch(() => null);
  if (!brief_final) {
    return NextResponse.json({
      error: "No raw brief found for today. Run the full pipeline first.",
      needs_pipeline: true
    }, { status: 404 });
  }

  const systemPrompt = READER_PROMPTS[readerType];

  // Call OpenAI to reformat
  const payload = {
    model: "gpt-4.1",   // fast + cheap for reformat
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Reformat this brief for the ${readerType} reader type:\n${JSON.stringify(brief_final)}` }
    ],
    max_tokens: 16384,
    temperature: 0.4,   // slightly higher for narrative variety
    response_format: { type: "json_object" }
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `OpenAI error: ${err.slice(0, 200)}` }, { status: 500 });
  }

  const result = await res.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) return NextResponse.json({ error: "Empty response" }, { status: 500 });

  let reformatted: unknown;
  try {
    reformatted = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "Response not valid JSON" }, { status: 500 });
  }

  // Validate structure
  if (!(reformatted as { stories?: unknown }).stories) {
    return NextResponse.json({ error: "Invalid structure in response" }, { status: 500 });
  }

  // Save to Blob
  await saveJSON(date, `brief_${readerType}.json`, reformatted).catch(() => {});

  const usage = result.usage || {};
  const cost = ((usage.prompt_tokens || 0) * 2.5 + (usage.completion_tokens || 0) * 10) / 1_000_000;

  return NextResponse.json({
    brief: reformatted,
    readerType,
    date,
    tokens: usage.total_tokens,
    cost: cost.toFixed(4)
  });
}

// GET: check which reader type versions exist for today
export async function GET() {
  const date = todayKey();
  const types = ["storyteller", "visualizer", "actor"];
  const availability: Record<string, boolean> = {};

  for (const t of types) {
    const exists = await loadJSON(date, `brief_${t}.json`).then(d => !!d).catch(() => false);
    availability[t] = exists;
  }

  return NextResponse.json({ date, availability });
}
