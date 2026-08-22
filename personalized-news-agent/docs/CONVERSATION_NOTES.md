# Conversation Notes — Product Ideation Session
*August 22, 2026*

---

## How This Started

Anqi's News Agent already runs a working pipeline:
- `brew_daily_nollm.py` fetches 7 sources daily
- Kiro reads `raw_sources.txt` and generates `anqi_daily_news.html`
- `deliver.py` sends the email via Gmail SMTP
- Format: causal chain (Event → reaction → implication), inline "why it matters" boxes,
  highlight system (numbers, companies, risks, positives)

The insight: **this format is already personalized for Anqi's brain**.
The product question: can we make it adaptive for any reader's brain?

---

## Core Product Idea

> Same content. Different format for every reader.

Not topic filtering (Apple News does that).
**Cognitive style adaptation** — rewriting the same story for how your brain absorbs information.

---

## Stage 1: Reader Profile + Adaptive Format

### Onboarding
- Fun quiz, SBTI-inspired (not MBTI)
- SBTI = Silly Big Type Indicator, viral Chinese internet personality test
  - Absurd scenario questions ("if a little girl offers you a lollipop...")
  - Maps to real behavioral dimensions underneath the silliness
  - Assigns wild type names: DEAD, MALO, ATM-er, CTRL, SEXY, DRUNK
- Our version: same energy, but maps to **Reader Types** instead of life personalities
- Anqi's example question idea: "你在学习但旁边有只猫，你会怎么做？"
  → Light, fun, relatable, reveals real behavior

### Reader Types (working names)
- ⚡ The Flash — scanner, give me one sentence
- 🔬 The Analyst — causal chain, data, logic
- 📖 The Storyteller — narrative prose, analogies
- 🕵️ The Skeptic — what could go wrong, bear cases
- 🌱 The Explorer — explain from scratch, assume nothing
- 🎧 The Listener — I don't read, I listen (commuter)

### What Changes Per Reader Type
- Same story facts
- Different: depth, format, framing, jargon level, analogies used, opening sentence
- LLM rewriter takes `story JSON + reader profile → personalized story HTML`

### Continuous Profile Refinement
- After quiz, user can keep telling us what they want
- "Explain less jargon" / "more depth on finance" / "shorter please"
- Over time the profile evolves

---

## Stage 2: Interactive Reading Tools (Gamelike)

Drag-and-drop tools that can be "placed" on today's news:

### 🔊 Audio Tool (Highest Priority)
- Megaphone icon on any story
- Tap → story starts reading aloud (TTS)
- Adjustable speed: 0.75x / 1x / 1.25x / 1.5x
- Auto-scroll text synced to audio position
- **Use case:** commuters who can't look at phone

### Other Tools TBD
- 🔖 Bookmark / save for later
- 💬 Quiz me on this story
- 🔗 "How does this connect to yesterday's news"
- 📊 Show me the data behind this claim

---

## Key Design Principles

1. **Content stays the same** — we don't filter, we reformat
2. **Quiz should feel like TikTok, not a job application**
3. **The audio feature is the commuter unlock** — makes news accessible without screen time
4. **Profile should improve passively** — user doesn't have to think about it
5. **Reader Type result should demonstrate the product** — the result screen IS the first personalized experience

---

## Technical Stack (To Be Decided)

Existing:
- Python news pipeline (brew_daily_nollm.py, deliver.py)
- HTML output format (well-structured, CSS variables, semantic classes)

New needed:
- Quiz UI (web or mobile)
- Profile engine (maps quiz → Reader Type dimensions)
- LLM rewrite layer (story JSON + profile → rewritten story)
- TTS integration (browser Web Speech API or external: ElevenLabs, OpenAI TTS)
- Reader UI with tool layer

---

## Open Questions to Resolve

1. Platform: web-first or iOS app first?
2. News pipeline: keep scraping or use a news API at scale?
3. How many Reader Types? (Currently 6 — may be too many for v1)
4. Monetization: subscription? B2B (team reading plans)? Freemium?
5. Social layer? Shareable Reader Types? Share a story in your format?
6. What does the "gamelike tool drag-and-drop" UX actually look like?

---

## Next Actions

- [ ] Refine Quiz Questions (see `QUIZ_DRAFT.md`)
- [ ] Name the Reader Types properly (fun names like SBTI, not generic)
- [ ] Design the LLM prompt template for each Reader Type
- [ ] Sketch the quiz UI flow
- [ ] Prototype the audio/TTS tool on existing news HTML
- [ ] Decide on platform (web vs. app)
