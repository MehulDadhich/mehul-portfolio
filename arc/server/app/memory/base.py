"""
Arc's memory interface.

Short-term memory is the conversation itself (users/{uid}/conversations/{cid}/messages). Long-term memory is a few
short notes about the visitor (users/{uid}/memories), e.g. "The visitor is a recruiter at Acme", never raw messages.
Every method is scoped to one user id, so one visitor can never read another's memory.
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod

ID = re.compile(r"^[A-Za-z0-9_-]{6,128}$")
MAX_NOTES = 8


def check_id(value: str, what: str) -> str:
    if not ID.match(value or ""):
        raise ValueError(f"invalid {what}")
    return value


class MemoryStore(ABC):
    label: str

    @abstractmethod
    async def history(self, uid: str, conversation_id: str, limit: int = 20) -> list[dict]:
        """The conversation's latest messages, oldest first: [{"role": "user"|"assistant", "content": ...}]."""

    @abstractmethod
    async def append(self, uid: str, conversation_id: str, messages: list[dict]) -> None: ...

    @abstractmethod
    async def notes(self, uid: str) -> list[str]:
        """Long-term notes about this visitor, newest first."""

    @abstractmethod
    async def add_note(self, uid: str, note: str) -> None:
        """Stores a note unless it's already known; keeps at most MAX_NOTES."""

    @abstractmethod
    async def forget(self, uid: str) -> None:
        """Deletes everything stored for this visitor."""
