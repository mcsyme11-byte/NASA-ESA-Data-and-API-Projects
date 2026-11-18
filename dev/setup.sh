#!/bin/sh
# NASA and ESA Data Projects · set up a copy of the repository · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Run once in every new copy (every chat, before its first commit): sh dev/setup.sh
#   1. switches on the check before every push (.githooks/pre-push, docs/CHECKS.md);
#   2. installs the browser the page check uses, when it is missing.
set -e
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/* 2>/dev/null || true
echo "Check before every push: on (.githooks/pre-push)."
if ! python3 -c "import playwright" 2>/dev/null; then
  pip install --quiet playwright 2>/dev/null || pip install --quiet --break-system-packages playwright
fi
python3 -m playwright install chromium >/dev/null 2>&1 && echo "Page check browser: ready." || echo "Page check browser: install by hand (python3 -m playwright install chromium)."
