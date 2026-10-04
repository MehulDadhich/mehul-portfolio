#!/usr/bin/env bash
# One-shot setup for Arc's model server on an Oracle Cloud Always Free VM (Ubuntu, ARM A1 or x86).
#   bash <(curl -fsSL https://raw.githubusercontent.com/MehulDadhich/mehul-portfolio/main/arc-space/deploy/setup-oci.sh)
# Re-running it pulls the latest code and rebuilds.
set -euo pipefail

REPO_URL="https://github.com/MehulDadhich/mehul-portfolio.git"
APP_DIR="$HOME/mehul-portfolio"

echo "==> Arc setup"
if [[ -z "${ARC_API_KEY:-}" ]]; then
  read -rsp "Paste ARC_API_KEY (the same value you put in Vercel), then press Enter: " ARC_API_KEY
  echo
fi
[[ -n "$ARC_API_KEY" ]] || { echo "ARC_API_KEY is required"; exit 1; }

echo "==> Installing Docker (skipped if present)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo apt-get install -y git >/dev/null

echo "==> Opening ports 80 and 443 in the VM firewall"
# Oracle's Ubuntu images ship iptables rules that reject everything except SSH.
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp -m state --state NEW --dport "$port" -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 6 -p tcp -m state --state NEW --dport "$port" -j ACCEPT
  fi
done
if command -v netfilter-persistent >/dev/null 2>&1; then sudo netfilter-persistent save >/dev/null; fi

echo "==> Getting the code"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi

PUBLIC_IP="$(curl -fsS https://ifconfig.me || curl -fsS https://api.ipify.org)"
ARC_DOMAIN="${ARC_DOMAIN:-${PUBLIC_IP//./-}.sslip.io}"

cd "$APP_DIR/arc-space/deploy"
umask 077
cat > .env <<EOF
ARC_API_KEY=$ARC_API_KEY
ARC_DOMAIN=$ARC_DOMAIN
EOF

echo "==> Building and starting (the first build compiles llama.cpp and can take 10-20 minutes)"
sudo docker compose up -d --build

echo "==> Waiting for Arc to load its models"
for _ in $(seq 1 120); do
  if curl -fsS "https://$ARC_DOMAIN/health" 2>/dev/null | grep -q '"ready":true'; then
    echo
    echo "Arc is live:  https://$ARC_DOMAIN/health"
    echo "Set this in Vercel →  ARC_SPACE_URL=https://$ARC_DOMAIN"
    exit 0
  fi
  printf '.'
  sleep 10
done
echo
echo "Still starting. Check progress with:  sudo docker compose -f $APP_DIR/arc-space/deploy/docker-compose.yml logs -f arc"
echo "When ready, set in Vercel →  ARC_SPACE_URL=https://$ARC_DOMAIN"
