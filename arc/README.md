# Arc: the generative AI assistant on Mehul's portfolio

Arc answers visitors' questions about Mehul by **generating** each reply with an open-weight language model.
Retrieval only supplies the facts; the model writes the answer.

```
Browser (Arc chat in the portfolio)
   │  POST /api/arc  (Next.js route: validation, rate limit, holds ARC_API_KEY)
   ▼
Arc API  (arc/server, FastAPI)
   ├─ memory      conversation history + short notes about the visitor   (local JSON files or Firebase)
   ├─ retrieval   BM25 + bge-small embeddings over arc/knowledge          (hybrid, project-aware)
   ├─ prompt      instructions + memory + facts + recent turns, within a token budget
   └─ inference   one interface; today: llama.cpp on this PC, later: any hosted OpenAI-compatible server
          ▼
      Arc-3B  (currently the base model, Llama 3.2 3B Instruct, Q4_K_M GGUF)
```

The model never runs in the visitor's browser. For development, "the server" is this PC.

## Model

| | |
|---|---|
| Base model | **Llama 3.2 3B Instruct** (Meta), 4-bit Q4_K_M GGUF, ~2 GB |
| Licence | Llama 3.2 Community License: free for this use; requires the "Built with Llama" notice (shown in the chat) and following Meta's acceptable use policy |
| Why | Strong instruction following and grounded answering for its size, mature tooling (Transformers, PEFT/QLoRA, llama.cpp, vLLM), runs fully on a 6 GB GPU |
| Arc-3B | The QLoRA fine-tune of this base (next phase). It replaces the base only if it beats it on the evaluation set. |

## Run it locally (Windows)

Needs Python 3.11+, Node 20+ and ~3 GB of disk. An NVIDIA GPU is used automatically; without one it runs on the CPU (slower).

```powershell
# once: Python environment, llama.cpp server, the model (~2 GB) and the knowledge base
powershell -ExecutionPolicy Bypass -File arc\setup.ps1

# every time: model server (port 8081) + Arc API (port 8000). Leave this window open.
powershell -ExecutionPolicy Bypass -File arc\run.ps1

# in a second window: the portfolio
npm run dev
```

Open http://localhost:3000 and press **Ctrl + M**. In development the site talks to `http://127.0.0.1:8000`
automatically; set `ARC_API_URL` in `.env.local` to point it elsewhere.

Check the API on its own: http://127.0.0.1:8000/health

## Actions: what Arc can do on the page

Arc can act for the visitor, always after asking. Its reply shows **Yes** and **No** buttons; Yes runs the action
right in the click (so the browser allows the new tab or download), No does nothing.

| Visitor says | Arc offers to |
|---|---|
| "take me to the contact section", "where is the skills section?" | scroll to that section |
| "show me the website", "show all the animations", "give me a tour" | play a guided tour of the whole site: Arc minimises, every section scrolls by with a caption, and Arc comes back at the end (scrolling or Esc hands control back) |
| "download his resume", "can I get his CV?" | download the resume PDF |
| "take me to his GitHub", "open his LinkedIn" | open the profile in a new tab |
| "show me the warehouse system's code" | open that project's GitHub repo |
| "email him", "call him" | open a new email / start a call |

Requests are recognised by rules in `server/app/tools/actions.py` (never by the model, so questions like
"what's his email?" are just answered). The links come from `src/lib/content.ts` via `arc/knowledge/links.json`.

## Updating what Arc knows

The knowledge base is generated from the site's content (`src/lib/content.ts`), so it can't drift from the site:

```powershell
npm run arc:knowledge                                     # rewrites arc/knowledge/
Invoke-RestMethod -Method Post http://127.0.0.1:8000/reload   # re-index without restarting
```

## Tests

```powershell
cd arc\server
..\.venv\Scripts\python -m pytest
```

They cover retrieval (including word forms like "graduated" and keeping one project's facts out of another's
answers), prompt budgeting, follow-up handling, memory isolation between visitors, forgetting, model failures and
API-key checks. They use a scripted model, so they don't need the GPU.

## Configuration

Copy `arc/.env.example` to `arc/.env`. The main switches:

| Variable | Default | |
|---|---|---|
| `ARC_INFERENCE` | `local` | `hosted` sends generation to `ARC_HOSTED_URL` (any OpenAI-compatible server: llama.cpp, vLLM, TGI…) |
| `MEMORY_BACKEND` | `local` | `firestore` stores memory in Firebase (see below) |
| `RAG_TOP_K`, `RAG_MIN_SCORE` | `5`, `0.3` | how many facts are retrieved, and the relevance floor |
| `ARC_CONTEXT_TOKENS` | `3000` | prompt budget: facts and conversation history are trimmed to fit |
| `ARC_API_KEY` | empty | shared secret with the portfolio's `/api/arc`; set it (in both places) anywhere but your own PC |

Moving to hosted inference changes only `ARC_INFERENCE`, `ARC_HOSTED_URL` and `ARC_HOSTED_API_KEY`.
The frontend, retrieval, memory and prompts stay as they are.

## Deploying (free): Oracle Cloud Always Free

In production Arc runs exactly as it does locally (llama.cpp with Llama 3.2 3B, plus the Arc API), on an Oracle
Cloud Always Free ARM VM, without a GPU. HTTPS comes from Caddy and Let's Encrypt on `<ip-with-dashes>.sslip.io`.
Memory stays in Firebase.

1. In the Oracle Cloud console, create a VM: image **Ubuntu 24.04**, shape **VM.Standard.A1.Flex** (Ampere ARM,
   as many OCPUs and as much memory as the free tier allows), save the private SSH key it offers.
2. In the VM's subnet → Security List, add ingress rules for TCP ports **80** and **443** from `0.0.0.0/0`.
3. Deploy (and again whenever Arc's code or knowledge changes):
   ```powershell
   arc\.venv\Scripts\python arc\deploy\deploy.py <public IP> --key <private key file>
   ```
   The first run builds llama.cpp for the VM's CPU and downloads the model (Q4_0, the fastest format on ARM),
   15–20 minutes in all. Later runs only upload the code and restart. It generates `DEPLOY_ARC_API_KEY` in
   `arc/.env` on the first run.
4. In Vercel → Settings → Environment Variables, add `ARC_API_URL` (the address the script prints),
   `ARC_API_KEY` (the `DEPLOY_ARC_API_KEY` value) and the four `NEXT_PUBLIC_FIREBASE_*` values from `.env.local`.
   Then redeploy the site.

On the VM: `systemctl status arc-llama arc-api caddy`, logs with `journalctl -u arc-api -f`.
Without a GPU, answers are slower than on your PC: expect a pause before the first words, then a steady stream.

## Firebase memory

Locally, memory is stored in `arc/data/memory/<visitor>.json`, with the same layout Firestore uses. To use Firebase:

1. Create a Firebase project. Enable **Authentication → Anonymous** and **Cloud Firestore**.
2. Deploy `arc/firebase/firestore.rules` (visitors can read only their own data; only the server writes).
3. Register a web app (Project settings → Your apps → Web) and create a service account key
   (Project settings → Service accounts → Generate new private key).
4. Write both configs and check the server credentials:
   ```powershell
   arc\.venv\Scripts\python arc\server\connect_firebase.py --service-account <downloaded key.json> `
       --api-key <apiKey> --auth-domain <authDomain> --app-id <appId>
   ```
   This sets `MEMORY_BACKEND=firestore` and the `FIREBASE_*` credentials in `arc/.env` (server only), and the
   `NEXT_PUBLIC_FIREBASE_*` web config in `.env.local` (public by design). Restart Arc and `npm run dev`.

The current project is **mehul-arc** (Firestore in asia-south1).

Visitors are then signed in anonymously, and the server verifies their Firebase ID token on every request, so a
visitor can't read another visitor's memory. The admin credentials stay on the server.

```
users/{uid}/conversations/{conversationId}/messages/{id}   role, content, createdAt
users/{uid}/memories/{id}                                  content ("The visitor is a recruiter at Acme."), createdAt
```

Long-term memory is deliberately small: only who the visitor is, what they're hiring for and their name,
extracted from what they actually said. Nothing else from a conversation is kept beyond that conversation.

## Layout

```
arc/
├── setup.ps1, run.ps1          one-time setup, start everything
├── knowledge/                  generated from the site (npm run arc:knowledge); don't edit by hand
├── firebase/firestore.rules
├── deploy/                     deploy.py + oracle/ (setup script, systemd services, Caddy)
└── server/
    ├── app/
    │   ├── main.py             HTTP API
    │   ├── conversation.py     one chat turn end to end
    │   ├── rag.py              hybrid retrieval
    │   ├── prompt.py           prompt construction + token budget
    │   ├── knowledge.py        loading and chunking the knowledge base
    │   ├── auth.py             visitor identity (Firebase token or local id), API key
    │   ├── inference/          base.py (interface), local_backend.py, hosted_backend.py
    │   └── memory/             base.py (interface), local_store.py, firestore_store.py, extract.py
    └── tests/
```
