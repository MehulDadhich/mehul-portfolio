"""
Deploys Arc (model + API) to an Oracle Cloud Always Free VM over SSH.

    arc\\.venv\\Scripts\\python.exe arc\\deploy\\deploy.py <public IP> --key <path to the VM's private SSH key>

Re-run it after changing Arc's code or knowledge (`npm run arc:knowledge`): it uploads the current version and
restarts Arc; llama.cpp and the model are only built and downloaded the first time.

It uploads arc/server/app, arc/knowledge and arc/deploy/oracle, plus a settings file made from arc/.env (Firebase
credentials and DEPLOY_ARC_API_KEY, the shared secret with the portfolio, generated here on the first run).
No secret is printed. The site's address is https://<ip-with-dashes>.sslip.io (HTTPS by Let's Encrypt).
"""

from __future__ import annotations

import argparse
import io
import json
import secrets
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

from dotenv import dotenv_values

ARC = Path(__file__).resolve().parents[1]
ENV = ARC / ".env"

# what the VM's /opt/arc/.env sets beyond the secrets
SERVER_SETTINGS = {
    "ARC_INFERENCE": "local",
    "ARC_LOCAL_URL": "http://127.0.0.1:8081",
    "ARC_MODEL_NAME": "Llama-3.2-3B-Instruct",
    "MEMORY_BACKEND": "firestore",
    "FASTEMBED_CACHE_PATH": "/opt/arc/data/fastembed",
}


def shared_key(env: dict) -> str:
    """The secret the portfolio's /api/arc proxy sends; created once and kept in arc/.env."""
    if key := env.get("DEPLOY_ARC_API_KEY"):
        return key
    key = secrets.token_urlsafe(32)
    with ENV.open("a", encoding="utf-8") as f:
        f.write(f"\n# Shared secret between the deployed Arc API and the portfolio (Vercel: ARC_API_KEY)\nDEPLOY_ARC_API_KEY={key}\n")
    return key


def server_env(env: dict) -> str:
    values = {
        **SERVER_SETTINGS,
        "ARC_API_KEY": shared_key(env),
        "FIREBASE_PROJECT_ID": env["FIREBASE_PROJECT_ID"],
        "FIREBASE_CLIENT_EMAIL": env["FIREBASE_CLIENT_EMAIL"],
        "FIREBASE_PRIVATE_KEY": env["FIREBASE_PRIVATE_KEY"],
    }
    # double-quoted with JSON escapes, which python-dotenv reads back exactly (the private key keeps its line breaks)
    return "".join(f"{k}={json.dumps(v)}\n" for k, v in values.items())


def bundle(path: Path, env_text: str) -> None:
    def add(tar: tarfile.TarFile, name: str, data: bytes, mode: int = 0o644) -> None:
        info = tarfile.TarInfo(name)
        info.size, info.mode = len(data), mode
        tar.addfile(info, io.BytesIO(data))

    with tarfile.open(path, "w:gz") as tar:
        for folder in ("server/app", "knowledge", "deploy/oracle"):
            for f in sorted((ARC / folder).rglob("*")):
                if f.is_file() and "__pycache__" not in f.parts:
                    data = f.read_bytes()
                    if folder == "deploy/oracle":
                        data = data.replace(b"\r\n", b"\n")  # Windows line endings break bash and systemd
                    add(tar, f"arc/{f.relative_to(ARC).as_posix()}", data, 0o755 if f.suffix == ".sh" else 0o644)
        add(tar, "arc/server/requirements.txt", (ARC / "server" / "requirements.txt").read_bytes())
        add(tar, "arc/arc.env", env_text.encode(), 0o600)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("ip", help="the VM's public IP address")
    parser.add_argument("--key", required=True, help="the VM's private SSH key file")
    parser.add_argument("--user", default="ubuntu")
    args = parser.parse_args()

    env = dotenv_values(ENV)
    missing = [k for k in ("FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY") if not env.get(k)]
    if missing:
        sys.exit(f"Add {', '.join(missing)} to arc/.env first.")
    ssh_opts = ["-i", args.key, "-o", "StrictHostKeyChecking=accept-new"]
    target = f"{args.user}@{args.ip}"
    domain = f"{args.ip.replace('.', '-')}.sslip.io"

    with tempfile.TemporaryDirectory() as tmp:
        archive = Path(tmp) / "arc.tar.gz"
        bundle(archive, server_env(env))
        print(f"Uploading Arc to {args.ip}...")
        subprocess.run([shutil.which("scp") or "scp", *ssh_opts, str(archive), f"{target}:arc.tar.gz"], check=True)
    remote = (f"rm -rf ~/arc-bundle && mkdir ~/arc-bundle && tar -xzf ~/arc.tar.gz -C ~/arc-bundle && rm ~/arc.tar.gz"
              f" && sudo ARC_DOMAIN={domain} bash ~/arc-bundle/arc/deploy/oracle/setup.sh; status=$?; rm -rf ~/arc-bundle; exit $status")
    print("Setting up (the first run builds llama.cpp and downloads the model: 15-20 minutes)...")
    done = subprocess.run([shutil.which("ssh") or "ssh", *ssh_opts, target, remote])
    if done.returncode:
        sys.exit("Setup failed; see the messages above.")
    print(f"\nVercel: ARC_API_URL = https://{domain}")
    print("Vercel: ARC_API_KEY = DEPLOY_ARC_API_KEY from arc/.env")


if __name__ == "__main__":
    main()
