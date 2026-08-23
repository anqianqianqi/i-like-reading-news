/**
 * /api/brief/reformat-fixture
 * Same as /api/brief/reformat but accepts the brief JSON directly in the body
 * instead of loading from Blob. Used for the fixture/preview flow.
 *
 * POST { readerType: string, brief: object }
 * → returns { brief: reformatted, readerType, cost }
 */

import { NextResponse } from "next/server";
import { STORYTELLER_REFORMAT_SYSTEM } from "@/lib/prompts";

const READER_PROMPTS: Record<string, string> = {
  storyteller: STORYTELLER_REFORMAT_SYSTEM,
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });

  const body = await req.json().catch(() => ({})) as { readerType?: string; brief?: unknown };
  const { readerType, brief } = body;

  if (!readerType || !READER_PROMPTS[readerType]) {
    return NextResponse.json({ error: `Unknown reader type: ${readerType}` }, { status: 400 });
  }
  if (!brief) {
    return NextResponse.json({ error: "brief required" }, { status: 400 });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: READER_PROMPTS[readerType] },
        { role: "user", content: `Reformat this brief for the ${readerType} reader:\n${JSON.stringify(brief)}` }
      ],
      max_tokens: 16384,
      temperature: 0.4,
      response_format: { type: "json_object" }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `OpenAI: ${err.slice(0, 200)}` }, { status: 500 });
  }

  const result = await res.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) return NextResponse.json({ error: "Empty response" }, { status: 500 });

  let reformatted: unknown;
  try { reformatted = JSON.parse(content); } catch {
    return NextResponse.json({ error: "Response not valid JSON" }, { status: 500 });
  }

  if (!(reformatted as { stories?: unknown }).stories) {
    return NextResponse.json({ error: "Invalid structure" }, { status: 500 });
  }

  const usage = result.usage || {};
  const cost = ((usage.prompt_tokens || 0) * 2.5 + (usage.completion_tokens || 0) * 10) / 1_000_000;

  return NextResponse.json({ brief: reformatted, readerType, cost: cost.toFixed(4) });
}
