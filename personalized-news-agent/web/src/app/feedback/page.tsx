"use client";

import { useState } from "react";
import Link from "next/link";

const BUBBLE_TEXTS = [
  "More AI news", "Deep dives", "Startup funding", "Options flow",
  "Crypto updates", "Rate watch", "Earnings recaps", "IPO pipeline",
  "Chip wars", "Energy sector", "Biotech", "Climate tech",
  "Consumer sentiment", "Labor market", "Cloud spending", "Defense",
];

const TOPIC_SUGGESTIONS = [
  "More AI/ML stories", "Options & derivatives", "Biotech & FDA",
  "Climate & energy", "Crypto & DeFi", "Startup funding rounds",
  "Geopolitics & macro", "Earnings deep dives", "Real estate / REITs",
  "Defense & aerospace",
];

interface Bubble {
  id: number; text: string; x: number; size: number;
  speed: number; drift: number; delay: number; hue: number;
}

function makeBubble(id: number): Bubble {
  return {
    id,
    text: BUBBLE_TEXTS[id % BUBBLE_TEXTS.length],
    x: 8 + Math.random() * 84,
    size: 68 + Math.random() * 52,
    speed: 15 + Math.random() * 13,
    drift: (Math.random() < 0.5 ? 1 : -1) * (4 + Math.random() * 10),
    delay: -(Math.random() * 22),
    hue: 160 + Math.random() * 80,   // teal → green range (different from signup)
  };
}

const BUBBLES: Bubble[] = Array.from({ length: 14 }, (_, i) => makeBubble(i));

export default function FeedbackPage() {
  const [email, setEmail]       = useState("");
  const [message, setMessage]   = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus]     = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function toggleTopic(t: string) {
    setSelected(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() && selected.length === 0) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || null,
          message: message.trim() || null,
          topics: selected,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Something went wrong");
      }
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send");
      setStatus("error");
    }
  }

  return (
    <>
      <style>{`
        @keyframes bubble-rise {
          0%   { transform: translateX(0) translateY(0);   opacity: 0; }
          8%   { opacity: 0.80; }
          92%  { opacity: 0.70; }
          100% { transform: translateX(calc(var(--drift) * 1vw)) translateY(-110vh); opacity: 0; }
        }
        @keyframes float-card {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        .fb-bubble {
          position: absolute;
          bottom: -5rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.25;
          padding: 6px;
          pointer-events: none;
          user-select: none;
          border: 1.5px solid rgba(255,255,255,0.55);
          backdrop-filter: blur(4px);
          background: radial-gradient(circle at 32% 28%,
            rgba(255,255,255,0.85),
            rgba(255,255,255,0.10) 45%,
            rgba(255,255,255,0.03) 70%
          );
          box-shadow:
            inset 0 0 14px rgba(255,255,255,0.3),
            0 4px 24px rgba(16,185,129,0.15);
          animation: bubble-rise var(--speed) ease-in infinite;
          animation-delay: var(--delay);
        }
        .fb-card { animation: float-card 5.5s ease-in-out infinite; }
        .topic-pill {
          transition: all 0.15s;
          cursor: pointer;
          border: none;
          font-family: inherit;
        }
        .topic-pill:hover { transform: scale(1.04); }
        textarea:focus { outline: none; border-color: #6c5ce7 !important; }
        input:focus    { outline: none; border-color: #6c5ce7 !important; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #d4f5ec 0%, #e6f7f0 25%, #faf8f5 60%, #e8e0ff 100%)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}>
        {/* Floating bubbles */}
        {BUBBLES.map(b => (
          <div
            key={b.id}
            className="fb-bubble"
            style={{
              left: `${b.x}%`,
              width: b.size,
              height: b.size,
              "--speed": `${b.speed}s`,
              "--delay": `${b.delay}s`,
              "--drift": `${b.drift}`,
              color: `hsl(${b.hue}, 50%, 35%)`,
            } as React.CSSProperties}
          >
            {b.text}
          </div>
        ))}

        {/* Glow blobs */}
        <div style={{
          position: "absolute", top: "8%", right: "6%",
          width: 320, height: 320, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "12%", left: "5%",
          width: 260, height: 260, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(108,92,231,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Card */}
        <div
          className="fb-card"
          style={{
            position: "relative", zIndex: 10,
            background: "rgba(255,255,255,0.83)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1.5px solid rgba(255,255,255,0.72)",
            borderRadius: 24,
            boxShadow: "0 8px 48px rgba(16,185,129,0.12), 0 2px 8px rgba(0,0,0,0.05)",
            padding: "44px 40px",
            maxWidth: 500,
            width: "100%",
          }}
        >
          {status === "done" ? (
            /* Success */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>💬</div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#2d3436", margin: "0 0 10px" }}>
                Got it — thanks!
              </h2>
              <p style={{ color: "#636e72", fontSize: 14, lineHeight: 1.65, margin: "0 0 28px" }}>
                Your feedback helps shape what goes in the brief. Anqi reads every message.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/signup" style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, #10b981, #6c5ce7)",
                  color: "#fff", padding: "12px 24px", borderRadius: 12,
                  fontWeight: 700, fontSize: 13, textDecoration: "none",
                  boxShadow: "0 4px 16px rgba(16,185,129,0.30)",
                }}>
                  ✉️ Sign up for the brief →
                </Link>
                <button
                  onClick={() => {
                    setStatus("idle");
                    setMessage(""); setEmail(""); setSelected([]);
                  }}
                  style={{
                    background: "rgba(0,0,0,0.05)", color: "#2d3436",
                    border: "none", borderRadius: 12, padding: "12px 22px",
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Send more feedback
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ marginBottom: 28 }}>
                <Link href="/signup" style={{
                  color: "#a29bfe", fontSize: 12, fontWeight: 600,
                  textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  ← Back to signup
                </Link>
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <div style={{ fontSize: 38, marginBottom: 10 }}>💬</div>
                  <h1 style={{
                    fontSize: "1.45rem", fontWeight: 900, color: "#2d3436",
                    margin: "0 0 7px", letterSpacing: "-0.2px",
                  }}>
                    Feedback &amp; Requests
                  </h1>
                  <p style={{ color: "#636e72", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    What would make Anqi&apos;s Brief better? Request topics,
                    flag what&apos;s not working, or just say hi.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Topic request pills */}
                <div style={{ marginBottom: 22 }}>
                  <p style={{
                    fontSize: 12, fontWeight: 700, color: "#2d3436",
                    marginBottom: 10, letterSpacing: "0.2px",
                  }}>
                    Want more coverage on… <span style={{ color: "#b2bec3", fontWeight: 400 }}>(pick any)</span>
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {TOPIC_SUGGESTIONS.map(t => {
                      const on = selected.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          className="topic-pill"
                          onClick={() => toggleTopic(t)}
                          style={{
                            padding: "6px 13px", borderRadius: 20, fontSize: 12,
                            fontWeight: on ? 700 : 500,
                            background: on ? "linear-gradient(135deg, #10b981, #6c5ce7)" : "rgba(108,92,231,0.07)",
                            color: on ? "#fff" : "#6c5ce7",
                            border: `1.5px solid ${on ? "transparent" : "rgba(108,92,231,0.20)"}`,
                            boxShadow: on ? "0 2px 10px rgba(108,92,231,0.28)" : "none",
                          }}
                        >
                          {on ? "✓ " : ""}{t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message textarea */}
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="fb-message" style={{
                    display: "block", fontSize: 12, fontWeight: 700,
                    color: "#2d3436", marginBottom: 7,
                  }}>
                    Message <span style={{ color: "#b2bec3", fontWeight: 400 }}>(optional if you selected topics above)</span>
                  </label>
                  <textarea
                    id="fb-message"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                    placeholder="e.g. The Hormuz story was great — can we get more geopolitics with oil price links? Also the bond yield explanation clicked for me."
                    maxLength={2000}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "12px 14px", borderRadius: 13,
                      border: `1.5px solid ${status === "error" ? "#ef4444" : "#e8e4e0"}`,
                      background: "rgba(255,255,255,0.9)",
                      fontSize: 13.5, color: "#2d3436",
                      lineHeight: 1.65, resize: "vertical",
                      fontFamily: "inherit",
                      transition: "border-color 0.15s",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    {status === "error" && errorMsg ? (
                      <p role="alert" style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{errorMsg}</p>
                    ) : <span />}
                    <span style={{ fontSize: 11, color: "#b2bec3" }}>{message.length}/2000</span>
                  </div>
                </div>

                {/* Optional email */}
                <div style={{ marginBottom: 22 }}>
                  <label htmlFor="fb-email" style={{
                    display: "block", fontSize: 12, fontWeight: 700,
                    color: "#2d3436", marginBottom: 7,
                  }}>
                    Your email <span style={{ color: "#b2bec3", fontWeight: 400 }}>(optional — only if you want a reply)</span>
                  </label>
                  <input
                    id="fb-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "11px 14px", borderRadius: 12,
                      border: "1.5px solid #e8e4e0",
                      background: "rgba(255,255,255,0.9)",
                      fontSize: 14, color: "#2d3436",
                      fontFamily: "inherit",
                      transition: "border-color 0.15s",
                    }}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "loading" || (!message.trim() && selected.length === 0)}
                  style={{
                    width: "100%", padding: "13px",
                    background: status === "loading" || (!message.trim() && selected.length === 0)
                      ? "#a8e6cf"
                      : "linear-gradient(135deg, #10b981, #6c5ce7)",
                    color: "#fff",
                    border: "none", borderRadius: 13,
                    fontSize: 15, fontWeight: 800,
                    cursor: status === "loading" || (!message.trim() && selected.length === 0)
                      ? "not-allowed" : "pointer",
                    boxShadow: (message.trim() || selected.length > 0) && status !== "loading"
                      ? "0 4px 20px rgba(16,185,129,0.38)"
                      : "none",
                    transition: "box-shadow 0.15s",
                    letterSpacing: "0.1px",
                    fontFamily: "inherit",
                  }}
                >
                  {status === "loading" ? "Sending…" : "Send feedback →"}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{
          position: "relative", zIndex: 10,
          marginTop: 22, color: "rgba(99,110,114,0.65)",
          fontSize: 11.5, textAlign: "center",
        }}>
          Anonymous is fine. All feedback read by Anqi personally.
        </p>
      </div>
    </>
  );
}
