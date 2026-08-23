/**
 * storage.ts — Vercel Blob persistence.
 * Uses @vercel/blob SDK with access:'public' (news data is not sensitive).
 * OIDC auth via BLOB_STORE_ID when running on Vercel.
 */

import { put, head, del, list } from "@vercel/blob";

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function blobPath(date: string, filename: string): string {
  return `briefs/${date}/${filename}`;
}

export function hasBlob(): boolean {
  return !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

/** Save JSON to Blob. */
export async function saveJSON(date: string, filename: string, data: unknown): Promise<void> {
  if (!hasBlob()) return;
  await put(blobPath(date, filename), JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

/** Save text to Blob. */
export async function saveText(date: string, filename: string, text: string): Promise<void> {
  if (!hasBlob()) return;
  await put(blobPath(date, filename), text, {
    access: "public",
    contentType: "text/plain",
    addRandomSuffix: false,
  });
}

/** Load JSON from Blob. Returns null if not found. */
export async function loadJSON<T>(date: string, filename: string): Promise<T | null> {
  if (!hasBlob()) return null;
  try {
    const info = await head(blobPath(date, filename));
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
  if (!hasBlob()) return false;
  try {
    const info = await head(blobPath(date, "brief_final.json"));
    return !!info;
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
