"use client";

import { useState } from "react";
import { renderEngineer } from "@/lib/render";

type Status = "idle" | "fetching" | "generating" | "rendering" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [log, setLog]       = useState<string[]>([]);
  const [html, setHtml]     = useState<string>("");
  const [usage, setUsage]   = useState<{ prompt_tokens: number; completion_tokens: number } | null>(null);
  const [error, setError]   = useState<string>("");

  function addLog(msg: string) {
    setLog(prev => [...prev, msg]);
  }

  async function runPipeline() {
    setStatus("fetching");
    setLog([]);
    setHtml("");
    setError("");
    setUsage(null);

    try {
      // Step 1: Fetch news sources
      addLog("Step 1: Fetching 7 news sources...");
      const fetchRes = await fetch("/api/fetch-news");
      if (!fetchRes.ok) throw new Error(`Fetch failed: ${fetchRes.status}`);
      const { rawSources, date, log: srcLog } = await fetchRes.json();
      srcLog.forEach((l: string) => addLog(`  ${l}`));
      addLog(`✓ ${(rawSources.length / 1000).toFixed(0)}k chars fetched`);

      // Step 2: Extract via OpenAI
      setStatus("generating");
      addLog("Step 2: Calling OpenAI API (extraction)...");
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawSources, date })
      });
      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || "Generation failed");
      }
      const { data, usage: u } = await genRes.json();
      setUsage(u);
      const cost = ((u.prompt_tokens * 2.5 + u.completion_tokens * 10) / 1_000_000).toFixed(4);
      addLog(`✓ Extracted ${data.stories.length} stories + ${data.quick_hits.length} quick hits`);
      addLog(`  Tokens: ${u.prompt_tokens.toLocaleString()} + ${u.completion_tokens.toLocaleString()} = $${cost}`);

      // Step 3: Render HTML
      setStatus("rendering");
      addLog("Step 3: Rendering HTML (Engineer format)...");
      const rendered = renderEngineer(data);
      setHtml(rendered);
      addLog("✓ Done.");
      setStatus("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      addLog(`✗ Error: ${msg}`);
      setStatus("error");
    }
  }

  const busy = status === "fetching" || status === "generating" || status === "rendering";

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>
        Anqi&apos;s News Agent
      </h1>
      <p style={{ color: "#636e72", fontSize: 13, marginBottom: 28 }}>
        Fetches 7 sources → extracts via OpenAI → renders in Engineer format
      </p>

      <button
        onClick={runPipeline}
        disabled={busy}
        style={{
          background: busy ? "#a29bfe" : "#6c5ce7",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "12px 28px",
          fontSize: 15,
          fontWeight: 700,
          cursor: busy ? "not-allowed" : "pointer",
          marginBottom: 24,
        }}
      >
        {status === "fetching"   ? "Fetching sources..." :
         status === "generating" ? "Calling OpenAI..." :
         status === "rendering"  ? "Rendering..." :
         "Generate Today's News"}
      </button>

      {log.length > 0 && (
        <div style={{
          background: "#1e1e1e", color: "#a8d8a8", fontFamily: "monospace",
          fontSize: 12, padding: "14px 16px", borderRadius: 8,
          marginBottom: 24, whiteSpace: "pre-wrap", lineHeight: 1.6
        }}>
          {log.join("\n")}
        </div>
      )}

      {error && (
        <div style={{
          background: "#fce7f3", color: "#831843", padding: "10px 14px",
          borderRadius: 8, marginBottom: 24, fontSize: 13
        }}>
          {error}
        </div>
      )}

      {html && (
        <div style={{ border: "1px solid #e8e4e0", borderRadius: 10, overflow: "hidden" }}>
          <iframe
            srcDoc={html}
            style={{ width: "100%", height: "80vh", border: "none" }}
            title="Daily Brief"
          />
        </div>
      )}
    </main>
  );
}
