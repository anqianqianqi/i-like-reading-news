import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const fixturePath = join(process.cwd(), "src/fixtures/stories_today.json");
    const raw = readFileSync(fixturePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }
}
