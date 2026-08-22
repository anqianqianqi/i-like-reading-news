# Morning Brew Digest — Styling & Content Guide

## Visual Identity

**Vibe:** Light, clean, cute — like a well-designed note card you'd actually want to read with coffee.

### Color Palette
- **Background:** `#faf8f5` (warm cream)
- **Cards:** `#ffffff` with subtle shadow
- **Accent purple:** `#6c5ce7` (section numbers, links)
- **Why blocks:** `#f0e6ff` background + `#6c5ce7` left border
- **Highlight blocks:** `#fff3cd` background + `#f59e0b` left border (key numbers/stats)
- **Green for takeaways:** `#ecfdf5` background + `#10b981` left border
- **Text primary:** `#2d3436`
- **Text muted:** `#636e72`
- **Section headers:** `#2d3436` bold, with colored pill number

### Typography
- Font: system-ui, -apple-system, sans-serif
- Body: 15px, line-height 1.7
- Headers: 700 weight, 1.1rem
- Stats: 1.4rem bold accent color

### Component Patterns
- **Hero:** cream gradient, title + pills row + source link
- **Section badge:** colored circle with number
- **Cards:** white, 12px radius, light shadow (`0 2px 8px rgba(0,0,0,.04)`)
- **Stat grid:** centered number boxes with label/value/source
- **Why block:** purple-tinted, explains significance RIGHT where the fact is stated
- **Highlight block:** amber-tinted, for key stats or quotes
- **Takeaway box:** green-tinted, at end of doc
- **Finance definition box (`.def`):** pink/rose-tinted (`#fff0f6` bg, `#f06292` left border, `#c2185b` bold) — inline explanations of financial terms, instruments, mechanisms

### Layout
- Max width: 720px (narrower = more readable for a daily digest)
- Generous whitespace between sections
- Mobile-first responsive

---

## Content Rules (How Anqi's Brain Works)

1. **Lead with the fact, attach the "why" inline.** Never defer reasoning to a later section.
2. **Concise language.** If a stat can be a bullet, make it a bullet. No full paragraphs where a number suffices.
3. **Bold the key point** in every bullet — skimmable in 2 seconds.
4. **No filler.** Strip ads, sponsor blocks, signup CTAs, editorial fluff ("Good morning!"), and social share buttons.
5. **Stats get their own visual box.** Numbers land harder when isolated with context.
6. **Why blocks = the value-add.** Morning Brew tells you what happened. This digest tells you *why it matters to Anqi* or *what pattern it reveals*.
7. **Takeaways at the end.** 3–5 bullet conclusion: "so what does this mean for me?"
8. **Same file, overwritten daily.** File name: `morning_brew_daily.html` — always current, no date clutter.
9. **Source link in hero.** Always link back to original Morning Brew issue.
10. **Section structure:** numbered, titled, scannable. Each topic = one section.

---

## File Output

- **Path:** `~/morning_brew_daily.html`
- **Name:** Fixed. Overwritten each run.
- **Format:** Self-contained HTML (inline styles, no external deps)
- **Opens in:** Any browser. Double-click from Finder.
