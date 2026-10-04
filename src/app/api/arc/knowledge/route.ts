import { KNOWLEDGE } from "@/lib/assistant/knowledge";

/**
 * Arc's knowledge base as JSON. The Arc Space (generative backend) fetches this, so content.ts
 * stays the single source of truth. Everything here is already public on the site.
 */
export async function GET() {
  return Response.json(
    { version: 1, docs: KNOWLEDGE },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } }
  );
}
