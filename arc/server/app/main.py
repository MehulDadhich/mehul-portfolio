"""
Arc API: the backend of Arc, the generative AI assistant on Mehul Dadhich's portfolio.

    GET    /health                      model, retrieval and memory status
    POST   /chat                        {"question", "conversation_id"} → NDJSON stream of events
    GET    /conversations/{id}          the stored messages of one of the visitor's conversations
    DELETE /memory                      forget everything stored about the visitor
    POST   /reload                      re-read the knowledge base after `npm run arc:knowledge`

Run from arc/server:  uvicorn app.main:app --port 8000
"""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .auth import Auth, init_firebase
from .config import settings
from .conversation import ArcService
from .inference import create_backend
from .knowledge import load_knowledge, load_links, load_project_aliases
from .memory import create_memory
from .memory.base import ID
from .rag import HybridRetriever

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("arc")


def load_embedder():
    from fastembed import TextEmbedding

    return TextEmbedding(settings.embedding_model)


@asynccontextmanager
async def lifespan(app: FastAPI):
    firebase_app = init_firebase(settings)
    retriever = HybridRetriever(await asyncio.to_thread(load_embedder))
    chunks = await asyncio.to_thread(load_knowledge, settings.knowledge_dir)
    await asyncio.to_thread(retriever.index, chunks)
    llm = create_backend(settings)
    memory = create_memory(settings, firebase_app)
    app.state.service = ArcService(settings, retriever, llm, memory, load_project_aliases(settings.knowledge_dir),
                                   load_links(settings.knowledge_dir))
    app.state.auth = Auth(settings, firebase_app)
    log.info("%s ready: %d knowledge chunks, inference %s, memory %s", settings.name, retriever.size, llm.label, memory.label)
    yield
    await llm.aclose()


app = FastAPI(title="Arc API", docs_url=None, redoc_url=None, lifespan=lifespan)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    conversation_id: str = Field(pattern=ID.pattern)


@app.get("/health")
async def health(request: Request):
    svc: ArcService = request.app.state.service
    model = await svc.llm.health()
    return {
        "ok": model["ok"],
        "name": settings.name,
        "model": {"backend": svc.llm.label, **model},
        "knowledge_chunks": svc.retriever.size,
        "memory": svc.memory.label,
    }


@app.post("/chat")
async def chat(body: ChatRequest, request: Request):
    svc: ArcService = request.app.state.service
    uid = request.app.state.auth.user_id(request)

    async def events():
        try:
            async for event in svc.chat(uid, body.conversation_id, body.question.strip()):
                yield json.dumps(event, ensure_ascii=False) + "\n"
        except Exception:
            log.exception("chat failed")
            yield json.dumps({"type": "error", "message": "Something went wrong. Please try again."}) + "\n"

    # if the visitor closes the chat, Starlette cancels this generator, which closes the model stream too
    return StreamingResponse(events(), media_type="application/x-ndjson", headers={"Cache-Control": "no-store"})


@app.get("/conversations/{conversation_id}")
async def conversation(conversation_id: str, request: Request):
    if not ID.match(conversation_id):
        raise HTTPException(400, "invalid conversation id")
    uid = request.app.state.auth.user_id(request)
    return {"messages": await request.app.state.service.memory.history(uid, conversation_id, 50)}


@app.delete("/memory")
async def forget(request: Request):
    uid = request.app.state.auth.user_id(request)
    await request.app.state.service.memory.forget(uid)
    return {"ok": True}


@app.post("/reload")
async def reload(request: Request):
    request.app.state.auth.check_key(request)
    svc: ArcService = request.app.state.service
    chunks = await asyncio.to_thread(load_knowledge, settings.knowledge_dir)
    await asyncio.to_thread(svc.retriever.index, chunks)
    svc.projects = load_project_aliases(settings.knowledge_dir)
    svc.links = load_links(settings.knowledge_dir)
    return {"ok": True, "knowledge_chunks": svc.retriever.size}
