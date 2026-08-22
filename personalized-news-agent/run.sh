#!/bin/bash
# personalized-news-agent — full pipeline
# Usage: ./run.sh
#        ./run.sh --skip-fetch      (reuse existing raw_sources.txt)
#        ./run.sh --dry-run         (fetch + extract only, no render)
#
# Requires: OPENAI_API_KEY environment variable

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PIPELINE="$DIR/pipeline"
LOG="$DIR/pipeline/run.log"

echo "=== $(date) ===" | tee -a "$LOG"

# Step 1: Fetch sources
if [[ "$1" != "--skip-fetch" ]]; then
  echo "Step 1: Fetching sources..." | tee -a "$LOG"
  python3 "$PIPELINE/brew_daily_nollm.py" 2>&1 | tee -a "$LOG"
else
  echo "Step 1: Skipped (--skip-fetch)" | tee -a "$LOG"
fi

# Step 2: Extract stories via OpenAI API
echo "Step 2: Extracting stories via OpenAI API..." | tee -a "$LOG"
python3 "$PIPELINE/extract_stories.py" 2>&1 | tee -a "$LOG"

# Step 3: Render HTML
echo "Step 3: Rendering HTML..." | tee -a "$LOG"
python3 "$PIPELINE/render_html.py" --reader-type engineer 2>&1 | tee -a "$LOG"

echo "Done. Output: $PIPELINE/anqi_daily_news.html" | tee -a "$LOG"
