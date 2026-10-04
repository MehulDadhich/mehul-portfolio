/**
 * A small, fully local question-answering engine for the portfolio:
 *   1. intent router  (greetings, help, resume, "does he know X?")
 *   2. entity + facet detection  ("RoadGuard" + "stack")  with follow-up memory
 *   3. BM25 retrieval over the generated knowledge base, with synonyms and typo tolerance
 * No network calls, no model weights: every answer is a fact from content.ts.
 */
import { KNOWLEDGE, PROJECT_ALIASES, SKILL_INDEX, type Doc, type Link } from "./knowledge";

export type Reply = {
  text: string;
  links: Link[];
  trace: { intent: string; source: string; score?: number };
  /** The pipeline steps that produced this answer, replayed in the UI while Arc "thinks". */
  steps: string[];
};
export type Memory = { entity?: string };

/* ----------------------------- text processing ----------------------------- */

const STOP = new Set(
  ("a an the is are was were be been am i me my you your he his him she her they them their it its this that these those " +
    "of to in on for with at by from as and or but if so than then there here do does did doing have has had can could " +
    "would should will shall may might must about into over under what which tell please show give me some any any more " +
    "much many very just also mehul dadhich mehuls s")
    .split(" ")
);

const PHRASES: [RegExp, string][] = [
  [/node\.?js/g, "nodejs"], [/next\.?js/g, "nextjs"], [/socket\.?io/g, "socketio"], [/b\.?\s?tech/g, "btech"],
  [/to-do/g, "todo"], [/vit-?ap/g, "vitap"], [/infrax\.ai/g, "infrax"], [/c\+\+/g, "cpp"], [/e-?mail/g, "email"],
  [/linked\s?in/g, "linkedin"], [/git\s?hub/g, "github"], [/post\s?gres(ql)?/g, "postgresql"],
];

const SYNONYMS: Record<string, string[]> = {
  crash: ["accident"], collision: ["accident"], accidents: ["accident"],
  gpa: ["cgpa"], marks: ["cgpa"], grade: ["cgpa"], uni: ["university"], college: ["university"],
  employer: ["experience"], company: ["experience"], worked: ["experience"], intern: ["internship"],
  phone: ["contact"], number: ["contact"], mail: ["email"], reach: ["contact"],
  hire: ["availability"], hiring: ["availability"], vacancy: ["availability"], open: ["availability"],
  llm: ["genai"], gpt: ["genai"], chatgpt: ["genai"], agentic: ["agent"],
  ml: ["machine", "learning"], dl: ["deep", "learning"], ai: ["genai"],
  plate: ["anpr"], ocr: ["anpr"], vaultsense: ["warehouse"],
  site: ["website"], portfolio: ["website"],
};

function normalize(q: string) {
  let s = q.toLowerCase();
  for (const [re, to] of PHRASES) s = s.replace(re, to);
  return s;
}

function stem(t: string) {
  if (t.length > 5 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.length > 4 && t.endsWith("ed")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") && !t.endsWith("us")) return t.slice(0, -1);
  return t;
}

function tokenize(text: string) {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t))
    .map(stem);
}

function levenshtein(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/* --------------------------------- BM25 ----------------------------------- */

type Indexed = { doc: Doc; tf: Map<string, number>; len: number };

const INDEX: Indexed[] = KNOWLEDGE.filter((doc) => doc.id !== "resume").map((doc) => {
  // keys and title count double: they are the phrasings people actually ask with
  const toks = [...tokenize(doc.keys.join(" ")), ...tokenize(doc.keys.join(" ")), ...tokenize(doc.title), ...tokenize(doc.title), ...tokenize(doc.answer)];
  const tf = new Map<string, number>();
  for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
  return { doc, tf, len: toks.length };
});
const AVG_LEN = INDEX.reduce((s, d) => s + d.len, 0) / INDEX.length;
const DF = new Map<string, number>();
for (const d of INDEX) for (const t of d.tf.keys()) DF.set(t, (DF.get(t) ?? 0) + 1);
const VOCAB = [...DF.keys()];
const idf = (t: string) => {
  const n = DF.get(t) ?? 0;
  return Math.log(1 + (INDEX.length - n + 0.5) / (n + 0.5));
};

function expand(tokens: string[]) {
  const out: string[] = [];
  for (const raw of tokens) {
    let t = raw;
    if (!DF.has(t) && t.length >= 5) {
      // typo tolerance: snap unknown words to the closest known word
      let best = "", bd = t.length >= 8 ? 2 : 1;
      for (const v of VOCAB) {
        const d = levenshtein(t, v);
        if (d <= bd && d < 3) { bd = d; best = v; }
      }
      if (best) t = best;
    }
    out.push(t, ...(SYNONYMS[t] ?? []).map(stem));
  }
  return out;
}

function bm25(queryTokens: string[], pool: Indexed[] = INDEX) {
  const k1 = 1.2, b = 0.75;
  return pool
    .map((d) => {
      let score = 0;
      for (const t of new Set(queryTokens)) {
        const f = d.tf.get(t);
        if (!f) continue;
        score += idf(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / AVG_LEN)));
      }
      return { d, score };
    })
    .sort((a, b2) => b2.score - a.score);
}

/* ------------------------------- detection -------------------------------- */

function detectEntity(q: string): string | undefined {
  const s = normalize(q);
  let found: { id: string; len: number } | undefined;
  for (const [id, aliases] of Object.entries(PROJECT_ALIASES)) {
    for (const a of aliases) {
      const re = new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(s) && (!found || a.length > found.len)) found = { id, len: a.length };
    }
  }
  if (found) return found.id;
  // typo tolerance for single-word project names ("roadgard", "warehose")
  const tokens = s.split(/[^a-z0-9]+/).filter((t) => t.length >= 5);
  for (const [id, aliases] of Object.entries(PROJECT_ALIASES)) {
    for (const a of aliases.filter((x) => !x.includes(" ") && x.length >= 5)) {
      if (tokens.some((t) => levenshtein(t, a) <= (a.length >= 8 ? 2 : 1))) return id;
    }
  }
  return undefined;
}

const FACETS: [Doc["facet"], RegExp][] = [
  ["lessons", /\b(lesson|learn|learnt|learned|challeng|hard|hardest|difficult|mistake|problem(s)? (he )?faced|debug)/],
  ["results", /\b(result|metric|accura|f1|recall|precision|latency|performance|benchmark|fast|speed|how good|numbers?|evaluat)/],
  ["links", /\b(github|code|repo|repository|source|demo|link)\b/],
  ["stack", /\b(stack|tech|technolog|built with|made with|tools?|languages?|framework|librar)/],
  ["architecture", /\b(architecture|pipeline|how (does|do) it work|how it works|design|flow|stages?|steps?|components?)\b/],
];
const detectFacet = (q: string) => FACETS.find(([, re]) => re.test(normalize(q)))?.[0];
const FOLLOW_UP = /\b(it|its|it's|this|that|the project|this project|that project|they|them)\b/;

/** Common tools that are NOT in Mehul's skills, so "does he know X?" can be answered honestly. */
const NOT_LISTED = [
  "tensorflow", "keras", "kubernetes", "k8s", "aws", "azure", "gcp", "spark", "hadoop", "rust", "golang", "cpp", "c#",
  "scikit-learn", "sklearn", "pandas", "kafka", "airflow", "mlflow", "django", "flask", "angular", "vue", "mongodb",
  "terraform", "jax", "onnx", "tensorrt", "triton", "huggingface", "hugging face", "matlab", "r language", "tableau", "power bi",
];
const SKILL_ALIASES: Record<string, string[]> = {
  "Docker Compose": ["docker", "docker compose", "containers"],
  "Git & GitHub": ["git", "github", "version control"],
  PostgreSQL: ["postgresql", "postgres", "sql database"],
  JavaScript: ["javascript", "js"],
  "Node.js": ["nodejs", "node"],
  YOLO11: ["yolo11", "yolo 11", "yolo"],
  YOLOv8: ["yolov8", "yolo v8", "yolo"],
  "Object tracking": ["tracking", "bytetrack", "object tracking"],
  "Object detection": ["object detection", "detection"],
  "LLM applications": ["llm", "llms", "large language model"],
  "Vector databases": ["vector db", "vector database", "vector store"],
  FastAPI: ["fastapi", "fast api"],
  PyTorch: ["pytorch", "torch"],
  "Unit testing": ["testing", "unit test", "pytest"],
};

function matchSkills(q: string) {
  const s = normalize(q);
  const hits = SKILL_INDEX.filter((sk) => {
    const names = [sk.name.toLowerCase(), ...(SKILL_ALIASES[sk.name] ?? [])].map(normalize);
    return names.some((n) => new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(s));
  });
  // keep the most specific matches ("YOLO11" over generic "Object detection" when both hit)
  return hits.slice(0, 4);
}

/* ------------------------------- answering -------------------------------- */

const fromDoc = (doc: Doc, intent: string, score?: number): Reply => ({
  text: doc.answer,
  links: doc.links ?? [],
  trace: { intent, source: doc.id, score },
  steps: [],
});

const say = (text: string, intent: string, links: Link[] = [], source = "router", score?: number): Reply => ({
  text, links, trace: { intent, source, score }, steps: [],
});

/** Routes a question to an answer. `answer()` wraps this and adds the visible reasoning steps. */
function route(question: string, memory: Memory): Reply {
  const q = question.trim();
  const s = normalize(q);
  const words = s.split(/\s+/).filter(Boolean);
  const doc = (id: string) => KNOWLEDGE.find((d) => d.id === id)!;

  // 1. small talk and meta intents
  if (!q || /^(help|\?|what can you (do|answer)|what (should|can) i ask)/.test(s)) {
    return say("I know everything on this site: Mehul's **projects**, his **internship** at Infrax.ai, his **skills**, **education**, **certifications** and how to **contact** him. Ask in your own words; I'll do the rest.", "help");
  }
  if (words.length <= 5 && /^(hi|hii+|hey|hello|yo|hola|namaste|sup|good (morning|afternoon|evening))\b/.test(s)) {
    return say("Hey! I'm Arc. Ask me anything about Mehul and his work.", "greeting");
  }
  if (words.length <= 5 && /\b(thanks|thank you|thx|ty|cool|great|awesome|nice|perfect|ok|okay)\b/.test(s)) {
    return say("Anytime. Ask away if anything else comes to mind.", "thanks");
  }
  if (words.length <= 4 && /\b(bye|goodbye|see you|cya)\b/.test(s)) {
    return say("Thanks for stopping by! You can reach Mehul any time at **mehuldadhich1103@gmail.com**.", "goodbye");
  }
  if (/\b(resume|cv|curriculum vitae)\b/.test(s) && !/computer vision/.test(s) && words.length <= 7) {
    return fromDoc(doc("resume"), "resume");
  }
  if (/\b(arc|are you|who are you|what are you|you (a |an )?(bot|ai|human|real|robot)|chatgpt|gpt|how do you work|how does (this|the) (bot|chat|assistant)|built this (bot|chat))\b/.test(s)) {
    return fromDoc(doc("site.bot"), "meta.bot");
  }
  if (/\b(this|the|your|his) (site|website|portfolio)\b|\bwebsite\b/.test(s)) {
    return fromDoc(doc("site.tech"), "meta.site");
  }
  if (/\b(contact|reach|e-?mail|phone|number|call him|get in touch|connect with|message him|linkedin)\b/.test(s) && !detectEntity(q)) {
    return fromDoc(doc("contact"), "contact");
  }
  if (/\b(study|studied|studying|college|university|degree|btech|cgpa|gpa|school|graduat\w*|education|qualification|vitap)\b/.test(s)) {
    return fromDoc(doc("education"), "education");
  }
  if (/\b(infrax|internship|intern)\b/.test(s) && !detectEntity(q)) {
    const pool = INDEX.filter((d) => d.doc.id.startsWith("experience.") || d.doc.entity === "tmcs");
    const top = bm25(expand(tokenize(q)), pool)[0];
    const pick = /\b(build|built|make|made|project|system)\b/.test(s) ? doc("tmcs.overview") : top?.d.doc ?? doc("experience.overview");
    return fromDoc(pick, "experience", top?.score);
  }

  if (!detectEntity(q) && !matchSkills(q).length && /\b(skills?|skill ?set|tech stack|technologies|what does he know|expertise|abilities)\b/.test(s)) {
    return fromDoc(doc("skills.all"), "skills.overview");
  }
  if (!detectEntity(q) && /\b(projects?|what (has|did) he (built|build|make|made|done|create|created)|work samples|portfolio of work|things he (built|made))\b/.test(s)) {
    return fromDoc(doc("projects.all"), "projects.overview");
  }

  // 2. project questions, with follow-up memory ("what stack did it use?")
  let entity = detectEntity(q);
  const facet = detectFacet(q);
  if (!entity && memory.entity && (FOLLOW_UP.test(s) || (facet && words.length <= 6))) entity = memory.entity;

  // 3. "does he know X?", answered from the skills → projects map
  const asksSkill = /\b(know|knows|use|used|uses|using|experience (with|in)|worked (with|on)|familiar|skilled|proficient|good at|can he|does he|has he|skills? in)\b/.test(s) || words.length <= 2;
  if (!entity && asksSkill) {
    const hits = matchSkills(q);
    if (hits.length) {
      const parts = hits.map((h) =>
        h.used.length ? `**${h.name}** (${h.group}), used in ${h.used.join(", ")}` : `**${h.name}** (${h.group}), listed on his resume`
      );
      return say(`Yes: ${parts.join("; ")}.`, "skill.lookup", [{ label: "See skills", section: "skills" }], "skills");
    }
    const missing = NOT_LISTED.find((t) => new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(s));
    if (missing) {
      return say(
        `**${missing.replace(/\b\w/g, (c) => c.toUpperCase())}** isn't on Mehul's resume or in the projects here, so I can't vouch for it. His core stack is Python, PyTorch, YOLO/OpenCV, LangGraph/LangChain and FastAPI. Worth asking him directly.`,
        "skill.lookup", [{ label: "See skills", section: "skills" }, { label: "Contact", section: "contact" }], "not-listed"
      );
    }
  }

  if (entity) {
    memory.entity = entity;
    const pool = INDEX.filter((d) => d.doc.entity === entity && (!facet || d.doc.facet === facet));
    const ranked = bm25(expand(tokenize(q)), pool.length ? pool : INDEX.filter((d) => d.doc.entity === entity));
    const best = facet ? ranked[0] : ranked.find((r) => r.d.doc.facet === "overview") ?? ranked[0];
    if (best) return fromDoc(best.d.doc, `project.${best.d.doc.facet}`, best.score);
  }

  // 4. general retrieval (two-part questions get both parts answered)
  const ranked = bm25(expand(tokenize(q)));
  const top = ranked[0];
  if (!top || top.score < 2.5) {
    return say(
      "That's outside what I know. I only answer from this site, so I'd rather not guess. I'm good on Mehul's projects, internship, skills, education, certifications and contact details.",
      "fallback", [{ label: "Contact Mehul", section: "contact" }], "none", top?.score
    );
  }
  if (top.d.doc.entity) memory.entity = top.d.doc.entity;
  return fromDoc(top.d.doc, "retrieval", top.score);
}

/**
 * Entity and facet hints for the generative backend: which project a question is about
 * (following up on the previous question when it says "it", "that project"...) and which facet.
 */
export function hints(question: string, previousQuestion?: string): { entity?: string; facet?: string } {
  const s = normalize(question);
  let entity = detectEntity(question);
  if (!entity && previousQuestion && (FOLLOW_UP.test(s) || s.split(/\s+/).length <= 6)) entity = detectEntity(previousQuestion);
  return { entity, facet: detectFacet(question) };
}

/** Splits "skills and certifications" style questions, answers each part, and merges distinct answers. */
function routeMulti(question: string, memory: Memory): Reply {
  const parts = question.split(/\s+(?:and|also|plus|as well as|&)\s+|\s*[,;]\s*/i).map((p) => p.trim()).filter((p) => p.length > 1);
  if (parts.length < 2) return route(question, memory);
  const replies = parts.slice(0, 3).map((p) => route(p, memory)).filter((r) => r.trace.intent !== "fallback");
  const unique = replies.filter((r, i) => replies.findIndex((x) => x.trace.source === r.trace.source && x.text === r.text) === i);
  if (unique.length < 2) return route(question, memory);
  return {
    text: unique.map((r) => r.text).join("\n\n"),
    links: unique.flatMap((r) => r.links).filter((l, i, a) => a.findIndex((x) => x.label === l.label) === i).slice(0, 3),
    trace: { intent: "multi", source: unique.map((r) => r.trace.source).join(" + ") },
    steps: [],
  };
}

/** Answers a question and records the pipeline steps that produced the answer, for the UI to replay. */
export function answer(question: string, memory: Memory): Reply {
  const before = memory.entity;
  const reply = routeMulti(question, memory);
  const tokens = expand(tokenize(question));
  const candidates = bm25(tokens).filter((r) => r.score > 0).slice(0, 3);
  const steps = [
    `parse → ${tokens.slice(0, 6).join(" · ") || "∅"}`,
    ...(reply.trace.intent === "multi" ? [`split → ${reply.trace.source.split(" + ").length} parts`] : []),
    `intent → ${reply.trace.intent}`,
    ...(memory.entity && reply.trace.intent.startsWith("project") ? [`entity → ${memory.entity}${memory.entity === before && !detectEntity(question) ? " (from memory)" : ""}`] : []),
    ...(candidates.length ? [`retrieve → ${candidates.map((c) => `${c.d.doc.id} ${c.score.toFixed(1)}`).join(", ")}`] : []),
    `answer ← ${reply.trace.source}`,
  ];
  return { ...reply, steps };
}
