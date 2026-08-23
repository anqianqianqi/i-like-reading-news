/**
 * /api/blob-test — diagnose Blob connection
 * GET: shows env vars and tries a test write/read
 */

import { NextResponse } from "next/server";
import { put, head, del } from "@vercel/blob";

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    BLOB_STORE_ID: process.env.BLOB_STORE_ID ? `set (${process.env.BLOB_STORE_ID.slice(0, 10)}...)` : "NOT SET",
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? "set" : "NOT SET",
    VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN ? "set" : "NOT SET",
    BLOB_WEBHOOK_PUBLIC_KEY: process.env.BLOB_WEBHOOK_PUBLIC_KEY ? "set" : "NOT SET",
  };

  // Try a test write
  const testPath = `test/blob-test-${Date.now()}.json`;
  let writeResult = "not attempted";
  let readResult = "not attempted";
  let deleteResult = "not attempted";

  const token = process.env.VERCEL_OIDC_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;

  try {
    const blob = await put(testPath, JSON.stringify({ test: true, ts: Date.now() }), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      token: token || undefined,
    });
    writeResult = `success — url: ${blob.url}`;

    // Try to read it back
    const info = await head(testPath);
    if (info) {
      const res = await fetch(info.url);
      const data = await res.json();
      readResult = `success — data: ${JSON.stringify(data)}`;
    } else {
      readResult = "head() returned null";
    }

    // Clean up
    await del(blob.url);
    deleteResult = "success";
  } catch (e: unknown) {
    writeResult = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({
    diagnostics,
    testWrite: writeResult,
    testRead: readResult,
    testDelete: deleteResult,
  });
}
