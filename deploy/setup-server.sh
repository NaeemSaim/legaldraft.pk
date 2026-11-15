#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# LegalDraft.pk — one-time server setup for an Oracle Cloud Ubuntu VM.
#
# Run as the normal login user (ubuntu), NOT as root:
#     bash setup-server.sh
#
# Safe to run again: every step checks whether it is already done. Re-run it
# after changing the Caddyfile or the systemd units in deploy/.
#
# Layout it creates:
#   /opt/legaldraft            the code (git clone, owned by you)
#   /var/lib/legaldraft        customer data + uploads (owned by the service)
#   /etc/legaldraft/api.env    secrets and settings (root only)
#   /var/backups/legaldraft    nightly backup archives
# ---------------------------------------------------------------------------
set -euo pipefail

API_DOMAIN="${API_DOMAIN:-api.legaldraft.pk}"
REPO="${REPO:-git@github.com:NaeemSaim/legaldraft.pk.git}"
BRANCH="${BRANCH:-main}"

APP_DIR=/opt/legaldraft
DATA_DIR=/var/lib/legaldraft
ENV_DIR=/etc/legaldraft
ENV_FILE=$ENV_DIR/api.env
SERVICE_USER=legaldraft
NODE_MAJOR=24

say()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[1;31mXX  %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -ne 0 ] || die "Run this as your normal user (ubuntu), not as root. It uses sudo where needed."
command -v apt-get >/dev/null || die "This script expects Ubuntu."

# --- 1. System packages ------------------------------------------------------
say "Updating the system"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  git curl ca-certificates gnupg debian-keyring debian-archive-keyring \
  apt-transport-https iptables-persistent rclone unattended-upgrades

# Security updates install themselves.
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

# --- 2. Swap on small machines (npm needs headroom on the 1 GB AMD VM) -------
mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
if [ "$mem_kb" -lt 2000000 ] && ! swapon --show | grep -q .; then
  say "Adding 2 GB of swap (this machine has under 2 GB of RAM)"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# --- 3. Node.js --------------------------------------------------------------
current_major=$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || true)
if [ "${current_major:-0}" != "$NODE_MAJOR" ]; then
  say "Installing Node.js $NODE_MAJOR"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v

# --- 4. Caddy (reverse proxy with automatic HTTPS) ---------------------------
if ! command -v caddy >/dev/null; then
  say "Installing Caddy"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y caddy
fi

# --- 5. Firewall --------------------------------------------------------------
# Oracle's Ubuntu images ship iptables rules that reject everything except SSH,
# even after the ports are opened in the cloud console. Open 80 and 443 here
# too, above the catch-all REJECT rule. Port 3001 stays closed: only Caddy
# talks to the app.
say "Opening ports 80 and 443 in the VM firewall"
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp -m state --state NEW --dport "$port" -j ACCEPT 2>/dev/null; then
    reject_line=$(sudo iptables -L INPUT --line-numbers -n | awk '$2 == "REJECT" {print $1; exit}')
    if [ -n "$reject_line" ]; then
      sudo iptables -I INPUT "$reject_line" -p tcp -m state --state NEW --dport "$port" -j ACCEPT
    else
      sudo iptables -A INPUT -p tcp -m state --state NEW --dport "$port" -j ACCEPT
    fi
  fi
done
sudo netfilter-persistent save

# --- 6. Service user and data directory ---------------------------------------
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  say "Creating the '$SERVICE_USER' service user"
  sudo useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
fi
sudo mkdir -p "$DATA_DIR/uploads"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"
sudo chmod 700 "$DATA_DIR"

# --- 7. GitHub deploy key (read-only access to the repo) ----------------------
KEY="$HOME/.ssh/legaldraft_deploy"
mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
if [ ! -f "$KEY" ]; then
  say "Creating a deploy key for GitHub"
  ssh-keygen -t ed25519 -N '' -C "legaldraft-server" -f "$KEY" >/dev/null
fi
if ! grep -q 'legaldraft_deploy' "$HOME/.ssh/config" 2>/dev/null; then
  cat >>"$HOME/.ssh/config" <<EOF

Host github.com
  IdentityFile $KEY
  IdentitiesOnly yes
EOF
  chmod 600 "$HOME/.ssh/config"
fi
grep -q '^github.com ' "$HOME/.ssh/known_hosts" 2>/dev/null \
  || ssh-keyscan -t ed25519 github.com >>"$HOME/.ssh/known_hosts" 2>/dev/null

# ssh -T always exits 1 on GitHub, so judge by what it prints.
github_ok() {
  local out
  out=$(ssh -T git@github.com 2>&1 || true)
  [[ "$out" == *"successfully authenticated"* ]]
}
if ! github_ok; then
  echo
  echo "Add this key to GitHub: repo → Settings → Deploy keys → Add deploy key"
  echo "(leave 'Allow write access' UNTICKED):"
  echo
  cat "$KEY.pub"
  echo
  read -r -p "Press Enter once it is added... "
  github_ok || die "GitHub still refuses the key. Check it was added to the right repository."
fi

# --- 8. The code --------------------------------------------------------------
if [ ! -d "$APP_DIR/.git" ]; then
  say "Cloning the repository into $APP_DIR"
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER:$USER" "$APP_DIR"
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
fi
say "Installing backend dependencies"
(cd "$APP_DIR/backend" && npm ci --omit=dev)

# --- 9. Settings file ----------------------------------------------------------
sudo mkdir -p "$ENV_DIR"
sudo chmod 700 "$ENV_DIR"
if ! sudo test -f "$ENV_FILE"; then
  say "Creating $ENV_FILE"
  admin_token=$(openssl rand -hex 32)
  sed "s/__GENERATE_ME__/$admin_token/" "$APP_DIR/deploy/api.env.example" \
    | sudo tee "$ENV_FILE" >/dev/null
  sudo chmod 600 "$ENV_FILE"
  NEW_ENV=1
fi

# --- 10. systemd units ---------------------------------------------------------
say "Installing the systemd services"
sudo cp "$APP_DIR/deploy/legaldraft-api.service"    /etc/systemd/system/
sudo cp "$APP_DIR/deploy/legaldraft-backup.service" /etc/systemd/system/
sudo cp "$APP_DIR/deploy/legaldraft-backup.timer"   /etc/systemd/system/
sudo mkdir -p /var/backups/legaldraft
sudo chmod 700 /var/backups/legaldraft
sudo systemctl daemon-reload
sudo systemctl enable --now legaldraft-backup.timer
sudo systemctl enable legaldraft-api
sudo systemctl restart legaldraft-api

# --- 11. Caddy config -----------------------------------------------------------
say "Configuring Caddy for $API_DOMAIN"
sed "s/__API_DOMAIN__/$API_DOMAIN/" "$APP_DIR/deploy/Caddyfile" | sudo tee /etc/caddy/Caddyfile >/dev/null
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl enable caddy
sudo systemctl reload-or-restart caddy

# --- Done ----------------------------------------------------------------------
sleep 2
if curl -fsS http://127.0.0.1:3001/api/health >/dev/null; then
  say "The API is running locally."
else
  warn "The API did not answer. Check: sudo journalctl -u legaldraft-api -n 50"
fi

cat <<EOF

Next steps:
EOF
if [ "${NEW_ENV:-0}" = 1 ]; then
  cat <<EOF
  1. Fill in your keys (ADMIN_TOKEN has already been generated for you):
       sudo nano $ENV_FILE
     then restart:
       sudo systemctl restart legaldraft-api
EOF
else
  echo "  1. Settings are in $ENV_FILE (already existed, left unchanged)."
fi
cat <<EOF
  2. Check HTTPS from your own computer (needs the DNS record in place):
       curl https://$API_DOMAIN/api/health
  3. Set up the off-server backup copy (deploy/README.md, step 7).

Your admin token (for #/admin) is in $ENV_FILE:
  sudo grep ADMIN_TOKEN $ENV_FILE
EOF
