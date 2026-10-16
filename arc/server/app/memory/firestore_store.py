"""
Firebase memory (Cloud Firestore), written only by this server through the Admin SDK.

    users/{uid}/conversations/{conversationId}                 {createdAt, updatedAt}
    users/{uid}/conversations/{conversationId}/messages/{id}   {role, content, createdAt}
    users/{uid}/memories/{id}                                  {content, type, createdAt}

The uid is the visitor's Firebase Auth id (anonymous sign-in), verified by app/auth.py.
"""

from __future__ import annotations

import asyncio
import time

from .base import MAX_NOTES, MemoryStore, check_id


class FirestoreMemoryStore(MemoryStore):
    label = "firestore"

    def __init__(self, app):
        from firebase_admin import firestore

        self.fs = firestore
        self.db = firestore.client(app)

    def _user(self, uid: str):
        return self.db.collection("users").document(check_id(uid, "user id"))

    def _conv(self, uid: str, conversation_id: str):
        return self._user(uid).collection("conversations").document(check_id(conversation_id, "conversation id"))

    async def history(self, uid: str, conversation_id: str, limit: int = 20) -> list[dict]:
        def read():
            q = (self._conv(uid, conversation_id).collection("messages")
                 .order_by("createdAt", direction=self.fs.Query.DESCENDING).limit(limit))
            docs = [d.to_dict() for d in q.stream()]  # to_dict: a snapshot's .get() raises on a missing field
            return [{"role": d.get("role"), "content": d.get("content"), **({"offer": d["offer"]} if d.get("offer") else {})}
                    for d in docs][::-1]
        return await asyncio.to_thread(read)

    async def append(self, uid: str, conversation_id: str, messages: list[dict]) -> None:
        def write():
            conv = self._conv(uid, conversation_id)
            batch = self.db.batch()
            batch.set(conv, {"updatedAt": self.fs.SERVER_TIMESTAMP}, merge=True)
            now = time.time()
            for i, m in enumerate(messages):
                # a server timestamp is identical for the whole batch; this keeps the question before its answer
                batch.set(conv.collection("messages").document(), {
                    "role": m["role"], "content": m["content"], "createdAt": now + i / 1000,
                    **({"offer": m["offer"]} if m.get("offer") else {})})
            batch.commit()
        await asyncio.to_thread(write)

    async def notes(self, uid: str) -> list[str]:
        def read():
            q = (self._user(uid).collection("memories")
                 .order_by("createdAt", direction=self.fs.Query.DESCENDING).limit(MAX_NOTES))
            return [d.get("content") for d in q.stream()]
        return await asyncio.to_thread(read)

    async def add_note(self, uid: str, note: str) -> None:
        def write():
            memories = self._user(uid).collection("memories")
            existing = list(memories.order_by("createdAt", direction=self.fs.Query.DESCENDING).stream())
            if any((d.get("content") or "").lower() == note.lower() for d in existing):
                return
            memories.add({"content": note, "type": "visitor", "createdAt": self.fs.SERVER_TIMESTAMP})
            for old in existing[MAX_NOTES - 1:]:
                old.reference.delete()
        await asyncio.to_thread(write)

    async def forget(self, uid: str) -> None:
        await asyncio.to_thread(lambda: self.db.recursive_delete(self._user(uid)))
