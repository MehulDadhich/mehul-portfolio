/**
 * Writes Arc's knowledge base to arc/knowledge/<category>/<id>.md from the site's own content
 * (src/lib/content.ts via src/lib/assistant/knowledge.ts), so Arc can never drift from what the site says.
 *
 *   npm run arc:knowledge
 *
 * Each file starts with a one-line JSON header (title, keywords, links…) followed by the text.
 * The files are generated: edit content.ts, not these.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KNOWLEDGE, PROJECT_ALIASES, type Doc } from "../src/lib/assistant/knowledge";
import { profile, projects } from "../src/lib/content";

const OUT = join(process.cwd(), "arc", "knowledge");

function category(d: Doc): string {
  if (d.entity) return join("projects", d.entity);
  const head = d.id.split(".")[0];
  if (["skills", "experience", "education", "certifications", "contact", "site"].includes(head)) return head;
  if (["projects", "strengths", "genai", "cv", "web"].includes(head)) return "overview";
  return "profile";
}

rmSync(OUT, { recursive: true, force: true });
for (const d of KNOWLEDGE) {
  const dir = join(OUT, category(d));
  mkdirSync(dir, { recursive: true });
  const meta = { id: d.id, title: d.title, keys: d.keys, links: d.links ?? [], entity: d.entity, facet: d.facet };
  writeFileSync(join(dir, `${d.id}.md`), `<!-- arc: ${JSON.stringify(meta)} -->\n# ${d.title}\n\n${d.answer}\n`);
}
// names people use for each project, so Arc can keep one project's facts from bleeding into another's
writeFileSync(join(OUT, "projects.json"), JSON.stringify(PROJECT_ALIASES, null, 1) + "\n");
// the links Arc can open or download for a visitor (after asking), straight from the site's content
const links = {
  resume: profile.resume,
  github: profile.github,
  linkedin: profile.linkedin,
  email: `mailto:${profile.email}`,
  phone: `tel:${profile.phone.replace(/\s+/g, "")}`,
  // every project, so Arc can open its architecture; code and live-site links only where they exist
  projects: Object.fromEntries(projects.map((p) => [p.id, { title: p.title, ...(p.github && { github: p.github }), ...(p.demo && { demo: p.demo }) }])),
};
writeFileSync(join(OUT, "links.json"), JSON.stringify(links, null, 1) + "\n");
console.log(`wrote ${KNOWLEDGE.length} documents to ${OUT}`);
