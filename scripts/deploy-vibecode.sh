#!/usr/bin/env bash
# Deploy / sync this AInvestPro rebuild to Vibecode so it is viewable at *.vibecode.run
# and openable from the Vibecode app.
#
# Prerequisites:
#   1. Get an API key at https://vibecode.dev/key
#   2. export VIBECODE_API_KEY="..."
#   3. Ensure vibecode-cli is on PATH (see README)
#
# Usage:
#   ./scripts/deploy-vibecode.sh
#   ./scripts/deploy-vibecode.sh ainvestpro   # preferred subdomain

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${VIBECODE_API_KEY:-}" ]]; then
  echo "Missing VIBECODE_API_KEY."
  echo "Create one at https://vibecode.dev/key then run:"
  echo '  export VIBECODE_API_KEY="your-key"'
  exit 1
fi

if ! command -v vibecode-cli >/dev/null 2>&1; then
  echo "vibecode-cli not found. Install the Linux amd64 binary, e.g.:"
  echo "  mkdir -p ~/.local/bin"
  echo "  curl -fsSL https://github.com/vibecode/vibecode-cli/releases/download/v0.1.0/vibecode-cli-linux-amd64 -o ~/.local/bin/vibecode-cli"
  echo "  chmod +x ~/.local/bin/vibecode-cli"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  exit 1
fi

SUBDOMAIN="${1:-ainvestpro}"
PROMPT="$(cat <<'EOF'
Replace this project with the AInvestPro professional investing companion already designed as a Next.js App Router app.

Requirements:
- Keep it a web app on port 3000
- Portfolio dashboard with demo holdings totaling about $20,909.79 and a $25,000 goal
- Tabs/pages: Home, Portfolio, Analytics, Insights, Learn, Goals, Thesis journal, Mood check-in, Investor type quiz
- Server-side /api/quotes with Zod validation and rate limiting; optional FINNHUB_API_KEY
- LocalStorage persistence, security headers/CSP, light ink+teal fintech UI with Manrope + Newsreader
- Do not invent a different product — rebuild AInvestPro as specified

Prefer cloning or mirroring this GitHub branch if reachable:
https://github.com/christiandemarco447267-dotcom/Cursor-/tree/cursor/ainvestpro-rebuild-aa93

If GitHub is unreachable, recreate the same product features and UI from the requirements above.
EOF
)"

echo "Creating Vibecode webapp project…"
PROJECT_ID="$(vibecode-cli projects create --quiet webapp "AInvestPro professional investing companion")"
echo "projectId=$PROJECT_ID"

echo "Building + deploying via vibecode yolo (this can take several minutes)…"
vibecode-cli yolo "$PROJECT_ID" "$PROMPT"

echo "Setting friendly subdomain if available…"
if vibecode-cli deployments subdomain check "$SUBDOMAIN" >/dev/null 2>&1; then
  vibecode-cli deployments subdomain set "$PROJECT_ID" "$SUBDOMAIN" || true
fi

echo
echo "Done. Project: $PROJECT_ID"
vibecode-cli deployments get --output text "$PROJECT_ID" || true
vibecode-cli projects get --output text "$PROJECT_ID" || true
echo
echo "Open the publicUrl above in a browser, or open the project inside the Vibecode app."
