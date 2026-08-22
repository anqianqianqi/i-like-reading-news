/**
 * storage.ts — Vercel Blob (private store, OIDC auth).
 *
 * Uses OIDC automatically when running on Vercel (BLOB_STORE_ID present).
 * All blobs stored as private (access: 'private').
 * Falls back gracefully if BLOB_STORE_ID is missing.
 */

import { put, get, del, list } from "@vercel/blob";

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2026-08-22"
}

function blobPath(date: string, filename: string): string {
  return `briefs/${date}/${filename}`;
}

export function hasBlob(): boolean {
  // OIDC auth: BLOB_STORE_ID is enough when running on Vercel
  // Token auth: BLOB_READ_WRITE_TOKEN as fallback
  return !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

/** Save a JSON object to private Blob. Overwrites if exists. */
export async function saveJSON(date: string, filename: string, data: unknown): Promise<void> {
  if (!hasBlob()) return;
  const path = blobPath(date, filename);
  await put(path, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

/** Save raw text to private Blob. */
export async function saveText(date: string, filename: string, text: string): Promise<void> {
  if (!hasBlob()) return;
  const path = blobPath(date, filename);
  await put(path, text, {
    access: "private",
    contentType: "text/plain",
    addRandomSuffix: false,
  });
}

/** Load a JSON object from private Blob. Returns null if not found. */
export async function loadJSON<T>(date: string, filename: string): Promise<T | null> {
  if (!hasBlob()) return null;
  try {
    const path = blobPath(date, filename);
    const result = await get(path, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Check if today's final brief exists. */
export async function todayBriefExists(date: string): Promise<boolean> {
  if (!hasBlob()) return false;
  try {
    const path = blobPath(date, "brief_final.json");
    const result = await get(path, { access: "private" });
    return !!(result && result.statusCode === 200);
  } catch {
    return false;
  }
}

/** Delete all stored files for a date. */
export async function deleteBrief(date: string): Promise<void> {
  if (!hasBlob()) return;
  try {
    const { blobs } = await list({ prefix: `briefs/${date}/` });
    for (const blob of blobs) {
      await del(blob.url).catch(() => {});
    }
  } catch {
    // ignore
  }
}
