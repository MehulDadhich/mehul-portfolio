from __future__ import annotations

from ..config import Settings
from .base import MemoryStore


def create_memory(settings: Settings, firebase_app=None) -> MemoryStore:
    if settings.memory_backend == "local":
        from .local_store import LocalMemoryStore
        return LocalMemoryStore(settings.memory_dir)
    if settings.memory_backend == "firestore":
        from .firestore_store import FirestoreMemoryStore
        return FirestoreMemoryStore(firebase_app)
    raise ValueError(f"unknown MEMORY_BACKEND={settings.memory_backend!r} (use local or firestore)")


__all__ = ["MemoryStore", "create_memory"]
