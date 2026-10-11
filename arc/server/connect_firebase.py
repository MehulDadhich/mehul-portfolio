r"""
Connects Arc to a Firebase project: writes the server credentials to arc/.env and the web config to the portfolio's
.env.local, then checks that the credentials work. The private key is copied, never printed.

    arc\.venv\Scripts\python arc\server\connect_firebase.py --service-account <key.json> \
        --api-key <apiKey> --auth-domain <authDomain> --app-id <appId>
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ARC = Path(__file__).resolve().parents[1]
PORTFOLIO = ARC.parent


def set_vars(path: Path, values: dict[str, str]) -> None:
    """Sets KEY=value lines in an env file, replacing existing ones and keeping everything else."""
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    lines = [l for l in lines if not re.match(rf"^({'|'.join(values)})=", l)]
    lines += [f"{k}={v}" for k, v in values.items()]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--service-account", required=True, help="the JSON key from Project settings → Service accounts")
    ap.add_argument("--api-key", required=True)
    ap.add_argument("--auth-domain", required=True)
    ap.add_argument("--app-id", required=True)
    args = ap.parse_args()

    sa = json.loads(Path(args.service_account).read_text(encoding="utf-8"))
    if sa.get("type") != "service_account":
        sys.exit("that file isn't a service account key")
    project = sa["project_id"]

    env = ARC / ".env"
    if not env.exists():
        env.write_text((ARC / ".env.example").read_text(encoding="utf-8"), encoding="utf-8")
    set_vars(env, {
        "MEMORY_BACKEND": "firestore",
        "FIREBASE_PROJECT_ID": project,
        "FIREBASE_CLIENT_EMAIL": sa["client_email"],
        # one line, quoted; config.py turns the \n escapes back into newlines
        "FIREBASE_PRIVATE_KEY": '"' + sa["private_key"].replace("\n", "\\n") + '"',
    })
    set_vars(PORTFOLIO / ".env.local", {
        "NEXT_PUBLIC_FIREBASE_API_KEY": args.api_key,
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": args.auth_domain,
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID": project,
        "NEXT_PUBLIC_FIREBASE_APP_ID": args.app_id,
    })
    print(f"wrote arc/.env (server) and .env.local (web) for project {project}")

    # check the server credentials against Firestore
    import firebase_admin
    from firebase_admin import credentials, firestore

    app = firebase_admin.initialize_app(credentials.Certificate(sa), name="check")
    db = firestore.client(app)
    ref = db.collection("_arc_check").document("ping")
    ref.set({"ok": True})
    ref.delete()
    print("Firestore: server credentials work (wrote and deleted a test document)")


if __name__ == "__main__":
    main()
