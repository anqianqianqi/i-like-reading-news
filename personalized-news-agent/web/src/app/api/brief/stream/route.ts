/**
 * /api/brief/stream — streaming version of the agentic pipeline.
 * Uses Server-Sent Events to push progress lines to the browser in real time.
 * Final message: { type: "done", brief, critique } or { type: "error", message }
 */

import { NextRequest } from "next/server";
import { todayKey, saveJSON, saveText, loadJSON, todayBriefExists, deleteBrief } from "@/lib/storage";
import { GENERATE_SYSTEM, CRITIQUE_SYSTEM, REWRITE_SYSTEM } from "@/lib/prompts";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ── All pipeline logic (same as /api/brief POST, just with streaming) ──────

const SOURCES = [
  { id: "MB",      label: "Morning Brew",  url: "https://www.morningbrew.com/issues/latest",                                                     rss: false },
  { id: "CNBC",    label: "CNBC",          url: "https://www.cnbc.com/world/?region=world",                                                       rss: false },
  { id: "Reuters", label: "Reuters",       url: "https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en",                rss: true  },
  { id: "TLDR",    label: "TLDR",          url: "https://tldr.tech/",                                                                             rss: false },
  { id: "Rundown", label: "Rundown AI",    url: "https://www.therundown.ai/archive",                                                              rss: false },
  { id: "ITBrew",  label: "IT Brew",       url: "https://www.itbrew.com/",                                                                        rss: false },
  { id: "SA",      label: "Seeking Alpha", url: "https://news.google.com/rss/search?q=site:seekingalpha.com+markets+earnings&hl=en-US&gl=US&ceid=US:en", rss: true },
];
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

async function fetchText(url: string, maxChars = 12000): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    const html = await res.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,maxChars);
  } catch { return ""; }
}

async function fetchRss(url: string, maxItems = 15): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    const xml = await res.text();
    const items: string[] = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m: RegExpExecArray | null;
    let count = 0;
    // eslint-disable-next-line no-cond-assign
    while (count < maxItems && (m = itemRe.exec(xml)) !== null) {
      const item = m[1];
      const title = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/)?.[1] || "";
      const link  = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
      const desc  = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/)?.[1] || "";
      items.push(`TITLE: ${title}\nLINK: ${link}\nSUMMARY: ${desc.replace(/<[^>]+>/g," ").trim().slice(0,300)}`);
      count++;
    }
    return items.join("\n\n");
  } catch { return ""; }
}

async function openaiCall(apiKey: string, payload: object): Promise<{ data: unknown; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  const rawText = await res.text();
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${rawText.slice(0,300)}`);
  let result: { choices: { message: { content: string } }[]; usage: { prompt_tokens: number; completion_tokens: number } };
  try { result = JSON.parse(rawText); } catch { throw new Error(`OpenAI response not JSON: ${rawText.slice(0,200)}`); }
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error(`OpenAI empty content`);
  return { data: JSON.parse(content), usage: result.usage };
}

const BRIEF_SCHEMA = {
  type:"object",properties:{date:{type:"string"},markets:{type:"object",properties:{summary_title:{type:"string"},key_mechanism:{type:"string"},week_ahead:{type:"string"},tickers:{type:"array",items:{type:"object",properties:{label:{type:"string"},value:{type:"string"},change:{type:"string"},direction:{type:"string",enum:["up","dn","neutral"]}},required:["label","value","change","direction"],additionalProperties:false}}},required:["summary_title","key_mechanism","week_ahead","tickers"],additionalProperties:false},stories:{type:"array",items:{type:"object",properties:{title:{type:"string"},sources:{type:"array",items:{type:"string"}},what:{type:"string"},mechanism:{type:"array",items:{type:"object",properties:{label:{type:"string"},steps:{type:"array",items:{type:"object",properties:{text:{type:"string"},type:{type:"string",enum:["cause","mechanism","result-short","result-long"]}},required:["text","type"],additionalProperties:false}}},required:["label","steps"],additionalProperties:false}},so_what:{type:"array",items:{type:"string"},minItems:2,maxItems:3},price_moves:{type:"array",items:{type:"object",properties:{ticker:{type:"string"},company:{type:"string"},direction:{type:"string",enum:["up","dn","watch"]},magnitude:{type:"string"},reason:{type:"string"}},required:["ticker","company","direction","magnitude","reason"],additionalProperties:false}},glossary_terms:{type:"array",description:"REQUIRED. List every finance/tech term. Do not leave empty.",items:{type:"string"}},highlights:{type:"array",items:{type:"object",properties:{text:{type:"string"},type:{type:"string",enum:["number","company","risk","positive"]}},required:["text","type"],additionalProperties:false}}},required:["title","sources","what","mechanism","so_what","price_moves","glossary_terms","highlights"],additionalProperties:false}},quick_hits:{type:"array",items:{type:"object",properties:{topic:{type:"string"},detail:{type:"string"},highlight:{type:"string"},source:{type:"string"}},required:["topic","detail","highlight","source"],additionalProperties:false}}},required:["date","markets","stories","quick_hits"],additionalProperties:false
};

// ── SSE helper ─────────────────────────────────────────────────────────────

function sseMessage(type: string, payload: unknown): string {
  return `data: ${JSON.stringify({ type, ...( typeof payload === "string" ? { message: payload } : payload) })}\n\n`;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  const force = req.nextUrl.searchParams.get("force") === "true";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(type: string, payload: unknown) {
        controller.enqueue(encoder.encode(sseMessage(type, payload)));
      }
      function log(msg: string) { send("log", msg); }

      try {
        if (!apiKey) throw new Error("OPENAI_API_KEY not set");

        const date = todayKey();

        // Check cache
        if (!force) {
          const exists = await todayBriefExists(date).catch(() => false);
          if (exists) {
            log(`✓ Cached brief for ${date} — loading from storage`);
            const brief = await loadJSON(date, "brief_final.json");
            const critique = await loadJSON(date, "critique.json");
            send("done", { brief, critique, date, cached: true });
            controller.close();
            return;
          }
        } else {
          log("Force regenerate — clearing cache...");
          await deleteBrief(date).catch(() => {});
        }

        // Step 1: Fetch sources
        log("Step 1: Fetching 7 news sources...");
        const parts: string[] = [];
        for (const src of SOURCES) {
          const text = src.rss ? await fetchRss(src.url) : await fetchText(src.url);
          log(`  ${src.id}: ${text.length.toLocaleString()} chars`);
          parts.push(`\n\n${"=".repeat(60)}\nSOURCE: ${src.id} — ${src.label}\nURL: ${src.url}\n${"=".repeat(60)}\n${text}`);
        }
        const rawSources = parts.join("\n");
        const fetchDate = new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
        log(`✓ ${(rawSources.length/1000).toFixed(0)}k chars fetched`);
        saveText(date, "raw_sources.txt", rawSources).catch(() => {});

        const MAX = 50000;
        const truncated = rawSources.length > MAX ? rawSources.slice(0,MAX)+"\n[truncated]" : rawSources;

        // Step 2: Generate
        log("Step 2: Calling OpenAI to generate brief...");
        const { data: brief_v1, usage: u1 } = await openaiCall(apiKey, {
          model:"gpt-4o", temperature:0.2, max_tokens:16384,
          messages:[
            { role:"system", content:GENERATE_SYSTEM },
            { role:"user", content:`Today is ${fetchDate}.\n\nGenerate at least 6 stories and 15 quick hits. Cover everything.\n\n${truncated}` }
          ],
          response_format:{ type:"json_schema", json_schema:{ name:"daily_brief", strict:true, schema:BRIEF_SCHEMA } }
        }) as { data: { stories: unknown[]; quick_hits: unknown[] }; usage: { prompt_tokens:number; completion_tokens:number } };

        log(`✓ Generated ${(brief_v1 as {stories:unknown[]}).stories.length} stories + ${(brief_v1 as {quick_hits:unknown[]}).quick_hits.length} quick hits`);
        log(`  Tokens: ${u1.prompt_tokens.toLocaleString()} + ${u1.completion_tokens.toLocaleString()}`);
        saveJSON(date, "brief_v1.json", brief_v1).catch(() => {});

        // Step 3: Critique
        log("Step 3: Critiquing quality...");
        const storySummary = (brief_v1 as {stories:{title:string;what:string;mechanism:{steps:{text:string}[]}[];so_what:string[]}[]}).stories.map((s,i) => ({
          index:i, title:s.title, what:s.what,
          mechanism_steps: s.mechanism.flatMap(m=>m.steps.map(step=>step.text)),
          so_what:s.so_what
        }));

        const { data: critique, usage: u2 } = await openaiCall(apiKey, {
          model:"gpt-4o", temperature:0.1, max_tokens:4096,
          messages:[
            { role:"system", content:CRITIQUE_SYSTEM },
            { role:"user", content:`Review these stories:\n${JSON.stringify(storySummary,null,2)}` }
          ],
          response_format:{ type:"json_object" }
        }) as { data:{issues:{story_index:number;story_title:string;failures:string[];missing_facts:string[];rewrite_priority:string}[];passed_count:number;failed_count:number}; usage:{prompt_tokens:number;completion_tokens:number} };

        log(`✓ Critique: ${critique.passed_count} passed, ${critique.failed_count} failed`);
        (critique.issues||[]).forEach((i:{story_title:string;failures:string[]}) => log(`  ⚠ "${i.story_title}": ${i.failures[0]}`));
        saveJSON(date, "critique.json", critique).catch(() => {});

        // Step 4: Rewrite
        const highPri = (critique.issues||[]).filter((i:{rewrite_priority:string}) => i.rewrite_priority==="high");
        let brief_final = { ...brief_v1 } as {stories:unknown[]};

        if (highPri.length > 0) {
          log(`Step 4: Rewriting ${highPri.length} story/stories in parallel...`);
          const results = await Promise.all(
            highPri.map(async (issue:{story_index:number;story_title:string;failures:string[];missing_facts:string[]}) => {
              const story = (brief_v1 as {stories:unknown[]}).stories[issue.story_index];
              try {
                const { data: rewrite } = await openaiCall(apiKey, {
                  model:"gpt-4o", temperature:0.2, max_tokens:4096,
                  messages:[
                    { role:"system", content:REWRITE_SYSTEM },
                    { role:"user", content:`Rewrite this story.\n\nOriginal: ${JSON.stringify(story)}\n\nIssues: ${issue.failures.join("; ")}\n\nMissing facts: ${(issue.missing_facts||[]).join("; ")}\n\nSources:\n${truncated.slice(0,25000)}` }
                  ],
                  response_format:{ type:"json_object" }
                }) as { data:{updated_what?:string;updated_mechanism?:unknown;updated_so_what?:string[]} };
                log(`  ✓ Rewrote "${issue.story_title}"`);
                return { index:issue.story_index, rewrite };
              } catch { return null; }
            })
          );

          const updatedStories = [...(brief_final.stories as {what:string;mechanism:unknown;so_what:string[]}[])];
          for (const r of results) {
            if (!r) continue;
            updatedStories[r.index] = {
              ...updatedStories[r.index],
              what: r.rewrite.updated_what ?? updatedStories[r.index].what,
              mechanism: r.rewrite.updated_mechanism ?? updatedStories[r.index].mechanism,
              so_what: r.rewrite.updated_so_what ?? updatedStories[r.index].so_what,
            };
          }
          brief_final = { ...brief_final, stories:updatedStories };
        } else {
          log("Step 4: All stories passed — no rewrites needed.");
        }

        saveJSON(date, "brief_final.json", brief_final).catch(() => {});

        const cost = ((u1.prompt_tokens+u2.prompt_tokens)*2.5 + (u1.completion_tokens+u2.completion_tokens)*10) / 1_000_000;
        log(`✓ Done · $${cost.toFixed(4)}`);
        send("done", { brief:brief_final, critique, date, cached:false });

      } catch (err:unknown) {
        send("error", err instanceof Error ? err.message : String(err));
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  });
}
