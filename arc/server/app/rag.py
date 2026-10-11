"""
Hybrid retrieval over the knowledge base: BM25 keyword scores plus dense embedding similarity.

Retrieval only selects facts for the prompt; it never produces the answer.
"""

from __future__ import annotations

import re
import threading
from dataclasses import dataclass
from typing import Protocol, Sequence

import numpy as np
from rank_bm25 import BM25Okapi

from .knowledge import Chunk

TOKEN = re.compile(r"[a-z0-9]+(?:[.+#][a-z0-9]+)*")
STOP = set(
    "a an the is are was were be been am i me my you your it its this that these those of to in on for with at by from as "
    "and or but if so do does did have has had can could would should will what which who whom how why when where tell "
    "please about mehul dadhich he his him there their them they any some".split()
)
DENSE_WEIGHT = 0.6  # the rest goes to BM25
ENTITY_BOOST = 0.12  # for chunks about the project the question is about


def stem(word: str) -> str:
    """A light suffix stripper so "graduated", "graduate" and "graduation" match, and "studied" matches "study"."""
    if len(word) <= 3 or not word.isalpha():
        return word
    if word.endswith(("ies", "ied")):
        word = word[:-3] + "y"
    elif word.endswith("ation"):
        word = word[:-5] + "at"
    elif word.endswith("ing") and len(word) > 5:
        word = word[:-3]
    elif word.endswith("ed") and len(word) > 4:
        word = word[:-2]
    elif word.endswith("ed"):  # "used" → "use"
        word = word[:-1]
    elif word.endswith(("sses", "xes", "ches", "shes", "zes")):  # true "-es" plurals: "classes" → "class"
        word = word[:-2]
    elif word.endswith("s") and not word.endswith("ss"):
        word = word[:-1]
    if word.endswith("e") and len(word) > 4:
        word = word[:-1]
    return word


def tokenize(text: str) -> list[str]:
    return [stem(t) for t in TOKEN.findall(text.lower()) if t not in STOP]


class Embedder(Protocol):
    def embed(self, texts: Sequence[str]): ...
    def query_embed(self, query: str): ...


@dataclass(frozen=True)
class Hit:
    chunk: Chunk
    score: float
    dense: float
    sparse: float


@dataclass(frozen=True)
class _Index:
    chunks: list[Chunk]
    bm25: BM25Okapi
    vectors: np.ndarray


def _unit(m: np.ndarray) -> np.ndarray:
    return m / (np.linalg.norm(m, axis=-1, keepdims=True) + 1e-9)


def detect_project(text: str, aliases: dict[str, list[str]]) -> str | None:
    """The one project a text names ("the accident detection system" → roadguard); None for zero or several."""
    lowered = text.lower()
    found = {project for project, names in aliases.items()
             if any(re.search(rf"\b{re.escape(n)}\b", lowered) for n in names)}
    return found.pop() if len(found) == 1 else None


class HybridRetriever:
    def __init__(self, embedder: Embedder):
        self.embedder = embedder
        self._index: _Index | None = None
        self._lock = threading.Lock()

    def index(self, chunks: list[Chunk]) -> None:
        # title and keywords are repeated so they weigh more than incidental words in the text
        corpus = [tokenize(f"{c.title} {c.title} {' '.join(c.keys)} {c.text}") for c in chunks]
        vectors = _unit(np.array(list(self.embedder.embed([f"{c.title}. {c.text}" for c in chunks])), dtype=np.float32))
        built = _Index(chunks, BM25Okapi(corpus), vectors)
        with self._lock:  # swap the whole index at once so a search never sees half of it
            self._index = built

    @property
    def size(self) -> int:
        return len(self._index.chunks) if self._index else 0

    def search(self, query: str, k: int = 5, min_score: float = 0.3, *, project: str | None = None,
               include: tuple[str, ...] = ()) -> list[Hit]:
        """
        project: the question is about this project, so other projects' chunks are left out (a small model
                 otherwise blends their facts) and this one's are preferred.
        include: document ids that must be in the result (e.g. the profile for "who is he?").
        """
        index = self._index
        if index is None:
            raise RuntimeError("the knowledge base isn't indexed yet")
        q = _unit(np.array(list(self.embedder.query_embed(query))[0], dtype=np.float32))
        dense = index.vectors @ q
        sparse = np.array(index.bm25.get_scores(tokenize(query)), dtype=np.float32)
        if sparse.max() > 0:
            sparse = sparse / sparse.max()
        score = DENSE_WEIGHT * dense + (1 - DENSE_WEIGHT) * sparse
        ranked = score.copy()
        if project:
            entities = np.array([c.entity or "" for c in index.chunks])
            ranked[(entities != "") & (entities != project)] = -np.inf
            ranked[entities == project] += ENTITY_BOOST
        order = [int(i) for i in np.argsort(-ranked)[:k] if np.isfinite(ranked[i])]
        # drop weak hits, and hits far below the best one (they are usually off-topic filler)
        floor = max(min_score, float(ranked[order[0]]) - 0.25) if order else min_score
        picked = [i for i in order if ranked[i] >= floor]
        for doc_id in include:
            if not any(index.chunks[i].doc_id == doc_id for i in picked):
                picked[:0] = [i for i, c in enumerate(index.chunks) if c.doc_id == doc_id][:1]
        return [Hit(index.chunks[i], float(score[i]), float(dense[i]), float(sparse[i])) for i in picked[:k]]
