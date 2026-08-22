"use client";

import { useState, useEffect } from "react";
import { renderEngineer } from "@/lib/render";

type Status = "idle" | "checking" | "loading" | "running" | "done" | "error";

export default function Home() {
  const [status, setStatus]   = useState<Status>("checking");
  const [log, setLog]         = useState<string[]>([]);
  const [html, setHtml]       = useState<string>("");
  const [cached, setCached]   = useState(false);
  const [error, setError]     = useState<string>("");
  const [cost, setCost]       = useState<string>("");

  function addLog(msg: string) { setLog(prev => [...prev, msg]); }

  // On mount: check if today's brief already exists in Blob
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/brief");
        if (res.ok) {
          const { brief } = await res.json();
          setHtml(renderEngineer(brief));
          setCached(true);
          addLog("✓ Loaded today's brief from storage.");
          setStatus("done");
        } else {
          setStatus("idle");
        }
      } catch {
        setStatus("idle");
      }
    })();
  }, []);

  // Format saved fixture — no API call
  async function previewFixture() {
    setStatus("loading");
    setLog(["Loading saved fixture (Aug 22, 2026)..."]);
    setHtml(""); setError("");
    try {
      const res = await fetch("/api/fixture");
      if (!res.ok) throw new Error("Fixture not found");
      const { data } = await res.json();
      setHtml(renderEngineer(data));
      addLog(`✓ Formatted ${data.stories.length} stories.`);
      setStatus("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  // Full agentic pipeline via /api/brief
  async function runPipeline(force = false) {
    setStatus("running");
    setLog(force ? ["Force regenerating..."] : ["Starting pipeline..."]);
    setHtml(""); setError(""); setCached(false); setCost("");

    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Pipeline failed: ${res.status}`);
      }
      const { brief, log: pipeLog, cached: wasCached } = await res.json();

      pipeLog.forEach((l: string) => addLog(l));
      setHtml(renderEngineer(brief));
      setCached(wasCached);

      // Extract cost from log
      const costLine = pipeLog.find((l: string) => l.includes("$0."));
      if (costLine) setCost(costLine);

      setStatus("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg); addLog(`✗ ${msg}`); setStatus("error");
    }
  }

  const busy = status === "checking" || status === "loading" || status === "running";

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 920, margin: "0 auto", padding: "28px 20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>Anqi&apos;s News Agent</h1>
        {cached && status === "done" && (
          <span style={{ fontSize: 11, background: "#dcfce7", color: "#14532d",
            padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
            cached
          </span>
        )}
      </div>
      <p style={{ color: "#636e72", fontSize: 12, marginBottom: 20 }}>
        Fetch → Generate → Critique → Rewrite → Store in Blob
      </p>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>

        <button onClick={previewFixture} disabled={busy} style={{
          background: "#fff", color: "#6c5ce7", border: "2px solid #6c5ce7",
          borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700,
          cursor: busy ? "not-allowed" : "pointer",
        }}>
          Format Saved (Aug 22)
        </button>

        {status === "done" && cached ? (
          <button onClick={() => runPipeline(true)} disabled={busy} style={{
            background: "#fff", color: "#636e72", border: "1.5px solid #e8e4e0",
            borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600,
            cursor: "pointer",
          }}>
            Regenerate
          </button>
        ) : (
          <button onClick={() => runPipeline(false)} disabled={busy} style={{
            background: busy ? "#a29bfe" : "#6c5ce7",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "9px 18px", fontSize: 13, fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
          }}>
            {status === "checking" ? "Checking storage..." :
             status === "running"  ? "Running pipeline..." :
             "Generate Today's News"}
          </button>
        )}

        {cost && (
          <span style={{ fontSize: 11, color: "#636e72" }}>{cost}</span>
        )}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div style={{
          background: "#1a1a2e", color: "#a8d8a8", fontFamily: "monospace",
          fontSize: 11.5, padding: "10px 14px", borderRadius: 7,
          marginBottom: 18, whiteSpace: "pre-wrap", lineHeight: 1.65,
          maxHeight: 200, overflowY: "auto"
        }}>
          {log.join("\n")}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: "#fce7f3", color: "#831843", padding: "9px 13px",
          borderRadius: 7, marginBottom: 18, fontSize: 13
        }}>
          {error}
        </div>
      )}

      {/* Brief */}
      {html && (
        <div style={{ border: "1px solid #e8e4e0", borderRadius: 10, overflow: "hidden" }}>
          <iframe srcDoc={html} style={{ width: "100%", height: "82vh", border: "none" }} title="Daily Brief" />
        </div>
      )}
    </main>
  );
}
