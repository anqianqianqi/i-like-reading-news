"use client";

import { useState } from "react";
import { renderEngineer } from "@/lib/render";

type StepStatus = "waiting" | "running" | "done" | "skipped" | "error";

interface Step {
  id: string;
  label: string;
  detail: string;
  status: StepStatus;
}

type PipelineStatus = "idle" | "running" | "done" | "error";

interface UsageAccum {
  prompt_tokens: number;
  completion_tokens: number;
}

const INITIAL_STEPS: Step[] = [
  { id: "fetch",    label: "Fetch sources",      detail: "Scraping 7 news sources",         status: "waiting" },
  { id: "generate", label: "Generate brief",     detail: "OpenAI extraction + analysis",    status: "waiting" },
  { id: "critique", label: "Quality critique",   detail: "Reviewing each story for depth",  status: "waiting" },
  { id: "rewrite",  label: "Rewrite weak stories", detail: "Improving flagged stories",     status: "waiting" },
  { id: "render",   label: "Render",             detail: "Building final HTML brief",        status: "waiting" },
];

function StepIndicator({ status }: { status: StepStatus }) {
  const base: React.CSSProperties = {
    width: 20, height: 20, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700, flexShrink: 0,
  };
  if (status === "waiting")  return <div style={{ ...base, background: "#e8e4e0", color: "#a0a0a0" }}>·</div>;
  if (status === "skipped")  return <div style={{ ...base, background: "#f1f5f9", color: "#94a3b8" }}>–</div>;
  if (status === "error")    return <div style={{ ...base, background: "#fce7f3", color: "#be123c" }}>✗</div>;
  if (status === "done")     return <div style={{ ...base, background: "#dcfce7", color: "#15803d" }}>✓</div>;
  // running — spinning ring
  return (
    <div style={{ ...base, position: "relative" }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%",
        border: "2.5px solid #e0d9ff",
        borderTopColor: "#6c5ce7",
        animation: "spin 0.7s linear infinite",
        position: "absolute",
      }} />
    </div>
  );
}

export default function Home() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [steps, setSteps]   = useState<Step[]>(INITIAL_STEPS);
  const [html, setHtml]     = useState<string>("");
  const [usage, setUsage]   = useState<UsageAccum | null>(null);
  const [error, setError]   = useState<string>("");

  function updateStep(id: string, status: StepStatus, detail?: string) {
    setSteps(prev => prev.map(s =>
      s.id === id ? { ...s, status, ...(detail ? { detail } : {}) } : s
    ));
  }

  function addUsage(u: { prompt_tokens: number; completion_tokens: number }) {
    setUsage(prev => ({
      prompt_tokens: (prev?.prompt_tokens || 0) + u.prompt_tokens,
      completion_tokens: (prev?.completion_tokens || 0) + u.completion_tokens
    }));
  }

  async function previewFixture() {
    setPipelineStatus("running");
    setHtml(""); setError(""); setUsage(null);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: "skipped" as StepStatus })));
    try {
      const res = await fetch("/api/fixture");
      if (!res.ok) throw new Error("Fixture not found");
      const { data } = await res.json();
      setHtml(renderEngineer(data));
      setPipelineStatus("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPipelineStatus("error");
    }
  }

  async function runPipeline() {
    setPipelineStatus("running");
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: "waiting" })));
    setHtml(""); setError(""); setUsage(null);

    try {
      // Step 1: Fetch
      updateStep("fetch", "running", "Scraping 7 news sources...");
      const fetchRes = await fetch("/api/fetch-news");
      if (!fetchRes.ok) throw new Error(`Fetch failed: ${fetchRes.status}`);
      const { rawSources, date, log: srcLog } = await fetchRes.json();
      const kChars = (rawSources.length / 1000).toFixed(0);
      updateStep("fetch", "done", `${kChars}k chars from ${srcLog.length} sources`);

      // Step 2: Generate
      updateStep("generate", "running", "Calling OpenAI — please wait ~30s...");
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
      updateStep("generate", "done",
        `${brief.stories.length} stories · ${brief.quick_hits.length} quick hits · ${u1.completion_tokens.toLocaleString()} tokens`
      );

      // Step 3: Critique
      updateStep("critique", "running", "Reviewing story quality...");
      const critiqueRes = await fetch("/api/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief })
      });
      if (!critiqueRes.ok) throw new Error("Critique failed");
      const { critique, usage: u2 } = await critiqueRes.json();
      addUsage(u2);

      const allIssues: { story_index: number; story_title: string; failures: string[]; missing_facts: string[]; rewrite_priority: string }[] = critique.issues || [];
      const highPriority = allIssues.filter(i => i.rewrite_priority === "high");
      updateStep("critique", "done",
        `${critique.passed_count} passed · ${critique.failed_count} need rewrite`
        + (highPriority.length > 0 ? ` (${highPriority.map((i: { story_title: string }) => i.story_title).join(", ")})` : "")
      );

      // Step 4: Rewrite
      let finalBrief = { ...brief };
      if (highPriority.length > 0) {
        updateStep("rewrite", "running", `Rewriting ${highPriority.length} stories in parallel...`);
        const rewritePromises = highPriority.map(async (issue: { story_index: number; story_title: string; failures: string[]; missing_facts: string[]; rewrite_priority: string }) => {
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
        });

        const rewrites = await Promise.all(rewritePromises);
        const updatedStories = [...finalBrief.stories];
        let rewriteCount = 0;
        for (const result of rewrites) {
          if (!result) continue;
          const { index, rewrite } = result;
          updatedStories[index] = {
            ...updatedStories[index],
            what:      rewrite.updated_what      ?? updatedStories[index].what,
            mechanism: rewrite.updated_mechanism  ?? updatedStories[index].mechanism,
            so_what:   rewrite.updated_so_what    ?? updatedStories[index].so_what,
          };
          rewriteCount++;
        }
        finalBrief = { ...finalBrief, stories: updatedStories };
        updateStep("rewrite", "done", `${rewriteCount} stories improved`);
      } else {
        updateStep("rewrite", "skipped", "All stories passed — no rewrites needed");
      }

      // Step 5: Render
      updateStep("render", "running", "Building HTML...");
      setHtml(renderEngineer(finalBrief));
      updateStep("render", "done", "Ready");
      setPipelineStatus("done");

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPipelineStatus("error");
      setSteps(prev => prev.map(s =>
        s.status === "running" ? { ...s, status: "error" } : s
      ));
    }
  }

  const busy = pipelineStatus === "running";
  const totalCost = usage
    ? ((usage.prompt_tokens * 2.5 + usage.completion_tokens * 10) / 1_000_000).toFixed(4)
    : null;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 920, margin: "0 auto", padding: "32px 20px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 4 }}>
        Anqi&apos;s News Agent
      </h1>
      <p style={{ color: "#636e72", fontSize: 12, marginBottom: 24 }}>
        Fetch → Generate → Critique → Rewrite → Render
      </p>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={previewFixture} disabled={busy} style={{
          background: "#fff", color: "#6c5ce7", border: "2px solid #6c5ce7",
          borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700,
          cursor: busy ? "not-allowed" : "pointer",
        }}>
          Format Saved News (Aug 22)
        </button>
        <button onClick={runPipeline} disabled={busy} style={{
          background: busy ? "#a29bfe" : "#6c5ce7", color: "#fff", border: "none",
          borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700,
          cursor: busy ? "not-allowed" : "pointer",
        }}>
          {busy ? "Running..." : "Generate Today's News"}
        </button>
        {totalCost && (
          <span style={{ fontSize: 11, color: "#636e72" }}>
            {usage?.prompt_tokens.toLocaleString()} + {usage?.completion_tokens.toLocaleString()} tokens · ${totalCost}
          </span>
        )}
      </div>

      {/* Progress steps — always visible when running or done */}
      {pipelineStatus !== "idle" && (
        <div style={{
          background: "#fff", border: "1px solid #e8e4e0", borderRadius: 10,
          padding: "16px 20px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,.04)"
        }}>
          {steps.map((step, i) => (
            <div key={step.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "8px 0",
              borderBottom: i < steps.length - 1 ? "1px solid #f5f3f0" : "none",
            }}>
              <StepIndicator status={step.status} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: step.status === "waiting" ? "#a0a0a0" :
                         step.status === "skipped" ? "#94a3b8" : "#2d3436"
                }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 11, color: "#636e72", marginTop: 1 }}>
                  {step.detail}
                </div>
              </div>
              {step.status === "running" && (
                <div style={{ fontSize: 11, color: "#6c5ce7", fontWeight: 600 }}>
                  in progress
                </div>
              )}
            </div>
          ))}
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
