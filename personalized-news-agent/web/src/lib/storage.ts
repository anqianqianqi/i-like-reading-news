/**
 * storage.ts — Vercel Blob persistence for daily briefs.
 *
 * Files stored in Blob:
 *   briefs/{date}/brief_final.json   — final brief after critique+rewrite
 *   briefs/{date}/brief_v1.json      — first generation (for comparison)
 *   briefs/{date}/critique.json      — critique notes
 *   briefs/{date}/raw_sources.txt    — raw fetched content
 */

import { put, head, del } from "@vercel/blob";

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2026-08-22"
}

function blobPath(date: string, filename: string): string {
  return `briefs/${date}/${filename}`;
}

/** Save a JSON object to Blob. Overwrites if exists. */
export async function saveJSON(date: string, filename: string, data: unknown): Promise<void> {
  const path = blobPath(date, filename);
  await put(path, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,   // deterministic path so we can overwrite
  });
}

/** Save raw text to Blob. */
export async function saveText(date: string, filename: string, text: string): Promise<void> {
  const path = blobPath(date, filename);
  await put(path, text, {
    access: "public",
    contentType: "text/plain",
    addRandomSuffix: false,
  });
}

/** Load a JSON object from Blob. Returns null if not found. */
export async function loadJSON<T>(date: string, filename: string): Promise<T | null> {
  const path = blobPath(date, filename);
  try {
    // head() checks existence without downloading
    const info = await head(path);
    if (!info) return null;
    const res = await fetch(info.url);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

/** Check if today's final brief exists in Blob. */
export async function todayBriefExists(date: string): Promise<boolean> {
  const path = blobPath(date, "brief_final.json");
  try {
    const info = await head(path);
    return !!info;
  } catch {
    return false;
  }
}

/** Delete all stored files for a date (force regenerate). */
export async function deleteBrief(date: string): Promise<void> {
  const files = ["brief_final.json", "brief_v1.json", "critique.json", "raw_sources.txt"];
  for (const f of files) {
    try {
      await del(blobPath(date, f));
    } catch {
      // ignore if not found
    }
  }
}
