from __future__ import annotations

from ..config import Settings
from .base import InferenceError, LLMBackend


def create_backend(settings: Settings) -> LLMBackend:
    if settings.inference == "local":
        from .local_backend import LocalBackend
        return LocalBackend(settings.local_url, settings.model_name)
    if settings.inference == "hosted":
        from .hosted_backend import HostedBackend
        return HostedBackend(settings.hosted_url, settings.model_name, settings.hosted_api_key)
    raise ValueError(f"unknown ARC_INFERENCE={settings.inference!r} (use local or hosted)")


__all__ = ["InferenceError", "LLMBackend", "create_backend"]
