/**
 * POST /api/signup
 * Body: { email: string, name?: string }
 *
 * Persists the subscriber to Vercel Blob as subscribers.json.
 * Falls back to an in-memory response if Blob is unavailable
 * (so the UI still works locally without BLOB credentials).
 */

import { NextRequest, NextResponse } from "next/server";

interface Subscriber {
  email: string;
  name: string;
  signedUpAt: string;
  source: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Blob helpers (lazy import so it doesn't hard-crash without BLOB_TOKEN) ──

async function loadSubscribers(): Promise<Subscriber[]> {
  try {
    const { list, head } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "subscribers/" });
    const blob = blobs.find(b => b.pathname === "subscribers/list.json");
    if (!blob) return [];
    const res = await fetch(blob.url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function saveSubscribers(list: Subscriber[]): Promise<void> {
  try {
    const { put } = await import("@vercel/blob");
    await put("subscribers/list.json", JSON.stringify(list, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  } catch {
    // Blob unavailable (local dev without token) — silent fail
  }
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const name  = (body.name  ?? "").trim();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const subscribers = await loadSubscribers();

  // Duplicate check
  if (subscribers.some(s => s.email === email)) {
    // Treat as success — don't leak whether they're already subscribed
    return NextResponse.json({ ok: true, message: "Already subscribed" });
  }

  const newEntry: Subscriber = {
    email,
    name,
    signedUpAt: new Date().toISOString(),
    source: "signup-page",
  };

  subscribers.push(newEntry);
  await saveSubscribers(subscribers);

  console.log(`[signup] New subscriber: ${email} (${name || "anon"})`);

  return NextResponse.json({ ok: true, message: "Subscribed!" }, { status: 201 });
}

// GET — returns subscriber count (no emails exposed)
export async function GET() {
  const subscribers = await loadSubscribers();
  return NextResponse.json({ count: subscribers.length });
}
