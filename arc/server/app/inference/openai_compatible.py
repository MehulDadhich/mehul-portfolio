"""
Streaming client for the OpenAI-compatible chat API (POST /v1/chat/completions with "stream": true).

llama.cpp's server, vLLM, TGI, Ollama and most hosted inference services speak this protocol, which is why both
the local and the hosted backend are built on it. It is a wire format only: no third-party AI service is involved.
"""

from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

import httpx

from .base import InferenceError, LLMBackend

# hosted free plans limit tokens per minute; a wait this short is worth it rather than telling the visitor to retry
MAX_RETRY_WAIT = 6.0


def retry_wait(res: httpx.Response) -> float | None:
    """Seconds a rate-limited (429) response asks us to wait, if it says."""
    try:
        return float(res.headers.get("retry-after", ""))
    except ValueError:
        return None


class OpenAICompatibleBackend(LLMBackend):
    def __init__(self, base_url: str, *, model: str, api_key: str = "", label: str, timeout: float = 120):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.label = label
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        # connect fast, but allow a long gap between tokens while a cold model loads
        self.client = httpx.AsyncClient(headers=headers, timeout=httpx.Timeout(timeout, connect=5))

    def _payload(self, messages: list[dict], max_tokens: int, temperature: float) -> dict:
        return {"model": self.model, "messages": messages, "stream": True, "max_tokens": max_tokens,
                "temperature": temperature, "top_p": 0.9}

    async def stream(self, messages: list[dict], *, max_tokens: int, temperature: float) -> AsyncIterator[str]:
        url = f"{self.base_url}/v1/chat/completions"
        try:
            for attempt in range(2):
                async with self.client.stream("POST", url, json=self._payload(messages, max_tokens, temperature)) as res:
                    if res.status_code == 429 and attempt == 0 and (wait := retry_wait(res)) is not None and wait <= MAX_RETRY_WAIT:
                        await asyncio.sleep(wait)
                        continue
                    if res.status_code != 200:
                        body = (await res.aread()).decode(errors="replace")[:300]
                        raise InferenceError(f"model server returned {res.status_code}: {body}", res.status_code)
                    async for piece in self._pieces(res):
                        yield piece
                    return
        except httpx.HTTPError as e:
            raise InferenceError(f"can't reach the model server at {self.base_url} ({type(e).__name__})") from e

    @staticmethod
    async def _pieces(res: httpx.Response) -> AsyncIterator[str]:
        async for line in res.aiter_lines():
            if not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                return
            choice = (json.loads(data).get("choices") or [{}])[0]
            piece = (choice.get("delta") or {}).get("content")
            if piece:
                yield piece

    async def health(self) -> dict:
        try:
            res = await self.client.get(f"{self.base_url}/v1/models", timeout=5)
            return {"ok": res.status_code == 200, "status": res.status_code}
        except httpx.HTTPError as e:
            return {"ok": False, "error": type(e).__name__}

    async def aclose(self) -> None:
        await self.client.aclose()
