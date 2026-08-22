"use client";

import { useState } from "react";
import { renderEngineer } from "@/lib/render";

type Status =
  | "idle"
  | "fetching"
  | "generating"
  | "critiquing"
  | "rewriting"
  | "rendering"
  | "done"
  | "error";

interface UsageAccum {
  prompt_tokens: number;
  completion_tokens: number;
}

export default function Home() {
  const [status, setStatus]   = useState<Status>("idle");
  const [log, setLog]         = useState<string[]>([]);
  const [html, setHtml]       = useState<string>("");
  const [usage, setUsage]     = useState<UsageAccum | null>(null);
  const [error, setError]     = useState<string>("");

  function addLog(msg: string) {
    setLog(prev => [...prev, msg]);
  }

  function addUsage(u: { prompt_tokens: number; completion_tokens: number }) {
    setUsage(prev => ({
      prompt_tokens: (prev?.prompt_tokens || 0) + u.prompt_tokens,
      completion_tokens: (prev?.completion_tokens || 0) + u.completion_tokens
    }));
  }

  // ── Preview saved JSON — no API calls ─────────────────────────────────
  async function previewFixture() {
    setStatus("rendering");
    setLog(["Loading saved LLM output (Aug 22, 2026)..."]);
    setHtml(""); setError(""); setUsage(null);
    try {
      const res = await fetch("/api/fixture");
      if (!res.ok) throw new Error("Fixture not found");
      const { data } = await res.json();
      addLog(`✓ Loaded ${data.stories.length} stories + ${data.quick_hits.length} quick hits`);
      addLog("Running formatter (no API call)...");
      setHtml(renderEngineer(data));
      addLog("✓ Formatted.");
      setStatus("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg); setStatus("error");
    }
  }

  // ── Full agentic pipeline: fetch → generate → critique → rewrite ───────
  async function runPipeline() {
    setStatus("fetching");
    setLog([]); setHtml(""); setError(""); setUsage(null);

    try {
      // Step 1: Fetch sources
      addLog("Step 1: Fetching 7 news sources...");
      const fetchRes = await fetch("/api/fetch-news");
      if (!fetchRes.ok) throw new Error(`Fetch failed: ${fetchRes.status}`);
      const { rawSources, date, log: srcLog } = await fetchRes.json();
      srcLog.forEach((l: string) => addLog(`  ${l}`));
      addLog(`✓ ${(rawSources.length / 1000).toFixed(0)}k chars fetched`);

      // Step 2: Generate brief
      setStatus("generating");
      addLog("Step 2: Generating brief via OpenAI...");
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawSources, date })
      });
      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || "Generation failed");
      }
      const { data: brief, usage: u1 } = await genRes.json();
      addUsage(u1);
      addLog(`✓ Generated ${brief.stories.length} stories + ${brief.quick_hits.length} quick hits`);

      // Step 3: Critique
      setStatus("critiquing");
      addLog("Step 3: Running quality critique...");
      const critiqueRes = await fetch("/api/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief })
      });
      if (!critiqueRes.ok) throw new Error("Critique failed");
      const { critique, usage: u2 } = await critiqueRes.json();
      addUsage(u2);

      const highPriority = (critique.issues || []).filter(
        (i: { rewrite_priority: string }) => i.rewrite_priority === "high"
      );
      const allIssues = critique.issues || [];
      addLog(`✓ Critique: ${critique.passed_count} passed, ${critique.failed_count} failed`);
      if (allIssues.length > 0) {
        allIssues.forEach((issue: { story_title: string; failures: string[] }) => {
          addLog(`  ⚠ "${issue.story_title}": ${issue.failures[0]}`);
        });
      }

      // Step 4: Rewrite flagged stories (parallel)
      let finalBrief = { ...brief };
      if (highPriority.length > 0) {
        setStatus("rewriting");
        addLog(`Step 4: Rewriting ${highPriority.length} story/stories...`);

        const rewritePromises = highPriority.map(
          async (issue: { story_index: number; story_title: string; failures: string[]; missing_facts: string[] }) => {
            const story = brief.stories[issue.story_index];
            const res = await fetch("/api/rewrite", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ story, issue, rawSources })
            });
            if (!res.ok) return null;
            const { rewrite, usage: u3 } = await res.json();
            addUsage(u3);
            return { index: issue.story_index, rewrite };
          }
        );

        const rewrites = await Promise.all(rewritePromises);
        const updatedStories = [...finalBrief.stories];
        for (const result of rewrites) {
          if (!result) continue;
          const { index, rewrite } = result;
          updatedStories[index] = {
            ...updatedStories[index],
            what:      rewrite.updated_what      ?? updatedStories[index].what,
            mechanism: rewrite.updated_mechanism  ?? updatedStories[index].mechanism,
            so_what:   rewrite.updated_so_what    ?? updatedStories[index].so_what,
          };
          addLog(`  ✓ Rewrote "${updatedStories[index].title}"`);
        }
        finalBrief = { ...finalBrief, stories: updatedStories };
      } else {
        addLog("Step 4: No rewrites needed — all stories passed.");
      }

      // Step 5: Render
      setStatus("rendering");
      addLog("Step 5: Rendering HTML...");
      setHtml(renderEngineer(finalBrief));
      addLog("✓ Done.");
      setStatus("done");

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg); addLog(`✗ Error: ${msg}`); setStatus("error");
    }
  }

  const busy = status !== "idle" && status !== "done" && status !== "error";
  const totalCost = usage
    ? ((usage.prompt_tokens * 2.5 + usage.completion_tokens * 10) / 1_000_000).toFixed(4)
    : null;

  const statusLabel: Record<Status, string> = {
    idle:       "Generate Today's News",
    fetching:   "Fetching sources...",
    generating: "Generating brief...",
    critiquing: "Critiquing quality...",
    rewriting:  "Rewriting weak stories...",
    rendering:  "Rendering...",
    done:       "Generate Today's News",
    error:      "Generate Today's News",
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 4 }}>
        Anqi&apos;s News Agent
      </h1>
      <p style={{ color: "#636e72", fontSize: 12, marginBottom: 28 }}>
        Fetch → Generate → Critique → Rewrite → Render
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={previewFixture}
          disabled={busy}
          style={{
            background: "#fff", color: "#6c5ce7",
            border: "2px solid #6c5ce7", borderRadius: 8,
            padding: "11px 20px", fontSize: 13, fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Format Saved News (Aug 22)
        </button>

        <button
          onClick={runPipeline}
          disabled={busy}
          style={{
            background: busy ? "#a29bfe" : "#6c5ce7",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "11px 20px", fontSize: 13, fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {statusLabel[status]}
        </button>

        {totalCost && (
          <span style={{ fontSize: 12, color: "#636e72" }}>
            {usage?.prompt_tokens.toLocaleString()}+{usage?.completion_tokens.toLocaleString()} tokens · ${totalCost}
          </span>
        )}
      </div>

      {log.length > 0 && (
        <div style={{
          background: "#1a1a2e", color: "#a8d8a8", fontFamily: "monospace",
          fontSize: 12, padding: "12px 16px", borderRadius: 8,
          marginBottom: 20, whiteSpace: "pre-wrap", lineHeight: 1.7,
          maxHeight: 220, overflowY: "auto"
        }}>
          {log.join("\n")}
        </div>
      )}

      {error && (
        <div style={{
          background: "#fce7f3", color: "#831843", padding: "10px 14px",
          borderRadius: 8, marginBottom: 20, fontSize: 13
        }}>
          {error}
        </div>
      )}

      {html && (
        <div style={{ border: "1px solid #e8e4e0", borderRadius: 10, overflow: "hidden" }}>
          <iframe
            srcDoc={html}
            style={{ width: "100%", height: "82vh", border: "none" }}
            title="Daily Brief"
          />
        </div>
      )}
    </main>
  );
}
