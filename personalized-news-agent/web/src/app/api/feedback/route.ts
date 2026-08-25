/**
 * POST /api/feedback
 * Body: { email?: string, message?: string, topics?: string[] }
 *
 * Appends to feedback/entries.json in Vercel Blob.
 * All fields are optional — valid as long as at least message or topics is present.
 */

import { NextRequest, NextResponse } from "next/server";

interface FeedbackEntry {
  id: string;
  email: string | null;
  message: string | null;
  topics: string[];
  submittedAt: string;
}

// ── Blob helpers ───────────────────────────────────────────────────────────

async function loadFeedback(): Promise<FeedbackEntry[]> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "feedback/" });
    const blob = blobs.find(b => b.pathname === "feedback/entries.json");
    if (!blob) return [];
    const res = await fetch(blob.url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function saveFeedback(entries: FeedbackEntry[]): Promise<void> {
  try {
    const { put } = await import("@vercel/blob");
    await put("feedback/entries.json", JSON.stringify(entries, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  } catch {
    // Blob unavailable — silent fail
  }
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { email?: string | null; message?: string | null; topics?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email   = body.email   ? body.email.trim().toLowerCase()   : null;
  const message = body.message ? body.message.trim()               : null;
  const topics  = Array.isArray(body.topics) ? body.topics.slice(0, 20) : [];

  if (!message && topics.length === 0) {
    return NextResponse.json(
      { error: "Please provide a message or select at least one topic" },
      { status: 400 }
    );
  }

  // Guard message length
  if (message && message.length > 2000) {
    return NextResponse.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });
  }

  const entries = await loadFeedback();

  const newEntry: FeedbackEntry = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email,
    message,
    topics,
    submittedAt: new Date().toISOString(),
  };

  entries.push(newEntry);
  await saveFeedback(entries);

  console.log(`[feedback] New entry: ${newEntry.id} | topics: [${topics.join(", ")}] | email: ${email ?? "anon"}`);

  return NextResponse.json({ ok: true, id: newEntry.id }, { status: 201 });
}

// GET — returns all feedback entries (admin use only — add auth if public)
export async function GET() {
  const entries = await loadFeedback();
  return NextResponse.json({ count: entries.length, entries });
}
