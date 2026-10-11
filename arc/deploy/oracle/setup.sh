#!/usr/bin/env bash
# Installs or updates Arc on an Oracle Cloud Always Free VM (Ubuntu 24.04, Ampere A1 ARM). Run as root by
# arc/deploy/deploy.py, from the unpacked bundle it uploads. Safe to re-run: only what changed is rebuilt.
#
#   /opt/arc/llama        llama.cpp's server, built for this CPU     → arc-llama.service (127.0.0.1:8081)
#   /opt/arc/models       Llama 3.2 3B Instruct (Q4_0: fastest on ARM)
#   /opt/arc/server       the Arc API                                 → arc-api.service   (127.0.0.1:8000)
#   /opt/arc/.env         settings and secrets (from deploy.py)
#   Caddy                 HTTPS on https://$ARC_DOMAIN, proxying to the Arc API
set -euo pipefail

: "${ARC_DOMAIN:?ARC_DOMAIN is required}"
BUNDLE="$(cd "$(dirname "$0")/../.." && pwd)"
ARC=/opt/arc
LLAMA_TAG=b11462  # the llama.cpp release Arc is tested with locally
MODEL=Llama-3.2-3B-Instruct-Q4_0.gguf
export DEBIAN_FRONTEND=noninteractive

echo "==> Packages"
apt-get update -qq
apt-get install -y -qq build-essential cmake git curl python3-venv caddy >/dev/null

# Oracle's Ubuntu images reject everything but SSH in iptables (on top of the VCN security list);
# other clouds (Azure, …) leave the VM firewall open and filter in their network settings only
if iptables -S INPUT | grep -q -- "-j REJECT"; then
  echo "==> Firewall: ports 80 and 443"
  for port in 80 443; do
    iptables -C INPUT -p tcp -m state --state NEW --dport "$port" -j ACCEPT 2>/dev/null ||
      iptables -I INPUT 1 -p tcp -m state --state NEW --dport "$port" -j ACCEPT
  done
  if command -v netfilter-persistent >/dev/null; then netfilter-persistent save >/dev/null; fi
fi

id arc >/dev/null 2>&1 || useradd --system --home-dir "$ARC" --shell /usr/sbin/nologin arc
mkdir -p "$ARC"/{llama,models,data}

if [[ "$(cat "$ARC/llama/TAG" 2>/dev/null)" != "$LLAMA_TAG" ]]; then
  echo "==> Building llama.cpp $LLAMA_TAG for this CPU (about 5-10 minutes)"
  rm -rf /tmp/llama.cpp
  git clone -q --depth 1 --branch "$LLAMA_TAG" https://github.com/ggml-org/llama.cpp /tmp/llama.cpp
  cmake -S /tmp/llama.cpp -B /tmp/llama.cpp/build -DCMAKE_BUILD_TYPE=Release -DGGML_NATIVE=ON \
    -DBUILD_SHARED_LIBS=OFF -DLLAMA_CURL=OFF -DLLAMA_BUILD_TESTS=OFF >/dev/null
  cmake --build /tmp/llama.cpp/build -j"$(nproc)" --target llama-server >/dev/null
  install -m 755 /tmp/llama.cpp/build/bin/llama-server "$ARC/llama/llama-server"
  echo "$LLAMA_TAG" > "$ARC/llama/TAG"
  rm -rf /tmp/llama.cpp
fi

if [[ ! -s "$ARC/models/$MODEL" ]]; then
  echo "==> Downloading the model (~1.9 GB)"
  curl -fL -C - --retry 5 -o "$ARC/models/$MODEL.part" \
    "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/$MODEL"
  mv "$ARC/models/$MODEL.part" "$ARC/models/$MODEL"
fi

echo "==> Arc API"
rm -rf "$ARC/server/app" "$ARC/knowledge"
mkdir -p "$ARC/server"
cp -r "$BUNDLE/server/app" "$BUNDLE/server/requirements.txt" "$ARC/server/"
cp -r "$BUNDLE/knowledge" "$ARC/knowledge"
install -m 600 "$BUNDLE/arc.env" "$ARC/.env"
[[ -x "$ARC/.venv/bin/python" ]] || python3 -m venv "$ARC/.venv"
"$ARC/.venv/bin/pip" install -q --upgrade pip
"$ARC/.venv/bin/pip" install -q -r "$ARC/server/requirements.txt"
chown -R arc:arc "$ARC"

sed "s|@MODEL@|$ARC/models/$MODEL|" "$BUNDLE/deploy/oracle/arc-llama.service" > /etc/systemd/system/arc-llama.service
cp "$BUNDLE/deploy/oracle/arc-api.service" /etc/systemd/system/arc-api.service
sed "s|@DOMAIN@|$ARC_DOMAIN|" "$BUNDLE/deploy/oracle/Caddyfile" > /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable -q arc-llama arc-api caddy
systemctl restart arc-llama arc-api
systemctl reload caddy || systemctl restart caddy

echo "==> Waiting for Arc (first start downloads the search model)"
for _ in $(seq 1 60); do
  if curl -fsS "https://$ARC_DOMAIN/health" 2>/dev/null | grep -q '"ok":true'; then
    echo "Arc is live: https://$ARC_DOMAIN"
    exit 0
  fi
  sleep 5
done
echo "Arc hasn't answered yet. Logs: journalctl -u arc-api -u arc-llama -u caddy -n 50" >&2
exit 1
