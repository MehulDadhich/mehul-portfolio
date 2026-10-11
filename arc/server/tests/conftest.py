"""Test doubles: a deterministic embedder and a scripted model, so tests run without downloads or a GPU."""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
import pytest

from app.inference.base import InferenceError, LLMBackend
from app.knowledge import load_knowledge, load_project_aliases
from app.rag import HybridRetriever, tokenize

KNOWLEDGE = Path(__file__).resolve().parents[2] / "knowledge"


class HashEmbedder:
    """Bag-of-stemmed-words vectors: crude, but similar texts get similar vectors."""

    def _vec(self, text: str) -> np.ndarray:
        v = np.zeros(256, dtype=np.float32)
        for t in tokenize(text):
            v[int(hashlib.md5(t.encode()).hexdigest(), 16) % 256] += 1
        return v

    def embed(self, texts):
        return [self._vec(t) for t in texts]

    def query_embed(self, query):
        return [self._vec(query)]


class ScriptedLLM(LLMBackend):
    label = "scripted"

    def __init__(self, reply: str = "Mehul built RoadGuard.", fail: bool = False, status: int | None = None):
        self.reply, self.fail, self.status, self.calls = reply, fail, status, []

    async def stream(self, messages, *, max_tokens, temperature):
        self.calls.append(messages)
        if self.fail:
            raise InferenceError("down", self.status)
        for word in self.reply.split(" "):
            yield word + " "

    async def health(self):
        return {"ok": not self.fail}


@pytest.fixture(scope="session")
def chunks():
    return load_knowledge(KNOWLEDGE)


@pytest.fixture(scope="session")
def projects():
    return load_project_aliases(KNOWLEDGE)


@pytest.fixture(scope="session")
def retriever(chunks):
    r = HybridRetriever(HashEmbedder())
    r.index(chunks)
    return r
