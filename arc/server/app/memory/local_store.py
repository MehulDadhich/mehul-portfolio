"""Development memory: one JSON file per visitor in arc/data/memory/, with the same layout as Firestore."""

from __future__ import annotations

import asyncio
import json
import shutil
import time
from pathlib import Path

from .base import MAX_NOTES, MemoryStore, check_id


class LocalMemoryStore(MemoryStore):
    label = "local files"

    def __init__(self, directory: Path):
        self.dir = directory
        self.dir.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    def _path(self, uid: str) -> Path:
        return self.dir / f"{check_id(uid, 'user id')}.json"

    def _read(self, uid: str) -> dict:
        path = self._path(uid)
        if not path.exists():
            return {"conversations": {}, "memories": []}
        return json.loads(path.read_text(encoding="utf-8"))

    def _write(self, uid: str, data: dict) -> None:
        path = self._path(uid)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(path)  # atomic, so a crash never leaves half a file

    async def history(self, uid: str, conversation_id: str, limit: int = 20) -> list[dict]:
        check_id(conversation_id, "conversation id")
        data = await asyncio.to_thread(self._read, uid)
        messages = data["conversations"].get(conversation_id, {}).get("messages", [])
        return [{"role": m["role"], "content": m["content"]} for m in messages[-limit:]]

    async def append(self, uid: str, conversation_id: str, messages: list[dict]) -> None:
        check_id(conversation_id, "conversation id")
        async with self._lock:
            data = await asyncio.to_thread(self._read, uid)
            conv = data["conversations"].setdefault(conversation_id, {"createdAt": time.time(), "messages": []})
            conv["messages"] += [{**m, "createdAt": time.time()} for m in messages]
            conv["updatedAt"] = time.time()
            await asyncio.to_thread(self._write, uid, data)

    async def notes(self, uid: str) -> list[str]:
        data = await asyncio.to_thread(self._read, uid)
        return [m["content"] for m in data["memories"]]  # stored newest first

    async def add_note(self, uid: str, note: str) -> None:
        async with self._lock:
            data = await asyncio.to_thread(self._read, uid)
            if any(m["content"].lower() == note.lower() for m in data["memories"]):
                return
            # newest first by position: on Windows, notes saved moments apart can share a timestamp
            data["memories"] = [{"content": note, "type": "visitor", "createdAt": time.time()}, *data["memories"]][:MAX_NOTES]
            await asyncio.to_thread(self._write, uid, data)

    async def forget(self, uid: str) -> None:
        async with self._lock:
            await asyncio.to_thread(lambda: self._path(uid).unlink(missing_ok=True))

    def clear_all(self) -> None:  # tests only
        shutil.rmtree(self.dir, ignore_errors=True)
        self.dir.mkdir(parents=True, exist_ok=True)
