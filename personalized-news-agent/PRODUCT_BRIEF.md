# Personalized News Agent — Product Brief

## Origin
Built on top of Anqi's Daily News Agent (see `/home/anqiluo/kiro/Anqi's News agent/`).
The news pipeline already works: 7 sources → deduped → causal chain format → HTML brief.
This product takes that content and **rerenders it for each reader's cognitive style**.

---

## The Core Problem

Most news apps personalize *what* you see (topic filtering).
This app personalizes *how* you see it — the format, depth, framing, and analogies —
so the same content lands differently depending on who's reading it.

A 22-year-old software engineer and a 45-year-old doctor read the same Moderna story
very differently. Same facts. Different context needed. Different stakes. Different format.

---

## The Insight from Anqi's Agent

The current news agent already does something most apps don't:
- **Causal chain format**: Event → reaction → implication
- **Inline "why it matters"** boxes — reasoning attached to fact, not deferred
- **Highlight system**: numbers, companies, risks, positives — visually differentiated
- **Layered depth**: What → Chain → Means

The goal is to make this adaptive — auto-generated per reader profile.

---

## Product Vision (Staged)

### Stage 1: Reader Profile + Adaptive Format
- User takes a fun onboarding quiz (SBTI-inspired, not MBTI)
- Quiz outputs a "Reader Type" (4–6 types we design)
- Every news story is rewritten/reformatted for that Reader Type via LLM
- Content is identical — format/framing/depth changes
- User can continuously refine their profile over time

### Stage 2: Interactive Reading Tools (Gamelike)
- 🔊 **Speaker tool** — tap the megaphone, story is read aloud (TTS)
  - Adjustable speed (0.75x / 1x / 1.25x / 1.5x)
  - Auto-scroll synced to audio
  - For commuters who can't read
- More tools TBD (highlight, save, share, quiz me on this story)

### Stage 3: Continuous Learning Profile
- User can explicitly update their profile ("explain less jargon", "more depth on finance")
- Implicit signals from reading behavior (skips, re-reads, expands)
- Profile becomes a living document that improves every day

---

## Reader Types (Draft — to be refined)

Based on SBTI-style quiz output. Working names:

| Type | Vibe | Format Style |
|------|------|-------------|
| **The Scanner** | "give me the headline + 1 line, I'll decide if I care" | Ultra-brief, bold key fact, one-tap to expand |
| **The Analyst** | "I want the causal chain and the numbers" | Full chain format, stats highlighted, deep implications |
| **The Storyteller** | "explain it like a narrative, not bullet points" | Prose paragraphs, analogies, characters named |
| **The Connector** | "how does this connect to other things I know" | Cross-references, pattern recognition, historical parallels |
| **The Skeptic** | "what's the counter-argument, what could go wrong" | Risk-first framing, bear cases, "but consider..." boxes |
| **The Beginner** | "assume I know nothing about this topic" | Jargon definitions inline, analogies to everyday life |

---

## Onboarding Quiz Design

### Philosophy (SBTI-inspired)
- NOT: "Are you more logical or emotional?"
- YES: "You're in a meeting that could've been an email. You:"
- Absurd, fun scenarios that reveal real behavioral patterns
- 8–12 questions max, should feel like a 2-min TikTok quiz
- Each question maps to a reader dimension, not announced to user

### Reader Dimensions Being Measured
1. **Depth preference** (skim vs. deep dive)
2. **Format preference** (bullets vs. prose vs. visual)
3. **Framing preference** (optimist vs. skeptic vs. neutral)
4. **Prior knowledge** (novice vs. intermediate vs. expert — domain-specific)
5. **Pace** (slow and thorough vs. fast and efficient)

See `QUIZ_DRAFT.md` for the actual questions.

---

## Technical Architecture (High Level)

```
News Pipeline (existing)
  ↓
raw_sources.txt → LLM → structured story JSON
  ↓
Reader Profile (from quiz + behavior)
  ↓
LLM Rewriter → personalized HTML/text per story
  ↓
Reader UI (web/mobile)
  ├── Visual render (adaptive format)
  └── Audio render (TTS, speed control)
```

### Key Components to Build
1. **Quiz UI** — fun onboarding flow
2. **Profile engine** — maps quiz answers to Reader Type + dimensions
3. **LLM rewrite layer** — takes story JSON + reader profile → rewritten story
4. **Reader UI** — adaptive display + audio tools
5. **Feedback loop** — user refines profile over time

---

## Competitive Landscape

| Product | What they do | What we do differently |
|---------|-------------|----------------------|
| Apple News | Topic filtering | We reformat content per cognitive style |
| Morning Brew | One format for everyone | We adapt the format, not just the topics |
| Blinkist | Summary only | We keep full depth but adapt presentation |
| Artifact | AI topic ranking | We change *how* you read, not just *what* |
| Perplexity | Search-based | We're proactive daily brief, not reactive search |

---

## Open Questions

1. What's the primary platform? Web-first? iOS app?
2. Do we build the news pipeline ourselves or use a news API at scale?
3. How many Reader Types is the right number? (4? 6? More?)
4. Is the monetization model subscription, B2B (teams), or something else?
5. Do we want a social layer? (share your Reader Type, share a story in your format)

---

## Next Steps

- [ ] Finalize Reader Types (6 working names → real names)
- [ ] Finalize quiz questions (see `QUIZ_DRAFT.md`)
- [ ] Design the LLM prompt system for each Reader Type
- [ ] Prototype the quiz UI
- [ ] Prototype the adaptive story renderer
- [ ] Add audio/TTS layer
