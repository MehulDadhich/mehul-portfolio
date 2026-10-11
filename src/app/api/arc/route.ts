/**
 * Proxy from the browser to the Arc API (arc/server). Keeps ARC_API_KEY on the server, validates input,
 * rate-limits each visitor and streams Arc's answer straight through.
 *
 *   POST   /api/arc                     {question, conversation_id} → NDJSON events
 *   GET    /api/arc?conversation=<id>   that conversation's stored messages
 *   DELETE /api/arc                     forget everything Arc stored about this visitor
 *
 * In development it talks to http://127.0.0.1:8000 (arc\run.ps1) unless ARC_API_URL says otherwise.
 */

const ARC_API_URL = (process.env.ARC_API_URL ?? (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : ""))
  .replace(/\/$/, "");
const ARC_API_KEY = process.env.ARC_API_KEY ?? "";
const ID = /^[A-Za-z0-9_-]{6,128}$/;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function limited(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // bounded memory; worst case a visitor's window resets
  return recent.length > MAX_PER_WINDOW;
}

function forward(request: Request): HeadersInit {
  const headers: Record<string, string> = {};
  const visitor = request.headers.get("x-arc-visitor");
  const auth = request.headers.get("authorization");
  if (visitor && ID.test(visitor)) headers["x-arc-visitor"] = visitor;
  if (auth) headers.authorization = auth;
  if (ARC_API_KEY) headers["x-arc-key"] = ARC_API_KEY;
  return headers;
}

const offline = () => Response.json({ error: "Arc is offline" }, { status: 503 });

async function call(path: string, init: RequestInit) {
  if (!ARC_API_URL) return offline();
  try {
    return await fetch(`${ARC_API_URL}${path}`, { ...init, cache: "no-store" });
  } catch {
    return offline();
  }
}

export async function POST(request: Request) {
  if (limited(request)) return Response.json({ error: "Too many questions. Try again in a minute." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const conversationId = typeof body?.conversation_id === "string" ? body.conversation_id : "";
  if (!question || question.length > 500 || !ID.test(conversationId)) {
    return Response.json({ error: "Invalid question" }, { status: 400 });
  }
  const upstream = await call("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...forward(request) },
    body: JSON.stringify({ question, conversation_id: conversationId }),
    signal: request.signal, // the visitor closing the chat stops generation
  });
  if (upstream.status === 401) return Response.json({ error: "Please reload the page to continue." }, { status: 401 });
  if (!upstream.ok || !upstream.body) {
    return upstream.status === 503 ? offline() : Response.json({ error: "Arc couldn't answer that. Please try again." }, { status: 502 });
  }
  return new Response(upstream.body, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("conversation") ?? "";
  if (!ID.test(id)) return Response.json({ error: "Invalid conversation" }, { status: 400 });
  const upstream = await call(`/conversations/${id}`, { headers: forward(request) });
  return upstream.ok ? Response.json(await upstream.json()) : Response.json({ messages: [] }, { status: upstream.status });
}

export async function DELETE(request: Request) {
  const upstream = await call("/memory", { method: "DELETE", headers: forward(request) });
  return Response.json({ ok: upstream.ok }, { status: upstream.ok ? 200 : upstream.status });
}
