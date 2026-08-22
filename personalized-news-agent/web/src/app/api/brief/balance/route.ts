/**
 * /api/brief/balance — run only the balancer step.
 *
 * GET: check if brief_final.json exists for today
 * POST: load brief_final.json from Blob, run gpt-4o-mini balancer, save + return brief_balanced.json
 *       If brief_final.json doesn't exist, returns 404 (client should run full pipeline first)
 */

import { NextResponse } from "next/server";
import { todayKey, loadJSON, saveJSON } from "@/lib/storage";
import { BALANCE_SYSTEM } from "@/lib/prompts";

export async function GET() {
  const date = todayKey();
  const brief = await loadJSON(date, "brief_final.json").catch(() => null);
  return NextResponse.json({ exists: !!brief, date });
}

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });

  const date = todayKey();
  const log: string[] = [];

  // Load raw brief from Blob
  const brief_final = await loadJSON(date, "brief_final.json").catch(() => null);
  if (!brief_final) {
    return NextResponse.json({
      error: "No raw brief found for today. Run the full pipeline first.",
      needs_pipeline: true
    }, { status: 404 });
  }

  log.push(`✓ Loaded raw brief for ${date} from storage`);
  log.push("Running balancer (gpt-4o-mini)...");

  // Run balancer
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: BALANCE_SYSTEM },
      { role: "user", content: `Balance this brief:\n${JSON.stringify(brief_final)}` }
    ],
    max_tokens: 16384,
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
  if (!content) {
    return NextResponse.json({ error: "Empty balancer response" }, { status: 500 });
  }

  let brief_balanced: unknown;
  try {
    brief_balanced = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "Balancer output not valid JSON" }, { status: 500 });
  }

  // Validate structure
  if (!(brief_balanced as { stories?: unknown }).stories) {
    brief_balanced = brief_final; // fallback to raw
    log.push("⚠ Balancer output invalid — using raw brief as balanced.");
  } else {
    log.push("✓ Balanced.");
  }

  // Save
  await saveJSON(date, "brief_balanced.json", brief_balanced).catch(() => {});

  const usage = result.usage || {};
  const cost = ((usage.prompt_tokens || 0) * 0.15 + (usage.completion_tokens || 0) * 0.60) / 1_000_000;
  log.push(`  Tokens: ${(usage.total_tokens || 0).toLocaleString()} · $${cost.toFixed(4)}`);

  return NextResponse.json({ brief_balanced, date, log });
}
