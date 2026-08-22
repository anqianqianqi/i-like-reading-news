"use client";

import { useState, useEffect } from "react";
import { renderEngineer } from "@/lib/render";

type Status = "idle" | "checking" | "loading" | "running" | "done" | "error";

export default function Home() {
  const [status, setStatus]             = useState<Status>("checking");
  const [log, setLog]                   = useState<string[]>([]);
  const [html, setHtml]                 = useState<string>("");
  const [htmlBalanced, setHtmlBalanced] = useState<string>("");
  const [showBalanced, setShowBalanced] = useState(true);
  const [hasRaw, setHasRaw]             = useState(false);
  const [cached, setCached]             = useState(false);
  const [error, setError]               = useState<string>("");
  const [cost, setCost]                 = useState<string>("");
  const [model, setModel]               = useState("gpt-4.1");

  const MODELS = [
    { id: "gpt-4.1",      label: "gpt-4.1  (fast · cheap · good)" },
    { id: "gpt-5.6-sol",  label: "gpt-5.6-sol  (best · slow · ~$1)" },
    { id: "gpt-5.6-terra",label: "gpt-5.6-terra  (balanced)" },
    { id: "gpt-4o",       label: "gpt-4o  (baseline)" },
    { id: "o3",           label: "o3  (reasoning · ~3 min)" },
  ];

  function addLog(msg: string) { setLog(prev => [...prev, msg]); }

  // On mount: check if today's brief already exists in Blob
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/brief");
        if (res.ok) {
          const { brief, brief_balanced } = await res.json();
          setHtml(renderEngineer(brief));
          setHtmlBalanced(renderEngineer(brief_balanced || brief));
          setHasRaw(true);
          setCached(true);
          addLog("✓ Loaded today's brief from storage.");
          setStatus("done");
        } else {
          // Check if at least raw brief exists (for Re-balance button)
          const balRes = await fetch("/api/brief/balance");
          if (balRes.ok) {
            const { exists } = await balRes.json();
            setHasRaw(exists);
          }
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

  // Re-balance only — loads raw brief from Blob, runs balancer (~$0.01)
  async function reBalance() {
    setStatus("running");
    setLog(["Re-balancing from stored raw brief..."]);
    setError("");

    try {
      const res = await fetch("/api/brief/balance", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        if (err.needs_pipeline) {
          setError("No raw brief stored. Run the full pipeline first.");
        } else {
          setError(err.error || "Balance failed");
        }
        setStatus("error");
        return;
      }
      const { brief_balanced, log: balLog } = await res.json();
      balLog.forEach((l: string) => addLog(l));
      const newBalancedHtml = renderEngineer(brief_balanced);
      setHtmlBalanced(newBalancedHtml);
      setShowBalanced(true);
      setStatus("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
    }
  }
  async function runPipeline(force = false) {
    setStatus("running");
    setLog(force ? ["Force regenerating..."] : ["Starting pipeline..."]);
    setHtml(""); setError(""); setCached(false); setCost("");

    try {
      const params = new URLSearchParams({ force: String(force), model });
      const evtSource = new EventSource(`/api/brief/stream?${params}`);

      evtSource.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { type: string; message?: string; brief?: unknown; critique?: unknown; cached?: boolean };
          if (msg.type === "log" && msg.message) {
            addLog(msg.message);
          } else if (msg.type === "done") {
            evtSource.close();
            if (msg.brief) {
              setHtml(renderEngineer(msg.brief));
              setHtmlBalanced(renderEngineer((msg as {brief_balanced?: unknown}).brief_balanced || msg.brief));
              setHasRaw(true);
              setCached(msg.cached || false);
            }
            const costLine = (msg as {log?: string[]}).log?.find?.((l: string) => l.includes("$0."));
            if (costLine) setCost(costLine);
            setStatus("done");
          } else if (msg.type === "error") {
            evtSource.close();
            setError(msg.message || "Unknown error");
            addLog(`✗ ${msg.message}`);
            setStatus("error");
          }
        } catch { /* ignore parse errors */ }
      };

      evtSource.onerror = () => {
        evtSource.close();
        if (status !== "done") {
          setError("Connection lost — check Vercel function logs");
          setStatus("error");
        }
      };

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

        {/* Model selector */}
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          disabled={busy}
          style={{
            border: "1.5px solid #e8e4e0", borderRadius: 8, padding: "9px 12px",
            fontSize: 13, background: "#fff", color: "#2d3436",
            cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit"
          }}
        >
          {MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>

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

        {/* Re-balance button — only if raw brief exists */}
        {hasRaw && (
          <button
            onClick={reBalance}
            disabled={busy}
            style={{
              background: "#fff", color: "#10b981",
              border: "2px solid #10b981", borderRadius: 8,
              padding: "9px 18px", fontSize: 13, fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Re-balance (gpt-4o-mini)
          </button>
        )}
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
        <div>
          {/* Toggle — only show if both versions exist and differ */}
          {htmlBalanced && htmlBalanced !== html && (
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button
                onClick={() => setShowBalanced(false)}
                style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: 700,
                  borderRadius: 6, border: "1.5px solid",
                  background: !showBalanced ? "#6c5ce7" : "#fff",
                  color: !showBalanced ? "#fff" : "#6c5ce7",
                  borderColor: "#6c5ce7", cursor: "pointer"
                }}
              >
                Raw ({model})
              </button>
              <button
                onClick={() => setShowBalanced(true)}
                style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: 700,
                  borderRadius: 6, border: "1.5px solid",
                  background: showBalanced ? "#6c5ce7" : "#fff",
                  color: showBalanced ? "#fff" : "#6c5ce7",
                  borderColor: "#6c5ce7", cursor: "pointer"
                }}
              >
                Balanced
              </button>
            </div>
          )}
          <div style={{ border: "1px solid #e8e4e0", borderRadius: 10, overflow: "hidden" }}>
            <iframe
              srcDoc={showBalanced && htmlBalanced ? htmlBalanced : html}
              style={{ width: "100%", height: "82vh", border: "none" }}
              title="Daily Brief"
            />
          </div>
        </div>
      )}
    </main>
  );
}
