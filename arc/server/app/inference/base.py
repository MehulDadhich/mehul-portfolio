"""The interface every inference backend implements. The rest of Arc only ever talks to this."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator


class InferenceError(RuntimeError):
    """The model couldn't be reached or failed while generating."""

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status  # the model server's HTTP status, when it answered at all

    @property
    def busy(self) -> bool:
        """A hosted provider's rate limit (free plans allow only so many tokens a minute)."""
        return self.status == 429


class LLMBackend(ABC):
    #: shown in /health, e.g. "local · Llama-3.2-3B-Instruct"
    label: str

    @abstractmethod
    def stream(self, messages: list[dict], *, max_tokens: int, temperature: float) -> AsyncIterator[str]:
        """Yields the generated answer piece by piece."""

    @abstractmethod
    async def health(self) -> dict:
        """{"ok": bool, ...details}; never raises."""

    async def generate(self, messages: list[dict], *, max_tokens: int, temperature: float) -> str:
        return "".join([piece async for piece in self.stream(messages, max_tokens=max_tokens, temperature=temperature)])

    async def aclose(self) -> None:  # noqa: B027 - optional hook
        pass
