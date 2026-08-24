/**
 * /api/brief/debug — list all blobs to diagnose storage issues.
 * GET: returns list of all blob paths in the store.
 */
import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "briefs/" });
    return NextResponse.json({
      count: blobs.length,
      paths: blobs.map(b => ({ pathname: b.pathname, size: b.size, url: b.url })),
      env: {
        hasBlobStoreId: !!process.env.BLOB_STORE_ID,
        hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      }
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
