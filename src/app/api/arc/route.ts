import { hints } from "@/lib/assistant/engine";

/**
 * Proxy from the browser to the Arc Space (generative RAG backend on Hugging Face).
 * Keeps ARC_API_KEY on the server, validates input and applies a per-visitor rate limit.
 * Responds 503 when the Space isn't configured or reachable, so the client falls back to local Arc.
 */
export const maxDuration = 60;

const SPACE_URL = process.env.ARC_SPACE_URL?.replace(/\/$/, "");
const API_KEY = process.env.ARC_API_KEY;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 25;
const hits = new Map<string, number[]>(); // best effort: per server instance

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS;
}

type Turn = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  if (!SPACE_URL || !API_KEY) {
    return Response.json({ error: "generative mode not configured" }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (limited(ip)) {
    return Response.json({ error: "Too many questions in a short time. Try again in a few minutes." }, { status: 429 });
  }

  let body: { question?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 300) : "";
  if (!question) return Response.json({ error: "question is required" }, { status: 400 });
  const history: Turn[] = Array.isArray(body.history)
    ? body.history
        .filter((t): t is Turn => !!t && typeof t === "object" && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
        .slice(-6)
        .map((t) => ({ role: t.role, content: t.content.slice(0, 800) }))
    : [];

  let upstream: Response;
  try {
    upstream = await fetch(`${SPACE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ question, history, ...hints(question, [...history].reverse().find((t) => t.role === "user")?.content) }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    return Response.json({ error: "Arc's model is unreachable" }, { status: 503 });
  }
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: `Arc's model returned ${upstream.status}` }, { status: upstream.status === 401 ? 500 : 503 });
  }

  return new Response(upstream.body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
