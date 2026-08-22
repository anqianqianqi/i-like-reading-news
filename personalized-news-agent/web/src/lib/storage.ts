/**
 * storage.ts — Vercel Blob persistence using @vercel/blob SDK.
 *
 * The SDK reads BLOB_READ_WRITE_TOKEN automatically from the environment
 * when the Blob store is connected to the Vercel project.
 * All operations are no-ops if the token is missing (graceful degradation).
 */

import { put, head, del, list } from "@vercel/blob";

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2026-08-22"
}

function blobPath(date: string, filename: string): string {
  return `briefs/${date}/${filename}`;
}

function hasToken(): boolean {
  return !!(
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN
  );
}

/** Save a JSON object to Blob. Overwrites if exists. */
export async function saveJSON(date: string, filename: string, data: unknown): Promise<void> {
  if (!hasToken()) return;
  const path = blobPath(date, filename);
  await put(path, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

/** Save raw text to Blob. */
export async function saveText(date: string, filename: string, text: string): Promise<void> {
  if (!hasToken()) return;
  const path = blobPath(date, filename);
  await put(path, text, {
    access: "public",
    contentType: "text/plain",
    addRandomSuffix: false,
  });
}

/** Load a JSON object from Blob. Returns null if not found. */
export async function loadJSON<T>(date: string, filename: string): Promise<T | null> {
  if (!hasToken()) return null;
  try {
    const path = blobPath(date, filename);
    const info = await head(path);
    if (!info) return null;
    const res = await fetch(info.url);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

/** Check if today's final brief exists. */
export async function todayBriefExists(date: string): Promise<boolean> {
  if (!hasToken()) return false;
  try {
    const path = blobPath(date, "brief_final.json");
    const info = await head(path);
    return !!info;
  } catch {
    return false;
  }
}

/** Delete all stored files for a date. */
export async function deleteBrief(date: string): Promise<void> {
  if (!hasToken()) return;
  try {
    const { blobs } = await list({ prefix: `briefs/${date}/` });
    for (const blob of blobs) {
      await del(blob.url).catch(() => {});
    }
  } catch {
    // ignore
  }
}
