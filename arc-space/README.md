---
title: Arc Space
emoji: 🟡
colorFrom: yellow
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
short_description: Generative RAG backend for Arc, Mehul Dadhich's portfolio assistant
---

# Arc Space

The generative backend for **Arc**, the assistant on [Mehul Dadhich's portfolio](https://mehul-portfolio-inky.vercel.app).

```
question ─► hybrid retrieval (BM25 + bge-small embeddings) ─► grounded prompt ─► Qwen2.5-1.5B-Instruct (llama.cpp, CPU) ─► streamed answer
```

- **No external AI API.** Open-weight models run inside this Space.
- **Grounded.** Arc answers only from the knowledge base the portfolio publishes at `/api/arc/knowledge`, refreshed every 30 minutes.
- **Private by default.** `/chat` requires the `ARC_API_KEY` secret; only the portfolio's server route knows it.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Readiness, loaded model and document count |
| `POST` | `/chat` | `{ "question": "...", "history": [{ "role": "user", "content": "..." }] }` → NDJSON stream |

## Configuration (Space → Settings → Variables and secrets)

| Name | Required | Default |
|---|---|---|
| `ARC_API_KEY` (secret) | yes | – |
| `ARC_KNOWLEDGE_URL` | no | `https://mehul-portfolio-inky.vercel.app/api/arc/knowledge` |
| `ARC_MODEL_REPO` / `ARC_MODEL_FILE` | no | `Qwen/Qwen2.5-1.5B-Instruct-GGUF` / `qwen2.5-1.5b-instruct-q4_k_m.gguf` |

Swap `ARC_MODEL_REPO` / `ARC_MODEL_FILE` to your own fine-tuned GGUF (Phase 2) without touching the code.
