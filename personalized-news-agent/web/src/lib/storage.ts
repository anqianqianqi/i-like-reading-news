/**
 * storage.ts — Vercel Blob (private store, OIDC auth).
 *
 * put() with access:'private' to write.
 * head() to check existence, then fetch with OIDC/token to read.
 * Falls back gracefully if BLOB_STORE_ID is missing.
 */

import { put, head, del, list } from "@vercel/blob";

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2026-08-22"
}

function blobPath(date: string, filename: string): string {
  return `briefs/${date}/${filename}`;
}

export function hasBlob(): boolean {
  return !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

function authHeader(): Record<string, string> {
  // Prefer short-lived OIDC token when running on Vercel
  const oidc = process.env.VERCEL_OIDC_TOKEN;
  if (oidc) return { Authorization: `Bearer ${oidc}` };
  const rw = process.env.BLOB_READ_WRITE_TOKEN;
  if (rw) return { Authorization: `Bearer ${rw}` };
  return {};
}

/** Save a JSON object to private Blob. */
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
    // head() returns blob info including the private URL
    const info = await head(path);
    if (!info) return null;
    // Fetch the private URL with auth header
    const res = await fetch(info.url, { headers: authHeader() });
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
    const path = blobPath(date, "brief_final.json");
    const info = await head(path);
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
