#!/bin/bash
# Daily Brief — two-step LLM pipeline
# Step 1: fetch sources  → raw_sources.txt
# Step 2: extract (LLM)  → stories_today.json
# Step 3: render (Python) → anqi_daily_news.html
# Step 4: email           → deliver.py

LOG="/home/anqiluo/kiro/daily_brief.log"
DIR="/home/anqiluo/kiro/Anqi's News agent/morning_brew_agent"

echo "=== $(date) ===" >> "$LOG"
cd "$DIR"

echo "Step 1: Fetching sources..." >> "$LOG"
/usr/bin/python3 brew_daily_nollm.py >> "$LOG" 2>&1

echo "Step 2: Extracting stories via OpenAI API..." >> "$LOG"
/usr/bin/python3 extract_stories.py >> "$LOG" 2>&1

echo "Step 3: Rendering HTML (engineer format)..." >> "$LOG"
/usr/bin/python3 render_html.py --reader-type engineer >> "$LOG" 2>&1

echo "Step 4: Sending email..." >> "$LOG"
/usr/bin/python3 deliver.py >> "$LOG" 2>&1

echo "Done." >> "$LOG"
