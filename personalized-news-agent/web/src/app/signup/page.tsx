"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ── Floating bubble data ──────────────────────────────────────────────────
const BUBBLE_TEXTS = [
  "AI & Tech", "Markets daily", "Causal chains", "Engineer lens",
  "Bond yields", "GPU wars", "Startup news", "Macro trends",
  "Nvidia earnings", "Bitcoin", "Fed watch", "Tariffs",
  "IPO filings", "Energy stocks", "LLM updates", "Robotics",
];

interface Bubble {
  id: number;
  text: string;
  x: number;       // % from left
  size: number;    // px diameter
  speed: number;   // seconds for one rise
  drift: number;   // vw drift left/right
  delay: number;   // animation-delay in seconds (negative = already rising)
  hue: number;
}

function makeBubble(id: number): Bubble {
  return {
    id,
    text: BUBBLE_TEXTS[id % BUBBLE_TEXTS.length],
    x: 8 + Math.random() * 84,
    size: 72 + Math.random() * 56,
    speed: 14 + Math.random() * 14,
    drift: (Math.random() < 0.5 ? 1 : -1) * (4 + Math.random() * 10),
    delay: -(Math.random() * 20),   // stagger: start mid-flight
    hue: 200 + Math.random() * 120, // blue → purple range
  };
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [bubbles] = useState<Bubble[]>(() =>
    Array.from({ length: 16 }, (_, i) => makeBubble(i))
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Something went wrong");
      }
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to sign up");
      setStatus("error");
    }
  }

  return (
    <>
      {/* ── Keyframe CSS ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes bubble-rise {
          0%   { transform: translateX(0) translateY(0);   opacity: 0; }
          8%   { opacity: 0.85; }
          92%  { opacity: 0.75; }
          100% { transform: translateX(calc(var(--drift) * 1vw)) translateY(-110vh); opacity: 0; }
        }
        @keyframes float-card {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(108,92,231,0.35); }
          70%  { box-shadow: 0 0 0 16px rgba(108,92,231,0); }
          100% { box-shadow: 0 0 0 0 rgba(108,92,231,0); }
        }
        .bubble {
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
            rgba(255,255,255,0.88),
            rgba(255,255,255,0.10) 45%,
            rgba(255,255,255,0.03) 70%
          );
          box-shadow:
            inset 0 0 14px rgba(255,255,255,0.3),
            0 4px 24px rgba(108,92,231,0.18);
          animation: bubble-rise var(--speed) ease-in infinite;
          animation-delay: var(--delay);
        }
        .signup-card {
          animation: float-card 5s ease-in-out infinite;
        }
      `}</style>

      {/* ── Page ─────────────────────────────────────────────────────── */}
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(160deg, #e8e0ff 0%, #f0e6ff 30%, #faf8f5 65%, #e6f0ff 100%)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        {/* Floating bubbles */}
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="bubble"
            style={{
              left: `${b.x}%`,
              width: b.size,
              height: b.size,
              "--speed": `${b.speed}s`,
              "--delay": `${b.delay}s`,
              "--drift": `${b.drift}`,
              color: `hsl(${b.hue}, 55%, 38%)`,
            } as React.CSSProperties}
          >
            {b.text}
          </div>
        ))}

        {/* Soft glow blobs */}
        <div style={{
          position: "absolute", top: "10%", left: "5%",
          width: 340, height: 340, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(108,92,231,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "15%", right: "8%",
          width: 280, height: 280, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,110,114,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* ── Card ───────────────────────────────────────────────────── */}
        <div
          className="signup-card"
          style={{
            position: "relative", zIndex: 10,
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1.5px solid rgba(255,255,255,0.7)",
            borderRadius: 24,
            boxShadow: "0 8px 48px rgba(108,92,231,0.14), 0 2px 8px rgba(0,0,0,0.06)",
            padding: "48px 44px",
            maxWidth: 580,
            width: "100%",
          }}
        >
          {status === "done" ? (
            /* ── Success state ─────────────────────────────────────── */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#2d3436", margin: "0 0 10px" }}>
                You&apos;re in!
              </h2>
              <p style={{ color: "#636e72", fontSize: 14, lineHeight: 1.65, margin: "0 0 28px" }}>
                You&apos;ll get the Daily Brief every morning.
                Engineer format. Causal chains. No filler.
              </p>
              <Link
                href="/feedback"
                style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
                  color: "#fff",
                  padding: "12px 28px",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  boxShadow: "0 4px 16px rgba(108,92,231,0.35)",
                }}
              >
                💬 Leave feedback or request topics →
              </Link>
            </div>
          ) : (
            /* ── Signup form ────────────────────────────────────────── */
            <>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>☕</div>
                <h1 style={{
                  fontSize: "1.55rem", fontWeight: 900, color: "#2d3436",
                  margin: "0 0 8px", letterSpacing: "-0.3px",
                }}>
                  Engineer Brain&apos;s Daily Brief
                </h1>
                <p style={{ color: "#636e72", fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
                  A newsletter tailored to your engineer brain — causal chains,
                  market angles, and tech depth. Every weekday at 6am.
                </p>
              </div>

              {/* Source pills */}
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 6,
                justifyContent: "center", marginBottom: 28,
              }}>
                {["Morning Brew", "CNBC", "Reuters", "TLDR", "Rundown AI", "IT Brew", "Seeking Alpha"].map(s => (
                  <span key={s} style={{
                    background: "rgba(108,92,231,0.08)",
                    color: "#6c5ce7", fontSize: 11, fontWeight: 600,
                    padding: "3px 9px", borderRadius: 20,
                    border: "1px solid rgba(108,92,231,0.18)",
                  }}>{s}</span>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                {/* Preview snippet */}
                <div style={{
                  background: "rgba(108,92,231,0.04)",
                  border: "1.5px solid rgba(108,92,231,0.14)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 18,
                  fontSize: 12,
                  lineHeight: 1.65,
                  color: "#2d3436",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "#a29bfe", marginBottom: 8 }}>
                    📰 format preview · definitely real news
                  </div>

                  {/* Story header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, paddingBottom: 6, borderBottom: "1.5px solid #e8e4e0" }}>
                    <span style={{
                      background: "#6c5ce7", color: "#fff", fontSize: 9, fontWeight: 700,
                      width: 18, height: 18, borderRadius: "50%", display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>1</span>
                    <span style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.4 }}>
                      <span style={{ background: "#e0f2fe", color: "#0c4a6e", borderRadius: 3, padding: "0 3px", fontWeight: 700 }}>Canadia</span>{" "}
                      retaliates with <span style={{ background: "#fef9c3", color: "#713f12", borderRadius: 3, padding: "0 3px", fontWeight: 700 }}>50% tariffs</span> on frozen maple syrup — also renames border "The Chill Wall"
                    </span>
                    <span style={{ background: "#fff3cd", color: "#92400e", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 7, marginLeft: "auto", flexShrink: 0 }}>MB</span>
                  </div>

                  {/* What */}
                  <p style={{ margin: "0 0 7px", fontSize: 12, lineHeight: 1.65 }}>
                    <strong>What:</strong> <span style={{ background: "#e0f2fe", color: "#0c4a6e", borderRadius: 3, padding: "0 3px", fontWeight: 700 }}>Canadia</span> slapped{" "}
                    <span style={{ background: "#fef9c3", color: "#713f12", borderRadius: 3, padding: "0 3px", fontWeight: 700 }}>50% tariffs</span> on <span style={{ background: "#fef9c3", color: "#713f12", borderRadius: 3, padding: "0 3px", fontWeight: 700 }}>$20B</span> of exports — frozen octopus, artisanal chainsaws, and <span style={{ background: "#fce7f3", color: "#831843", borderRadius: 3, padding: "0 3px", fontWeight: 700 }}>all flannel</span>.
                    President Trumpton retaliated by proposing a <span style={{ background: "#fef9c3", color: "#713f12", borderRadius: 3, padding: "0 3px", fontWeight: 700 }}>200% tariff</span> on hockey pucks "just to make a point."
                  </p>

                  {/* Causal chain */}
                  <div style={{
                    borderLeft: "3px solid #e8e4e0", background: "#fafafa",
                    borderRadius: "0 6px 6px 0", padding: "6px 10px", fontSize: 11,
                    color: "#2d3436", marginBottom: 7, lineHeight: 1.7,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#636e72", display: "block", marginBottom: 4 }}>causal chain</span>
                    <span style={{ background: "#fee2e2", color: "#9a1515", borderRadius: 3, padding: "0 4px", fontSize: 9, fontWeight: 700, marginRight: 4 }}>cause</span>talks collapse over flannel import quotas
                    <span style={{ color: "#6c5ce7", fontWeight: 800, margin: "0 3px" }}>→</span>
                    <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 3, padding: "0 4px", fontSize: 9, fontWeight: 700, marginRight: 4 }}>mechanism</span>Canadia targets swing-district chainsaws + artisanal cheese
                    <span style={{ color: "#6c5ce7", fontWeight: 800, margin: "0 3px" }}>→</span>
                    <span style={{ background: "#fff3cd", color: "#713f12", borderRadius: 3, padding: "0 4px", fontSize: 9, fontWeight: 700, marginRight: 4 }}>short-term</span>flannel futures spike 340%, Patagonia halts production
                    <span style={{ color: "#6c5ce7", fontWeight: 800, margin: "0 3px" }}>→</span>
                    <span style={{ background: "#dcfce7", color: "#14532d", borderRadius: 3, padding: "0 4px", fontSize: 9, fontWeight: 700, marginRight: 4 }}>outcome</span>both sides still willing to negotiate, probably
                  </div>

                  {/* So what */}
                  <div style={{
                    background: "#f0e6ff", borderLeft: "3px solid #6c5ce7",
                    borderRadius: "0 6px 6px 0", padding: "7px 10px", fontSize: 11, lineHeight: 1.65,
                  }}>
                    <span style={{ color: "#6c5ce7", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: 5 }}>so what</span>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#6c5ce7", flexShrink: 0, marginTop: 5 }}/>
                      <span>Canadia is playing the political map, not the economic one — picking products by senate seat, not trade volume. Midterms in November = leverage window.</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#6c5ce7", flexShrink: 0, marginTop: 5 }}/>
                      <span>Real briefs are exactly this format — headline, <strong>What</strong>, causal chain, <em>so what</em>. Just with less flannel.</span>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="signup-email" style={{
                    display: "block", fontSize: 12, fontWeight: 600,
                    color: "#2d3436", marginBottom: 6,
                  }}>
                    Email address <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    ref={inputRef}
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "11px 14px", borderRadius: 12,
                      border: `1.5px solid ${status === "error" ? "#ef4444" : "#e8e4e0"}`,
                      background: status === "error" ? "rgba(254,226,226,0.4)" : "rgba(255,255,255,0.9)",
                      fontSize: 14, color: "#2d3436", outline: "none",
                      transition: "border-color 0.15s",
                      fontFamily: "inherit",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#6c5ce7")}
                    onBlur={e => (e.target.style.borderColor = status === "error" ? "#ef4444" : "#e8e4e0")}
                  />
                  {status === "error" && errorMsg && (
                    <p role="alert" style={{ color: "#ef4444", fontSize: 12, marginTop: 5 }}>
                      {errorMsg}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "loading" || !email.trim()}
                  style={{
                    width: "100%", padding: "13px",
                    background: status === "loading" || !email.trim()
                      ? "#a29bfe"
                      : "linear-gradient(135deg, #6c5ce7, #a29bfe)",
                    color: "#fff",
                    border: "none", borderRadius: 13,
                    fontSize: 15, fontWeight: 800,
                    cursor: status === "loading" || !email.trim() ? "not-allowed" : "pointer",
                    boxShadow: email.trim() && status !== "loading"
                      ? "0 4px 20px rgba(108,92,231,0.40)"
                      : "none",
                    transition: "box-shadow 0.15s, opacity 0.15s",
                    letterSpacing: "0.1px",
                    fontFamily: "inherit",
                    animation: email.trim() && status === "idle" ? "pulse-ring 2.5s ease-out infinite" : "none",
                  }}
                >
                  {status === "loading" ? "Signing you up…" : "✉️  Subscribe — it's free"}
                </button>
              </form>

              {/* Feedback link */}
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <Link
                  href="/feedback"
                  style={{
                    color: "#a29bfe", fontSize: 13, fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  💬 Already subscribed? Leave feedback or request topics →
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer note */}
        <p style={{
          position: "relative", zIndex: 10,
          marginTop: 24, color: "rgba(99,110,114,0.7)",
          fontSize: 11.5, textAlign: "center",
        }}>
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </>
  );
}
