/**
 * storage.ts — Vercel Blob persistence via REST API.
 *
 * Uses BLOB_READ_WRITE_TOKEN or VERCEL_BLOB_READ_WRITE_TOKEN (tries both).
 * Falls back to no-op if neither is available.
 */

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2026-08-22"
}

function getToken(): string | null {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN ||
    null
  );
}

function blobPath(date: string, filename: string): string {
  return `briefs/${date}/${filename}`;
}

/** Save a JSON object to Blob. */
export async function saveJSON(date: string, filename: string, data: unknown): Promise<void> {
  const token = getToken();
  if (!token) return; // no-op if no token

  const path = blobPath(date, filename);
  const body = JSON.stringify(data);

  await fetch(`https://blob.vercel-storage.com/${path}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-content-type": "application/json",
    },
    body,
  });
}

/** Save raw text to Blob. */
export async function saveText(date: string, filename: string, text: string): Promise<void> {
  const token = getToken();
  if (!token) return;

  const path = blobPath(date, filename);
  await fetch(`https://blob.vercel-storage.com/${path}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: text,
  });
}

/** Load a JSON object from Blob. Returns null if not found or no token. */
export async function loadJSON<T>(date: string, filename: string): Promise<T | null> {
  const token = getToken();
  if (!token) return null;

  const path = blobPath(date, filename);
  const res = await fetch(`https://blob.vercel-storage.com/${path}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

/** Check if today's final brief exists. */
export async function todayBriefExists(date: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  const path = blobPath(date, "brief_final.json");
  const res = await fetch(`https://blob.vercel-storage.com/${path}`, {
    method: "HEAD",
    headers: { "Authorization": `Bearer ${token}` },
  });
  return res.ok;
}

/** Delete all stored files for a date. */
export async function deleteBrief(date: string): Promise<void> {
  const token = getToken();
  if (!token) return;

  const files = ["brief_final.json", "brief_v1.json", "critique.json", "raw_sources.txt"];
  for (const f of files) {
    const path = blobPath(date, f);
    await fetch(`https://blob.vercel-storage.com/${path}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    }).catch(() => {});
  }
}
