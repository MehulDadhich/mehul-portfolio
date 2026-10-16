/**
 * Knowledge base for the on-site assistant, generated from content.ts so it can never drift
 * from what the site says. Every answer the assistant gives comes from one of these documents.
 */
import {
  certifications, evidence, experience, journey, profile, projects, roadguardLessons, roadguardMetrics, skillGroups,
} from "@/lib/content";

export type Link = { label: string; section?: string; href?: string };

export type Doc = {
  id: string;
  title: string;
  /** Answer text. Supports **bold**. */
  answer: string;
  /** Extra phrasings and keywords that should retrieve this doc (weighted higher than the answer). */
  keys: string[];
  links?: Link[];
  /** Project id this doc belongs to, used for follow-up questions like "what stack did it use?". */
  entity?: string;
  /** Which facet of a project this doc covers. */
  facet?: "overview" | "stack" | "architecture" | "results" | "links" | "lessons";
};

/** Names people use for each project, mapped to the project id. */
export const PROJECT_ALIASES: Record<string, string[]> = {
  roadguard: ["roadguard", "road guard", "accident detection", "accident", "crash", "collision", "featured project"],
  warehouse: ["warehouse", "warehouse monitoring", "vaultsense", "anpr", "number plate", "licence plate", "license plate", "ocr", "easyocr", "plate recognition"],
  "task-agent": ["task manager", "ai task manager", "task agent", "todo", "to-do", "task app", "productivity"],
  tmcs: ["tmcs", "traffic management", "atms", "infrax project", "traffic system"],
  astra: ["astra", "cygnus", "operations assistant", "operations agent", "vms assistant", "noah"],
  rehearse: ["rehearse", "mock interview", "mock interviewer", "ai interviewer", "interview practice", "practice interview", "interview app", "whisper"],
  arc: ["arc project", "rag assistant", "portfolio assistant", "this assistant", "this chatbot", "fine-tune", "fine-tuning", "finetune", "qlora", "lora", "qwen2.5"],
};

const evidenceLabel = (id: string) => evidence.find((e) => e.id === id)?.label ?? id;
const list = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

function projectDocs(): Doc[] {
  const docs: Doc[] = [];
  for (const p of projects) {
    const aliases = PROJECT_ALIASES[p.id] ?? [p.title];
    const section = p.featured ? "featured" : "work";
    const codeLink: Link[] = p.github ? [{ label: "Code on GitHub", href: p.github }] : [];
    docs.push({
      id: `${p.id}.overview`,
      entity: p.id,
      facet: "overview",
      title: p.title,
      answer: `**${p.title}** (${p.kicker}). ${p.problem} ${p.solution}`,
      keys: [...aliases, "what is", "tell me about", "explain", "overview", "problem", "solution", "project"],
      links: [{ label: `See ${p.title}`, section }, ...codeLink],
    });
    docs.push({
      id: `${p.id}.stack`,
      entity: p.id,
      facet: "stack",
      title: `${p.title}: tech stack`,
      answer: `**${p.title}** is built with ${list(p.stack)}.`,
      keys: [...aliases, "stack", "tech", "technologies", "tools", "built with", "language", "framework", "libraries"],
      links: [{ label: `See ${p.title}`, section }],
    });
    docs.push({
      id: `${p.id}.architecture`,
      entity: p.id,
      facet: "architecture",
      title: `${p.title}: architecture`,
      answer:
        `**${p.title}** works as a pipeline: ${p.architecture.map((s) => `**${s.label}**`).join(" → ")}. ` +
        p.architecture.map((s) => `${s.label}: ${s.detail}`).join(" "),
      keys: [...aliases, "architecture", "pipeline", "workflow", "work flow", "process", "how does it work", "how it works", "end to end", "components", "design", "flow", "stages", "steps"],
      links: [{ label: `See ${p.title}`, section }],
    });
    docs.push({
      id: `${p.id}.highlights`,
      entity: p.id,
      facet: "results",
      title: `${p.title}: highlights`,
      answer: `Highlights of **${p.title}**: ${list(p.highlights.map((h) => h.charAt(0).toLowerCase() + h.slice(1)))}.`,
      keys: [...aliases, "highlights", "features", "key points", "achievements"],
      links: [{ label: `See ${p.title}`, section }],
    });
    docs.push({
      id: `${p.id}.links`,
      entity: p.id,
      facet: "links",
      title: `${p.title}: code`,
      answer: p.github
        ? `The code for **${p.title}** is public on GitHub.`
        : `The code for **${p.title}** isn't public. ${p.linkNote ?? ""}.`.replace("..", "."),
      keys: [...aliases, "github", "code", "repo", "repository", "source", "link", "demo"],
      links: p.github ? [{ label: "Open on GitHub", href: p.github }] : [{ label: `See ${p.title}`, section }],
    });
  }

  // RoadGuard has measured results and engineering lessons on top of the generic facets.
  docs.push({
    id: "roadguard.results",
    entity: "roadguard",
    facet: "results",
    title: "RoadGuard: measured results",
    answer:
      "Measured results for **RoadGuard**: " +
      roadguardMetrics.map((m) => `**${m.value}** ${m.label} (${m.note})`).join("; ") +
      ".",
    keys: [...PROJECT_ALIASES.roadguard, "results", "metrics", "accuracy", "f1", "recall", "latency", "performance", "numbers", "how good", "benchmark", "evaluation", "speed", "fast"],
    links: [{ label: "See the results", section: "featured" }],
  });
  roadguardLessons.forEach((l, i) =>
    docs.push({
      id: `roadguard.lesson.${i}`,
      entity: "roadguard",
      facet: "lessons",
      title: `RoadGuard lesson: ${l.title}`,
      answer: `**${l.title}.** ${l.body}`,
      keys: [...PROJECT_ALIASES.roadguard, "lesson", "learned", "challenge", "problem faced", "difficult", "hardest", "debug", l.title],
      links: [{ label: "Engineering notes", section: "featured" }],
    })
  );
  return docs;
}

function experienceDocs(): Doc[] {
  const e = experience;
  return [
    {
      id: "experience.overview",
      title: "Experience at Infrax.ai",
      answer:
        `Mehul was an **${e.role} at ${e.company}** (${e.period}, ${e.mode}). He worked on the ${e.system}, ` +
        `which watches for ${list(e.watches.map((w) => w.toLowerCase()))}.`,
      keys: ["experience", "work experience", "job", "internship", "intern", "company", "companies", "infrax", "infrax.ai", "employer", "worked", "professional", "industry", "career"],
      links: [{ label: "See experience", section: "experience" }],
    },
    {
      id: "experience.duties",
      title: "What he did at Infrax.ai",
      answer: `At **${e.company}** he: ` + e.work.map((w) => `**${w.verb}**: ${w.body}`).join(" "),
      keys: ["responsibilities", "what did he do", "role", "duties", "infrax", "internship", "contributions", "tasks", "deployed", "production"],
      links: [{ label: "See experience", section: "experience" }],
    },
  ];
}

function skillDocs(): Doc[] {
  const overview: Doc = {
    id: "skills.all",
    title: "Skills overview",
    answer:
      "Mehul's skills, grouped: " +
      skillGroups.map((g) => `**${g.label}**: ${g.skills.slice(0, 5).map((s) => s.name).join(", ")}${g.skills.length > 5 ? "…" : ""}`).join("; ") +
      ". Every skill on the site is linked to the project where he used it.",
    keys: ["skills", "skill set", "skillset", "tech stack", "technologies", "what does he know", "expertise", "abilities", "competencies", "tools"],
    links: [{ label: "See skills", section: "skills" }],
  };
  return [overview, ...skillGroups.map((g) => ({
    id: `skills.${g.id}`,
    title: `Skills: ${g.label}`,
    answer:
      // one plain sentence per skill naming its projects, so "where did he use TTS?" has an answer a small model can't miss
      `Mehul's ${g.label} skills. ` +
      g.skills.map((s) => s.used.length
        ? `He used ${s.name} in ${list(s.used.map(evidenceLabel))}.`
        : `He knows ${s.name}; no project on the site names it.`).join(" "),
    keys: ["skills", "skill", "technologies", "tech stack", "know", "proficient", "expertise", g.label, ...g.skills.map((s) => s.name)],
    links: [{ label: "See skills", section: "skills" }],
  }))];
}

function profileDocs(): Doc[] {
  const edu = journey.find((j) => j.phase === "Education");
  const school = journey.find((j) => j.phase === "School");
  const direction = journey.find((j) => j.phase === "Direction");
  return [
    {
      id: "about",
      title: "About Mehul",
      answer:
        `**${profile.name}** (${profile.location}) is an ${profile.summary.charAt(0).toLowerCase() === "a" ? profile.summary : profile.summary.toLowerCase()} ` +
        "He works across computer vision, NLP and LLM-powered agents, taking models from training and evaluation to optimised inference and production APIs.",
      keys: ["who", "who is", "about", "mehul", "dadhich", "introduce", "yourself", "him", "background", "summary", "profile", "bio"],
      links: [{ label: "About & journey", section: "journey" }],
    },
    {
      id: "education",
      title: "Education",
      answer: `${edu ? `**${edu.title}** at ${edu.body.replace(" · ", ", ")} (${edu.when}).` : ""} ${school ? `School: ${school.title}. ${school.body}` : ""}`,
      keys: ["education", "degree", "college", "university", "vit", "vit-ap", "btech", "b.tech", "study", "studied", "cgpa", "gpa", "grades", "marks", "school", "cbse", "graduate", "graduation", "qualification"],
      links: [{ label: "See journey", section: "journey" }],
    },
    {
      id: "certifications",
      title: "Certifications",
      answer: "Certifications: " + certifications.map((c) => `**${c.short}** (${c.issuer}${c.year ? `, ${c.year}` : ""})`).join(", ") + ".",
      keys: ["certification", "certifications", "certificate", "certified", "oracle", "oci", "hedera", "coursera", "ibm", "blackbucks", "courses", "credentials"],
      links: [{ label: "See certifications", section: "achievements" }],
    },
    {
      id: "direction",
      title: "What he's looking for",
      answer: `${direction?.body ?? "Mehul is looking for AI/ML engineering roles."} The quickest way to reach him is email: **${profile.email}**.`,
      keys: ["available", "availability", "hire", "hiring", "open to work", "looking for", "job", "role", "opportunity", "opportunities", "recruit", "position", "full time", "notice period", "relocate", "join"],
      links: [{ label: "Contact", section: "contact" }, { label: "Download resume", href: profile.resume }],
    },
    {
      id: "contact",
      title: "Contact",
      answer: `You can reach Mehul at **${profile.email}** or **${profile.phone}**. He's also on LinkedIn and GitHub.`,
      keys: ["contact", "email", "mail", "phone", "number", "call", "reach", "linkedin", "github", "connect", "message", "get in touch", "socials"],
      links: [
        { label: "LinkedIn", href: profile.linkedin },
        { label: "GitHub", href: profile.github },
        { label: "Contact section", section: "contact" },
      ],
    },
    {
      id: "resume",
      title: "Resume",
      answer: "Here's Mehul's resume as a PDF. It covers his internship, projects, skills, education and certifications.",
      keys: ["resume", "cv", "curriculum vitae", "pdf", "download"],
      links: [{ label: "Download resume", href: profile.resume }],
    },
    {
      id: "location",
      title: "Location",
      answer: `Mehul is based in **${profile.location}**. His internship at Infrax.ai was remote.`,
      keys: ["where", "location", "based", "city", "live", "lives", "country", "india", "delhi", "remote"],
    },
    {
      id: "projects.all",
      title: "All projects",
      answer:
        // one line per project, so "any other projects?" gets substance and a small model keeps the projects apart
        `Mehul has ${projects.length} separate main systems:\n` +
        projects.map((p) => `- **${p.title}** (${p.kicker}): ${p.solution}` +
          (p.github ? " Its code is public on GitHub." : "")).join("\n") +
        "\nRoadGuard is the featured one, with a full scroll-through of its pipeline.",
      keys: ["projects", "project", "portfolio", "built", "build", "made", "work samples", "what has he built", "systems", "apps"],
      links: [{ label: "See all projects", section: "work" }, { label: "RoadGuard", section: "featured" }],
    },
    {
      id: "strengths",
      title: "Why Mehul",
      answer:
        "In short: he has shipped computer vision to **live production CCTV** at Infrax.ai, built a two-tier accident detector verified by a " +
        "**vision-language model** and evaluated it on held-out benchmark clips and site footage (25.2 ms per frame, 0.47 s per VLM verdict), " +
        "and builds **LLM agents and RAG systems**: ASTRA, the operations agent in Infrax.ai's video management system, and Arc, with its QLoRA fine-tune. He works across the stack, from " +
        "fine-tuning, evaluation and inference optimization to FastAPI services, databases and dashboards.",
      keys: ["why hire", "why should", "strengths", "strong", "best at", "good at", "stand out", "unique", "value", "impressive", "fit"],
      links: [{ label: "RoadGuard results", section: "featured" }, { label: "Experience", section: "experience" }],
    },
    {
      id: "genai",
      title: "LLM and agent work",
      answer:
        "On the LLM side, Mehul built the **AI Task Manager**, a LangGraph agent that turns plain-language instructions into structured tasks using Gemini, " +
        "with a keyword fallback when the model is down; at Infrax.ai he built **ASTRA**, a tool-calling operations agent on a self-hosted Qwen3-4B that answers from live data within each operator's permissions; and **Arc**, a RAG assistant with hybrid search on a self-hosted Llama 3.2 3B that acts on the page only after the visitor agrees. " +
        "He fine-tuned Arc's earlier model with **QLoRA** and evaluated it on held-out questions. In RoadGuard he uses a **vision-language model (Qwen3-VL)** to verify accidents. " +
        "He also lists multi-agent systems, MCP, re-ranking and vector databases among his skills, though no project on this site uses them yet.",
      keys: ["llm", "llms", "genai", "generative ai", "gen ai", "agent", "agents", "agentic", "langgraph", "langchain", "rag", "chatgpt", "gpt", "nlp", "language model", "prompt"],
      links: [{ label: "AI Task Manager", section: "work" }, { label: "Skills", section: "skills" }],
    },
    {
      id: "cv",
      title: "Computer vision work",
      answer:
        "Computer vision is Mehul's core area: **YOLOv8/YOLO11** detection on live RTSP CCTV at Infrax.ai (TMCS), the **RoadGuard** accident detector " +
        "(two YOLOv8s detectors, ByteTrack, a kinematic rules engine and Qwen3-VL verification), and the **Warehouse Monitoring System** with tracking and licence-plate recognition.",
      keys: ["computer vision", "cv", "vision", "yolo", "opencv", "detection", "object detection", "tracking", "image", "video", "cctv", "camera"],
      links: [{ label: "RoadGuard", section: "featured" }, { label: "Projects", section: "work" }],
    },
  ];
}

function siteDocs(): Doc[] {
  return [
    {
      id: "site.tech",
      title: "How this site is built",
      answer:
        "This is Mehul's portfolio site, built with **Next.js 16, React 19, TypeScript and Tailwind CSS**. Animations use **Motion** and **GSAP** (ScrollTrigger, SplitText), smooth scrolling uses **Lenis**, " +
        "and the diffusion hero, RoadGuard simulation and LiDAR point cloud are hand-written **Canvas 2D**. It's hosted on Vercel.",
      keys: ["site", "website", "portfolio site", "this site", "built", "made", "tech", "nextjs", "next.js", "react", "animation", "gsap", "framer", "motion", "hosted", "vercel", "design"],
      links: [{ label: "Source on GitHub", href: "https://github.com/MehulDadhich/mehul-portfolio" }],
    },
    {
      id: "site.bot",
      title: "How Arc works",
      answer:
        "I'm **Arc**, Mehul's AI portfolio assistant, and I don't use any third-party AI such as ChatGPT, Claude or Gemini. I'm a **generative RAG (retrieval-augmented generation)** system: " +
        "your question is matched against a knowledge base generated from this site's content using **hybrid retrieval** (BM25 keyword search plus **bge-small** vector embeddings), " +
        "then an open-weight language model, **Llama 3.2 3B Instruct** running on Mehul's own server, writes the answer from only the retrieved facts and our conversation so far. " +
        "Mehul also fine-tuned an earlier version of my model with QLoRA; a later fine-tune scored below its base model, so I now run the stock model with stronger retrieval.",
      keys: ["arc", "bot", "assistant", "chatbot", "rag", "retrieval augmented generation", "bm25", "embeddings", "vector", "llm", "model", "llama", "how do you work", "no api"],
    },
    {
      id: "web",
      title: "Web development",
      answer:
        "Mehul builds full-stack web applications as well as models: the **Warehouse Monitoring System** has a React + TypeScript dashboard on a FastAPI backend with WebSockets, " +
        "the **AI Task Manager** pairs a React (Vite) frontend with a Node.js/Express API and Firebase, and this portfolio is a **Next.js** site. " +
        "His skills include React, Node.js, FastAPI, REST APIs, WebSockets, PostgreSQL, Docker and Nginx.",
      keys: ["website", "web", "site", "web development", "frontend", "front end", "backend", "full stack", "fullstack", "react", "nextjs", "web app", "develop a site", "build a website", "dashboard"],
      links: [{ label: "Projects", section: "work" }, { label: "Skills", section: "skills" }],
    },
    {
      id: "site.easter",
      title: "Easter egg",
      answer: "Try typing **y o l o** anywhere on the page (outside this chat). And **Ctrl + K** opens or closes me (Arc) from anywhere.",
      keys: ["easter egg", "secret", "hidden", "trick", "fun", "yolo", "shortcut", "keyboard", "ctrl k"],
    },
  ];
}

export const KNOWLEDGE: Doc[] = [...profileDocs(), ...experienceDocs(), ...projectDocs(), ...skillDocs(), ...siteDocs()];

/** Every skill name with the projects it was used in, for exact "does he know X?" answers. */
export const SKILL_INDEX: { name: string; group: string; used: string[] }[] = skillGroups.flatMap((g) =>
  g.skills.map((s) => ({ name: s.name, group: g.label, used: s.used.map(evidenceLabel) }))
);
