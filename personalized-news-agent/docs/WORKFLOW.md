# Anqi's Daily Brief — Agent Workflow Documentation

## Overview
A daily news email + HTML file pipeline that fetches news from multiple sources,
generates a formatted HTML brief, and emails it to anqiluo1997@gmail.com every
morning at 6am Eastern time.

---

## File Map

| File | Purpose |
|------|---------|
| `brew_daily_nollm.py` | Step 1: Fetches raw text from all sources → writes `raw_sources.txt`. Then STOPS — requires LLM to generate the HTML. |
| `raw_sources.txt` | Raw fetched content from all sources (input for LLM HTML generation) |
| `anqi_daily_news.html` | The generated daily brief HTML (overwritten daily) |
| `deliver.py` | Step 2: Reads `anqi_daily_news.html`, inlines CSS via premailer, sends email |
| `email_preview.html` | Last sent email HTML (for debugging) |
| `run_daily_brief.sh` | Cron wrapper — only runs `deliver.py` |
| `STYLING.md` | CSS/style reference |
| `requirements.txt` | Python dependencies |

---

## Daily Workflow (Two Steps)

### Step 1: Generate the HTML (LLM step)
Run `brew_daily_nollm.py` — it fetches sources and writes `raw_sources.txt`:
```bash
cd "/home/anqiluo/kiro/Anqi's News agent/morning_brew_agent"
python3 brew_daily_nollm.py
```
Then the LLM (Kiro) reads `raw_sources.txt` and **overwrites** `anqi_daily_news.html`
with today's brief following the format rules below.

### Step 2: Send the email
```bash
python3 deliver.py
```
`deliver.py` uses `premailer` to inline all CSS from `anqi_daily_news.html`,
then sends via Gmail SMTP (app password auth).

---

## Cron Schedule
- **Server:** `dev-dsk-anqiluo-1a-3c09c709.us-east-1.amazon.com`
- **Schedule:** `TZ=America/New_York` / `0 6 * * *` = 6am Eastern daily
- **Command:** `/home/anqiluo/kiro/run_daily_brief.sh`
- **Log:** `/home/anqiluo/kiro/daily_brief.log`

Note: cron currently only runs `deliver.py` (Step 2). Step 1 (HTML generation)
must be run manually or automated separately.

---

## News Sources

| ID | Label | Type | URL |
|----|-------|------|-----|
| MB | ☕ Morning Brew | HTML scrape | https://www.morningbrew.com/issues/latest |
| CNBC | 📺 CNBC | HTML scrape | https://www.cnbc.com/world/?region=world |
| Reuters | 📡 Reuters | RSS (Google News) | https://news.google.com/rss/search?q=site:reuters.com |
| TLDR | ⚡ TLDR | HTML scrape | https://tldr.tech/ |
| Rundown | 🔵 Rundown AI | HTML scrape | https://www.therundown.ai/archive |
| ITBrew | 🔷 IT Brew | HTML scrape | https://www.itbrew.com/ |
| SA | 📈 Seeking Alpha | RSS (Google News) | https://news.google.com/rss/search?q=site:seekingalpha.com+markets |

**Bloomberg RSS** (used in older versions, removed from current brief):
- `https://feeds.bloomberg.com/markets/news.rss`
- `https://feeds.bloomberg.com/technology/news.rss`

---

## HTML Format Rules (anqi_daily_news.html)

### CSS Palette (light theme)
```css
--bg: #faf8f5      /* page background */
--card: #fff       /* story card bg */
--a: #6c5ce7       /* purple accent */
--al: #f0e6ff      /* why-box bg */
--amber: #f59e0b   /* note border */
--ambl: #fff3cd    /* note bg */
--g: #10b981       /* green (up/good) */
--r: #ef4444       /* red (down/risk) */
--text: #2d3436    /* body text */
--m: #636e72       /* muted text */
--bd: #e8e4e0      /* border color */
```

### Highlight Classes
```html
<span class="hn">1B</span>      <!-- yellow bg — numbers/stats -->
<span class="hc">Redis</span>   <!-- blue bg — company/tech names -->
<span class="hw">risk</span>    <!-- pink bg — warnings/risks -->
<span class="hg">benefit</span> <!-- green bg — positive signals -->
```

### Story Structure
```html
<div class="sec">
  <div class="sh">
    <div class="sn">1</div>
    <h2>Story Title</h2>
    <span class="badge b-mb">Source</span>
  </div>
  <div class="story">
    <p class="what"><strong>What:</strong> concise what happened</p>
    <div class="why-box">
      <span class="wl">What it means</span>
      Causal chain: Event → reaction → what it means
    </div>
  </div>
</div>
```

### Causal Chain Format
Use `A → B → means C` for market/stock stories:
```
Iran pause → oil -2% → supply disruption risk repriced → still above pre-war = market not convinced
```
Use `X = Y → means Z` for implications:
```
Redis = in-memory → means <1ms reads → means cache-first for all hot paths
```

### Page Structure
Single-page scroll — **no tabs**. Tabs don't work in Gmail (JavaScript is stripped).
Everything goes in one flat layout:

```html
<!-- All stories in order: Markets, story 1, story 2...Quick Hits -->
<div style="max-width:740px;margin:0 auto;">
  <div class="hero">...</div>
  <div class="sec">...</div>
  ...
  <footer>...</footer>
</div>
```

**No tab-bar, no .page divs, no sw() JavaScript.** Source badges are also removed — sources credited in footer plain text only.

### Markets Section
```html
<div class="sec">
  <div class="sh"><div class="sn">$</div><h2>Markets</h2>...</div>
  <div class="mkts">
    <div class="mkt">
      <div class="mn">S&P 500</div>
      <div class="mv up">7,412</div>
      <div class="mc up">+8.28% YTD</div>
    </div>
    <!-- repeat for each ticker -->
  </div>
  <div class="note">Week ahead context here</div>
</div>
```

### Badge Colors
```css
.b-mb  /* Morning Brew — yellow */
.b-sq  /* Short Squeez — green */
.b-rd  /* Rundown AI — blue */
.b-cn  /* CNBC — red */
.b-tl  /* TLDR — purple */
.b-ib  /* IT Brew — light blue */
.b-rt  /* Reuters — gray */
.b-sa  /* Seeking Alpha — orange */
.b-multi /* Multiple sources */
```

---

## Email Delivery (deliver.py)

### How it works
1. Reads `anqi_daily_news.html`
2. Resolves CSS variables (`var(--x)` → actual hex values)
3. Extracts `page-all` content via regex
4. Wraps in standalone HTML with `!important` CSS overrides
5. Runs `premailer.transform()` to inline all CSS into `style=""` attributes
6. Sends via Gmail SMTP SSL (port 465)
7. Saves `email_preview.html` for debugging

### Gmail Credentials
- From/To: `anqiluo1997@gmail.com`
- App password: stored in `deliver.py` (do not commit to public repos)

### SCP (Mac Desktop sync)
SCP from dev box to Mac fails (AWS → home network, NAT blocks it).
**Workaround:** run this on your Mac:
```bash
scp anqiluo@dev-dsk-anqiluo-1a-3c09c709.us-east-1.amazon.com:"/home/anqiluo/kiro/Anqi's News agent/morning_brew_agent/anqi_daily_news.html" ~/Desktop/anqi_daily_news.html
```
Or use the `getnews` shell function in `~/.zshrc` on Mac.

---

## Known Issues & Fixes Applied

### 1. Duplicate markets sections in email
**Cause:** `page-all` div was not closed before the AI/Finance tab pages started,
so the regex captured all tab content including Finance page's own markets section.
**Fix:** Ensure `</div><!-- /page-all -->` exists immediately after the last
story in page-all, before `<!-- AI PAGE -->`.

### 2. "Why it matters" label
**Fixed to:** `<span class="wl">What it means</span>` in the HTML.
Also applies to `.means` class from `brew_daily_nollm.py` output:
`<span class="ml">= what it means</span>`

### 3. Double emails
**Cause:** `brew_daily_nollm.py` was manually run and also sent email via its
own send function. Only `deliver.py` should send emails.
**Fix:** Cron only runs `run_daily_brief.sh` → `deliver.py`. The
`brew_daily_nollm.py` script does NOT send emails — it only writes HTML.

### 4. Gmail color stripping
**Cause:** Gmail strips `<style>` blocks and class-based CSS.
**Fix:** `premailer` inlines all CSS into `style=""` attributes on every element.
Both `bgcolor` attribute AND `style="background-color:..."` are used for max
compatibility. `send_message()` is used instead of `sendmail()` to avoid
MIME encoding corruption.

### 5. Tab switching not working in Gmail
**Fix:** Email shows only the "All" tab content (flat single-column). No JS tabs.
Tabs work in browser via `onclick="sw('tab',this)"` but not in Gmail.

---

## Study Agent Files (separate from news agent)

Location: `/home/anqiluo/kiro/Anqi's study agent/`

Files completed (need regeneration with new light theme + highlights):
- `bitly_url_shortener.html` ✅ DONE (regenerated with new style)
- `dropbox.html` — pending
- `fb_news_feed.html` — pending
- `gopuff.html` — pending
- `ticketmaster.html` — pending
- `tinder.html` — pending
- `top_k.html` — pending
- `whatsapp.html` — pending
- `youtube.html` — pending

### Study File Style Rules
Same light theme CSS palette as news brief. Default to **Thorough** mode.
See `bitly_url_shortener.html` as the reference implementation.
See `anqi_learning_profile.md` for full content/style requirements.

---

## Mac Setup (local machine)

### Shell alias in ~/.zshrc
```zsh
function getnews() {
  scp anqiluo@dev-dsk-anqiluo-1a-3c09c709.us-east-1.amazon.com:"/home/anqiluo/kiro/Anqi's News agent/morning_brew_agent/anqi_daily_news.html" ~/Desktop/anqi_daily_news.html && open ~/Desktop/anqi_daily_news.html
}
```

### Other aliases
```zsh
alias ucreds='update_ada_creds'
alias anqicre='ada credentials update --role=Admin --account=682373312550 --provider=isengard --once'
```
