"""
Who is asking. Every request resolves to one user id that scopes all memory reads and writes.

- With Firebase (MEMORY_BACKEND=firestore): the browser signs in anonymously and sends its Firebase ID token;
  the uid comes from verifying that token, so a visitor can't claim someone else's id.
- Local development: the browser sends a random visitor id it keeps in localStorage.

Requests come through the portfolio's /api/arc proxy, which also sends the shared ARC_API_KEY.
"""

from __future__ import annotations

import hmac

from fastapi import HTTPException, Request

from .config import Settings
from .memory.base import ID


class Auth:
    def __init__(self, settings: Settings, firebase_app=None):
        self.settings = settings
        self.firebase_app = firebase_app

    def check_key(self, request: Request) -> None:
        key = self.settings.api_key
        if key and not hmac.compare_digest(request.headers.get("x-arc-key", ""), key):
            raise HTTPException(401, "invalid API key")

    def user_id(self, request: Request) -> str:
        self.check_key(request)
        if self.firebase_app is not None:
            from firebase_admin import auth

            token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
            if not token:
                raise HTTPException(401, "sign-in required")
            try:
                # a few seconds of clock difference with Google would otherwise reject brand-new tokens as "used too early"
                return auth.verify_id_token(token, app=self.firebase_app, clock_skew_seconds=10)["uid"]
            except Exception as e:  # expired, revoked, wrong project…
                raise HTTPException(401, "invalid sign-in token") from e
        visitor = request.headers.get("x-arc-visitor", "")
        if not ID.match(visitor):
            raise HTTPException(400, "missing visitor id")
        return f"local-{visitor}"


def init_firebase(settings: Settings):
    """The Firebase Admin app, or None when Firebase isn't enabled. Credentials stay on the server."""
    if not settings.firebase_enabled:
        return None
    import firebase_admin
    from firebase_admin import credentials

    if not (settings.firebase_project_id and settings.firebase_client_email and settings.firebase_private_key):
        raise RuntimeError("MEMORY_BACKEND=firestore needs FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY")
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": settings.firebase_project_id,
        "client_email": settings.firebase_client_email,
        "private_key": settings.firebase_private_key,
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    return firebase_admin.initialize_app(cred, {"projectId": settings.firebase_project_id}, name="arc")
