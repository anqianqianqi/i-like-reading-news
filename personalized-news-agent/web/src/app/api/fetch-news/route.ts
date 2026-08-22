import { NextResponse } from "next/server";

const SOURCES = [
  { id: "MB",      label: "Morning Brew",  url: "https://www.morningbrew.com/issues/latest",                                                     rss: false },
  { id: "CNBC",    label: "CNBC",          url: "https://www.cnbc.com/world/?region=world",                                                       rss: false },
  { id: "Reuters", label: "Reuters",       url: "https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en",                rss: true  },
  { id: "TLDR",    label: "TLDR",          url: "https://tldr.tech/",                                                                             rss: false },
  { id: "Rundown", label: "Rundown AI",    url: "https://www.therundown.ai/archive",                                                              rss: false },
  { id: "ITBrew",  label: "IT Brew",       url: "https://www.itbrew.com/",                                                                        rss: false },
  { id: "SA",      label: "Seeking Alpha", url: "https://news.google.com/rss/search?q=site:seekingalpha.com+markets+earnings&hl=en-US&gl=US&ceid=US:en", rss: true },
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
};

async function fetchText(url: string, maxChars = 12000): Promise<string> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    const html = await res.text();
    // Strip tags — basic text extraction
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, maxChars);
  } catch {
    return "";
  }
}

async function fetchRss(url: string, maxItems = 15): Promise<string> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    const xml = await res.text();
    const items: string[] = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let itemMatch: RegExpExecArray | null;
    let count = 0;
    // eslint-disable-next-line no-cond-assign
    while (count < maxItems && (itemMatch = itemRe.exec(xml)) !== null) {
      const item = itemMatch[1];
      const title   = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/)?.[1] || "";
      const link    = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
      const desc    = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/)?.[1] || "";
      const cleanDesc = desc.replace(/<[^>]+>/g, " ").trim().slice(0, 300);
      items.push(`TITLE: ${title}\nLINK: ${link}\nSUMMARY: ${cleanDesc}`);
      count++;
    }
    return items.join("\n\n");
  } catch {
    return "";
  }
}

export async function GET() {
  const parts: string[] = [];
  const log: string[] = [];

  for (const src of SOURCES) {
    const text = src.rss
      ? await fetchRss(src.url)
      : await fetchText(src.url);
    const chars = text.length;
    log.push(`${src.id}: ${chars.toLocaleString()} chars`);
    parts.push(`\n\n${"=".repeat(60)}\nSOURCE: ${src.id} — ${src.label}\nURL: ${src.url}\n${"=".repeat(60)}\n${text}`);
  }

  const combined = parts.join("\n");
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  return NextResponse.json({ rawSources: combined, date: today, log });
}
