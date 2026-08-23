/**
 * storage.ts — Vercel Blob persistence.
 * Uses VERCEL_OIDC_TOKEN (available automatically on Vercel) passed explicitly.
 */

import { put, head, del, list } from "@vercel/blob";

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function blobPath(date: string, filename: string): string {
  return `briefs/${date}/${filename}`;
}

export function hasBlob(): boolean {
  return !!(
    process.env.VERCEL_OIDC_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_STORE_ID
  );
}

function getToken(): string | undefined {
  return (
    process.env.VERCEL_OIDC_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    undefined
  );
}

/** Save JSON to Blob. */
export async function saveJSON(date: string, filename: string, data: unknown): Promise<void> {
  const token = getToken();
  if (!token) return;
  await put(blobPath(date, filename), JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    token,
  });
}

/** Save text to Blob. */
export async function saveText(date: string, filename: string, text: string): Promise<void> {
  const token = getToken();
  if (!token) return;
  await put(blobPath(date, filename), text, {
    access: "public",
    contentType: "text/plain",
    addRandomSuffix: false,
    token,
  });
}

/** Load JSON from Blob. Returns null if not found. */
export async function loadJSON<T>(date: string, filename: string): Promise<T | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const info = await head(blobPath(date, filename), { token });
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
  const token = getToken();
  if (!token) return false;
  try {
    const info = await head(blobPath(date, "brief_final.json"), { token });
    return !!info;
  } catch {
    return false;
  }
}

/** Delete all stored files for a date. */
export async function deleteBrief(date: string): Promise<void> {
  const token = getToken();
  if (!token) return;
  try {
    const { blobs } = await list({ prefix: `briefs/${date}/`, token });
    for (const blob of blobs) {
      await del(blob.url, { token }).catch(() => {});
    }
  } catch {
    // ignore
  }
}
