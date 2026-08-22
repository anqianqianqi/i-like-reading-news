/**
 * /api/brief — Agentic pipeline with Blob persistence.
 *
 * GET  ?date=2026-08-22  → load existing brief from Blob (or 404)
 * POST { force?: bool }  → run full pipeline, save to Blob, return final brief
 * DELETE ?date=...        → delete stored brief (force regenerate)
 */

import { NextRequest, NextResponse } from "next/server";
import { todayKey, saveJSON, saveText, loadJSON, todayBriefExists, deleteBrief } from "@/lib/storage";

// ── Helpers ────────────────────────────────────────────────────────────────

async function fetchSources(): Promise<{ rawSources: string; date: string; log: string[] }> {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const res = await fetch(`${base}/api/fetch-news`);
  if (!res.ok) throw new Error(`fetch-news failed: ${res.status}`);
  return res.json();
}

async function generateBrief(rawSources: string, date: string, apiKey: string) {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const res = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ rawSources, date }),
  });
  if (!res.ok) throw new Error(`generate failed: ${res.status}`);
  return res.json();
}

async function critiqueBrief(brief: unknown, apiKey: string) {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const res = await fetch(`${base}/api/critique`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ brief }),
  });
  if (!res.ok) throw new Error(`critique failed: ${res.status}`);
  return res.json();
}

async function rewriteStory(story: unknown, issue: unknown, rawSources: string, apiKey: string) {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const res = await fetch(`${base}/api/rewrite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ story, issue, rawSources }),
  });
  if (!res.ok) return null;
  return res.json();
}

// ── GET: load existing brief ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || todayKey();
  const brief = await loadJSON(date, "brief_final.json");
  if (!brief) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }
  const critique = await loadJSON(date, "critique.json");
  return NextResponse.json({ exists: true, brief, critique, date });
}

// ── DELETE: force regenerate ───────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || todayKey();
  await deleteBrief(date);
  return NextResponse.json({ deleted: true, date });
}

// ── POST: run full agentic pipeline ───────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });

  const { force } = await req.json().catch(() => ({ force: false }));
  const date = todayKey();
  const log: string[] = [];

  // Check if brief already exists (skip if not forced)
  if (!force) {
    const exists = await todayBriefExists(date);
    if (exists) {
      log.push(`✓ Brief for ${date} already exists in storage — loading cached version`);
      const brief = await loadJSON(date, "brief_final.json");
      const critique = await loadJSON(date, "critique.json");
      return NextResponse.json({ brief, critique, date, log, cached: true });
    }
  } else {
    log.push("Force regenerate — deleting cached brief...");
    await deleteBrief(date);
  }

  // Step 1: Fetch sources
  log.push("Step 1: Fetching 7 news sources...");
  const { rawSources, date: fetchedDate, log: srcLog } = await fetchSources();
  srcLog.forEach((l: string) => log.push(`  ${l}`));
  log.push(`✓ ${(rawSources.length / 1000).toFixed(0)}k chars fetched`);
  await saveText(date, "raw_sources.txt", rawSources);

  // Step 2: Generate
  log.push("Step 2: Generating brief via OpenAI...");
  const { data: brief_v1, usage: u1 } = await generateBrief(rawSources, fetchedDate, apiKey);
  log.push(`✓ Generated ${brief_v1.stories.length} stories + ${brief_v1.quick_hits.length} quick hits`);
  log.push(`  Tokens: ${u1.prompt_tokens.toLocaleString()} + ${u1.completion_tokens.toLocaleString()}`);
  await saveJSON(date, "brief_v1.json", brief_v1);

  // Step 3: Critique
  log.push("Step 3: Running quality critique...");
  const { critique, usage: u2 } = await critiqueBrief(brief_v1, apiKey);
  log.push(`✓ Critique: ${critique.passed_count} passed, ${critique.failed_count} failed`);
  await saveJSON(date, "critique.json", critique);

  // Step 4: Rewrite high-priority failures (parallel)
  const highPriority = (critique.issues || []).filter(
    (i: { rewrite_priority: string }) => i.rewrite_priority === "high"
  );

  let brief_final = { ...brief_v1 };

  if (highPriority.length > 0) {
    log.push(`Step 4: Rewriting ${highPriority.length} story/stories in parallel...`);
    const rewriteResults = await Promise.all(
      highPriority.map(async (issue: { story_index: number; story_title: string; failures: string[]; missing_facts: string[] }) => {
        const story = brief_v1.stories[issue.story_index];
        const result = await rewriteStory(story, issue, rawSources, apiKey);
        if (!result) return null;
        log.push(`  ✓ Rewrote "${issue.story_title}"`);
        return { index: issue.story_index, rewrite: result.rewrite };
      })
    );

    const updatedStories = [...brief_final.stories];
    for (const result of rewriteResults) {
      if (!result) continue;
      const { index, rewrite } = result;
      updatedStories[index] = {
        ...updatedStories[index],
        what:      rewrite.updated_what      ?? updatedStories[index].what,
        mechanism: rewrite.updated_mechanism  ?? updatedStories[index].mechanism,
        so_what:   rewrite.updated_so_what    ?? updatedStories[index].so_what,
      };
    }
    brief_final = { ...brief_final, stories: updatedStories };
  } else {
    log.push("Step 4: All stories passed — no rewrites needed.");
  }

  // Save final brief
  await saveJSON(date, "brief_final.json", brief_final);
  log.push("✓ Saved to Blob storage.");

  // Total cost
  const totalTokens = u1.prompt_tokens + u1.completion_tokens + u2.prompt_tokens + u2.completion_tokens;
  const cost = ((u1.prompt_tokens + u2.prompt_tokens) * 2.5 + (u1.completion_tokens + u2.completion_tokens) * 10) / 1_000_000;
  log.push(`Total: ~${totalTokens.toLocaleString()} tokens · $${cost.toFixed(4)}`);

  return NextResponse.json({ brief: brief_final, critique, date, log, cached: false });
}
