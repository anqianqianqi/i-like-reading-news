/**
 * storage.ts — Vercel Blob (private store, OIDC auth).
 * Requires @vercel/blob >= 2.3.0 for get() and access:'private'.
 * OIDC authentication is automatic when running on Vercel with BLOB_STORE_ID set.
 */

import { put, get, del, list } from "@vercel/blob";

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function blobPath(date: string, filename: string): string {
  return `briefs/${date}/${filename}`;
}

export function hasBlob(): boolean {
  return !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

/** Save JSON to private Blob. */
export async function saveJSON(date: string, filename: string, data: unknown): Promise<void> {
  if (!hasBlob()) return;
  await put(blobPath(date, filename), JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

/** Save text to private Blob. */
export async function saveText(date: string, filename: string, text: string): Promise<void> {
  if (!hasBlob()) return;
  await put(blobPath(date, filename), text, {
    access: "private",
    contentType: "text/plain",
    addRandomSuffix: false,
  });
}

/** Load JSON from private Blob. Returns null if not found. */
export async function loadJSON<T>(date: string, filename: string): Promise<T | null> {
  if (!hasBlob()) return null;
  try {
    const result = await get(blobPath(date, filename), { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    // result.stream is a ReadableStream — read it to text
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
    const result = await get(blobPath(date, "brief_final.json"), { access: "private" });
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
