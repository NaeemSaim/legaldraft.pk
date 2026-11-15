#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Deploy the latest code from GitHub. Run on the server as ubuntu:
#     /opt/legaldraft/deploy/update.sh
#
# Takes a backup first, pulls, reinstalls dependencies, restarts, and checks
# the API answers. If you changed the Caddyfile or the systemd units, run
# deploy/setup-server.sh again instead.
# ---------------------------------------------------------------------------
set -euo pipefail

APP_DIR=/opt/legaldraft
BRANCH="${BRANCH:-main}"

echo "==> Backing up before the update"
sudo systemctl start legaldraft-backup

echo "==> Pulling $BRANCH"
cd "$APP_DIR"
git fetch origin "$BRANCH"
git merge --ff-only "origin/$BRANCH"
git log -1 --format='    now at %h %s'

echo "==> Installing dependencies"
(cd backend && npm ci --omit=dev)

echo "==> Restarting"
sudo systemctl restart legaldraft-api

for _ in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:3001/api/health >/dev/null 2>&1; then
    echo "==> Up and healthy."
    exit 0
  fi
  sleep 1
done
echo "!! The API did not come back. Last log lines:" >&2
sudo journalctl -u legaldraft-api -n 30 --no-pager >&2
exit 1
