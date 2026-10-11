"""
One chat turn, end to end:

    load the conversation  →  load what Arc remembers about the visitor  →  hybrid retrieval
    →  build the prompt within the token budget  →  Arc-3B streams a new answer
    →  save both messages  →  remember anything worth keeping about the visitor
"""

from __future__ import annotations

import asyncio
import logging
import time
from itertools import zip_longest
from typing import AsyncIterator

from .config import Settings
from .inference import InferenceError, LLMBackend
from .memory import MemoryStore
from .memory.extract import visitor_notes
from .prompt import (ABOUT_MEHUL, GREETING_ONLY, GREETING_TASK, HOW_ARE_YOU, HOW_ARE_YOU_TASK, SMALL_TALK, build_prompt,
                     query_follows_up, retrieval_query)
from .rag import Hit, HybridRetriever, detect_project
from .tools import decide

log = logging.getLogger("arc")
HISTORY_LIMIT = 16  # messages loaded per turn; the token budget decides how many are actually sent
LINK_SCORE = 0.55  # suggest a "see section" link only for confident matches


class ArcService:
    def __init__(self, settings: Settings, retriever: HybridRetriever, llm: LLMBackend, memory: MemoryStore,
                 projects: dict[str, list[str]] | None = None, links: dict | None = None):
        self.settings = settings
        self.projects = projects or {}
        self.links = links or {}
        self.retriever = retriever
        self.llm = llm
        self.memory = memory

    def focus(self, question: str, history: list[dict]) -> str | None:
        """The project being discussed: named in the question, or (for "it", "that"…) in the last question."""
        if project := detect_project(question, self.projects):
            return project
        last_user = next((t["content"] for t in reversed(history) if t["role"] == "user"), "")
        return detect_project(last_user, self.projects) if last_user and query_follows_up(question) else None

    def find(self, question: str, query: str, project: str | None, include: tuple[str, ...]) -> list[Hit]:
        s = self.settings
        hits = self.retriever.search(query, s.top_k, s.min_score, project=project, include=include)
        if query == question:
            return hits
        # a follow-up borrows the previous question ("projects that show…" reads like one too), so the question's own
        # results come first: the borrowed text must not crowd out what is being asked now
        own = self.retriever.search(question, s.top_k, s.min_score, project=project, include=include)
        merged, seen = [], set()
        for hit in (h for pair in zip_longest(own, hits) for h in pair if h is not None):
            if hit.chunk.id not in seen:
                seen.add(hit.chunk.id)
                merged.append(hit)
        return merged[:s.top_k]

    async def chat(self, uid: str, conversation_id: str, question: str) -> AsyncIterator[dict]:
        s = self.settings
        t0 = time.perf_counter()
        history, notes = await asyncio.gather(self.memory.history(uid, conversation_id, HISTORY_LIMIT), self.memory.notes(uid))
        query = retrieval_query(question, history)
        project = self.focus(question, history)
        include = ("about",) if ABOUT_MEHUL.search(question) else ()
        decision = decide(question, history, self.links, self.projects)
        task = decision.task
        if not task and GREETING_ONLY.match(question):
            task = GREETING_TASK
        elif not task and HOW_ARE_YOU.search(question) and len(question.split()) <= 6:
            task = HOW_ARE_YOU_TASK
        # replies about an action or a greeting need no portfolio facts; without them the model stays on point
        hits = [] if task else await asyncio.to_thread(self.find, question, query, project, include)
        prompt = build_prompt(question, hits, history, notes, name=s.name, budget=s.context_tokens, task=task)
        yield {
            "type": "context",
            "project": project,
            "sources": [{"id": h.chunk.doc_id, "title": h.chunk.title, "score": round(h.score, 3)} for h in prompt.facts],
            "history_turns": prompt.history_turns,
            "remembered": len(notes),
            "prompt_tokens": prompt.tokens,
            "retrieval_ms": round((time.perf_counter() - t0) * 1000),
        }
        if decision.action:
            yield decision.action.event()

        answer, first = [], None
        # facts need a steady hand; small talk sounds robotic at the same low temperature
        temperature = max(s.temperature, 0.7) if SMALL_TALK.match(question) and len(question.split()) <= 8 else s.temperature
        try:
            async for piece in self.llm.stream(prompt.messages, max_tokens=s.max_answer_tokens, temperature=temperature):
                if first is None:
                    first = time.perf_counter()
                answer.append(piece)
                yield {"type": "token", "text": piece}
        except InferenceError as e:
            log.warning("generation failed: %s", e)
            message = (f"{s.name} is getting a lot of questions right now. Please try again in a minute." if e.busy
                       else f"{s.name}'s model isn't available right now.")
            yield {"type": "error", "message": message}
            return

        text = "".join(answer).strip()
        links, seen = [], set()
        for h in prompt.facts:
            for link in h.chunk.links:
                if h.score >= LINK_SCORE and link["label"] not in seen and len(links) < 2:
                    seen.add(link["label"])
                    links.append(link)
        done = time.perf_counter()
        yield {
            "type": "done",
            "links": links,
            "first_token_ms": round(((first or done) - t0) * 1000),
            "total_ms": round((done - t0) * 1000),
        }

        if text:
            await self.memory.append(uid, conversation_id, [{"role": "user", "content": question},
                                                            {"role": "assistant", "content": text}])
            for note in visitor_notes(question):
                await self.memory.add_note(uid, note)
