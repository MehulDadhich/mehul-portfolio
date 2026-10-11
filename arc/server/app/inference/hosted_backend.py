"""
Production backend: Arc-3B on a remote inference server (GPU server, cloud GPU, inference provider…).

Any server that speaks the OpenAI-compatible chat API works (llama.cpp server, vLLM, TGI, Ollama). Switching from
local to hosted is configuration only: ARC_INFERENCE=hosted, ARC_HOSTED_URL and ARC_HOSTED_API_KEY.
"""

from __future__ import annotations

from .openai_compatible import OpenAICompatibleBackend


class HostedBackend(OpenAICompatibleBackend):
    def __init__(self, base_url: str, model: str, api_key: str):
        if not base_url:
            raise ValueError("ARC_INFERENCE=hosted needs ARC_HOSTED_URL")
        super().__init__(base_url, model=model, api_key=api_key, label=f"hosted · {model}")
