"""Arc's settings, read from environment variables (and arc/.env when present). See arc/.env.example."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

ARC_DIR = Path(__file__).resolve().parents[2]  # arc/
load_dotenv(ARC_DIR / ".env")


def _env(name: str, default: str) -> str:
    return os.getenv(name, default).strip()


@dataclass(frozen=True)
class Settings:
    name: str = field(default_factory=lambda: _env("ARC_NAME", "Arc"))

    # inference: "local" (llama.cpp server on this machine) or "hosted" (any OpenAI-compatible server)
    inference: str = field(default_factory=lambda: _env("ARC_INFERENCE", "local"))
    local_url: str = field(default_factory=lambda: _env("ARC_LOCAL_URL", "http://127.0.0.1:8081"))
    hosted_url: str = field(default_factory=lambda: _env("ARC_HOSTED_URL", ""))
    hosted_api_key: str = field(default_factory=lambda: _env("ARC_HOSTED_API_KEY", ""))
    model_name: str = field(default_factory=lambda: _env("ARC_MODEL_NAME", "Llama-3.2-3B-Instruct"))
    max_answer_tokens: int = field(default_factory=lambda: int(_env("ARC_MAX_ANSWER_TOKENS", "450")))
    temperature: float = field(default_factory=lambda: float(_env("ARC_TEMPERATURE", "0.2")))

    # retrieval
    knowledge_dir: Path = field(default_factory=lambda: Path(_env("ARC_KNOWLEDGE_DIR", str(ARC_DIR / "knowledge"))))
    embedding_model: str = field(default_factory=lambda: _env("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5"))
    top_k: int = field(default_factory=lambda: int(_env("RAG_TOP_K", "5")))
    min_score: float = field(default_factory=lambda: float(_env("RAG_MIN_SCORE", "0.3")))

    # prompt budget in tokens (the model's context is larger; this keeps answers fast)
    context_tokens: int = field(default_factory=lambda: int(_env("ARC_CONTEXT_TOKENS", "3000")))

    # memory: "local" (JSON files in arc/data/memory) or "firestore" (Firebase)
    memory_backend: str = field(default_factory=lambda: _env("MEMORY_BACKEND", "local"))
    memory_dir: Path = field(default_factory=lambda: Path(_env("ARC_MEMORY_DIR", str(ARC_DIR / "data" / "memory"))))
    firebase_project_id: str = field(default_factory=lambda: _env("FIREBASE_PROJECT_ID", ""))
    firebase_client_email: str = field(default_factory=lambda: _env("FIREBASE_CLIENT_EMAIL", ""))
    firebase_private_key: str = field(default_factory=lambda: _env("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"))

    # shared secret with the portfolio's /api/arc proxy; empty means open (local development only)
    api_key: str = field(default_factory=lambda: _env("ARC_API_KEY", ""))

    @property
    def firebase_enabled(self) -> bool:
        return self.memory_backend == "firestore"


settings = Settings()
