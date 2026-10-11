"""Development backend: Arc-3B served by llama.cpp's server on this machine (started by arc/run.ps1)."""

from __future__ import annotations

import httpx

from .openai_compatible import OpenAICompatibleBackend


class LocalBackend(OpenAICompatibleBackend):
    def __init__(self, base_url: str, model: str):
        super().__init__(base_url, model=model, label=f"local · {model}")

    def _payload(self, messages: list[dict], max_tokens: int, temperature: float) -> dict:
        # llama.cpp extension: discourage the loops small models fall into
        return {**super()._payload(messages, max_tokens, temperature), "repeat_penalty": 1.1}

    async def health(self) -> dict:
        # llama.cpp's /health is 503 while the model is still loading
        try:
            res = await self.client.get(f"{self.base_url}/health", timeout=5)
            status = res.json().get("status", res.status_code) if res.headers.get("content-type", "").startswith("application/json") else res.status_code
            return {"ok": res.status_code == 200, "status": status}
        except httpx.HTTPError as e:
            return {"ok": False, "error": f"llama.cpp server not running at {self.base_url} ({type(e).__name__})"}
