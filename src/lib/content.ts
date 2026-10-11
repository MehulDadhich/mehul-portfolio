/**
 * Single source of truth for everything the site says about Mehul.
 * Sources: resume.pdf (primary) and the READMEs / reports of the project repos.
 * Do not add anything here that cannot be traced back to one of those.
 */

export const profile = {
  name: "Mehul Dadhich",
  role: "AI / ML Engineer",
  location: "Delhi, India",
  email: "mehuldadhich1103@gmail.com",
  phone: "+91 9217447371",
  linkedin: "https://linkedin.com/in/mehul-dadhich-959b7024b",
  github: "https://github.com/MehulDadhich",
  resume: "/Mehul-Dadhich-Resume.pdf",
  statement:
    "I build AI systems across computer vision, vision-language models, voice AI, RAG and LLM agents, and I take them past the notebook: fine-tuning and evaluating models, optimising inference, and shipping them behind APIs and data pipelines that real products depend on.",
  summary:
    "AI/ML engineer with six months of industry internship experience building and deploying real-time computer-vision systems and developing LLM-powered agent and NLP applications.",
} as const;

export type Category = "cv" | "genai" | "fullstack" | "industry";

export const categories: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cv", label: "Computer Vision" },
  { id: "genai", label: "Generative AI & NLP" },
  { id: "fullstack", label: "Full Stack" },
  { id: "industry", label: "Industry" },
];

export type Stage = { id: string; label: string; detail: string };

export type Project = {
  id: string;
  title: string;
  kicker: string;
  categories: Category[];
  problem: string;
  solution: string;
  stack: string[];
  architecture: Stage[];
  highlights: string[];
  github?: string;
  /** Shown when there is no public repository to link to. */
  linkNote?: string;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    id: "roadguard",
    title: "RoadGuard",
    kicker: "Two-tier accident detection with a VLM",
    categories: ["cv", "genai"],
    featured: true,
    problem:
      "Highway CCTV produces hours of footage that nobody watches live. Accidents need to be caught in seconds without drowning operators in false alarms from normal traffic.",
    solution:
      "A two-tier pipeline that runs fully offline. Tier 1 runs on every frame: detection, tracking and a kinematic rules engine raise an immediate alert. Tier 2 sends uncertain events to a local vision-language model, which confirms or rejects them with a yes or no.",
    stack: ["Python", "YOLOv8s", "ByteTrack", "Qwen3-VL", "PyTorch", "Hugging Face Transformers", "TensorRT", "OpenCV", "pytest"],
    architecture: [
      { id: "video", label: "Video in", detail: "RTSP cameras, webcams and files. Live sources reconnect with backoff when a camera drops, and a 5-second frame buffer in memory keeps recent frames for the VLM." },
      { id: "detect", label: "Detect", detail: "Two YOLOv8s models merged into one class space: one fine-tuned on Indian highway cameras for cars, motorcycles, buses and trucks, and stock COCO weights for pedestrians and cyclists. A TensorRT INT8 engine runs when available, PyTorch FP16 otherwise." },
      { id: "track", label: "Track", detail: "ByteTrack keeps a persistent ID on every road user, and a track counts only after three confirming detections." },
      { id: "rules", label: "Rules", detail: "Tier 1. A kinematic rules engine reads new box overlaps, sudden speed drops in km/h, vanishing vehicles and pile-ups, and fuses two different weak signals into one event. Events at confidence 0.6 or above alert immediately." },
      { id: "vlm", label: "VLM", detail: "Tier 2. Uncertain events, events involving pedestrians or two-wheelers, and a scan every 30 seconds go to a local Qwen3-VL-2B on its own thread. It answers only yes or no, so Tier 1 never waits for it." },
      { id: "alert", label: "Incident", detail: "Each accident becomes one incident with at most one immediate alert and one VLM confirmation, logged with snapshots and sent to webhook or SMS endpoints on the local network. A health file reports the pipeline's status every 5 seconds." },
    ],
    highlights: [
      "Fully offline: no frame leaves the site",
      "Evaluated on held-out benchmark clips and a 6.5-hour shadow run on five site cameras",
      "Whole pipeline in 4.26 GB of GPU memory on a 6 GB laptop GPU",
    ],
    linkNote: "Code walkthrough available on request",
  },
  {
    id: "warehouse",
    title: "Warehouse Monitoring System",
    kicker: "Warehouse intelligence platform",
    categories: ["cv", "fullstack"],
    problem:
      "Warehouses run many cameras but still log vehicles and people by hand, and operators find out a camera is down only when they need its footage.",
    solution:
      "A full-stack platform that runs YOLO11 on RTSP cameras, reads licence plates at the gate, streams events to live dashboards and gives each role the controls it needs.",
    stack: ["Python", "YOLO11", "OpenCV", "EasyOCR", "FastAPI", "WebSockets", "PostgreSQL", "Redis", "React", "Docker Compose", "Nginx"],
    architecture: [
      { id: "rtsp", label: "RTSP cameras", detail: "Camera streams read with OpenCV, with health checks and downtime logs per camera." },
      { id: "detect", label: "YOLO11", detail: "Detects and tracks vehicles and people in real time for counting and zone occupancy." },
      { id: "anpr", label: "ANPR", detail: "EasyOCR reads licence plates on vehicle entry and exit, with a confidence score on every read." },
      { id: "api", label: "FastAPI", detail: "REST APIs over PostgreSQL for vehicle and people records, camera status and alerts." },
      { id: "ws", label: "WebSocket", detail: "Event streams push detections and alerts to the dashboard as they happen." },
      { id: "ui", label: "Dashboard", detail: "React dashboards behind Nginx, with JWT/OAuth2 auth and roles for administrators, managers and operators." },
    ],
    highlights: [
      "Vehicle entry and exit tracking with ANPR",
      "Role-based access: admin, manager, operator",
      "Containerised with Docker Compose and Nginx",
    ],
    github: "https://github.com/MehulDadhich/Warehouse-Monitoring-System",
  },
  {
    id: "task-agent",
    title: "AI Task Manager",
    kicker: "LLM agent for task planning",
    categories: ["genai", "fullstack"],
    problem:
      "Task apps make people fill in priority, category and due date by hand, so quick notes like “submit the report by Friday, it's urgent” never become organised tasks.",
    solution:
      "An agentic workflow that turns a plain-language instruction into a structured task with priority, category and due date, and sends real-time alarms before it is due.",
    stack: ["Python", "LangChain", "LangGraph", "Google Gemini", "Node.js", "Express", "Firebase", "Socket.IO", "React"],
    architecture: [
      { id: "input", label: "Instruction", detail: "The user writes a task in natural language." },
      { id: "agent", label: "LangGraph", detail: "An agentic workflow coordinates interpretation, state management and tool execution across steps." },
      { id: "llm", label: "Gemini", detail: "Classifies priority and category, extracts natural-language dates and schedules the task. Falls back to keyword rules if the AI service is unavailable." },
      { id: "store", label: "Firestore", detail: "Protected Express REST endpoints with Firebase Authentication; tasks persist in Firestore." },
      { id: "alarm", label: "Alarms", detail: "Socket.IO pushes real-time alarm notifications for tasks that are coming due." },
    ],
    highlights: [
      "Natural language in, structured task out",
      "Keeps working when the LLM is down",
      "Real-time alarms over Socket.IO",
    ],
    github: "https://github.com/MehulDadhich/ai-task-manager",
  },
  {
    id: "astra",
    title: "ASTRA",
    kicker: "Industry · Infrax.ai · AI operations agent",
    categories: ["genai", "industry"],
    problem:
      "Operators of Cygnus, Infrax.ai's video management system, work across dozens of pages and a constant stream of cameras, events and incidents. A simple question like \u201cwhat needs my attention?\u201d or \u201cis PTS2134 online?\u201d takes many clicks.",
    solution:
      "An AI assistant built into Cygnus. Operators ask in plain language, and an agent answers from live data through tools that run with the operator's own permissions and site scope, explains features from the product docs, and proposes changes behind a confirmation card. It runs on a self-hosted Qwen3-4B on CPU.",
    stack: ["TypeScript", "Node.js", "Fastify", "React", "Python", "FastAPI", "llama.cpp", "Qwen3-4B", "BM25", "bge-small embeddings", "PostgreSQL", "Prometheus", "Vitest", "pytest"],
    architecture: [
      { id: "ask", label: "Ask", detail: "An ASTRA panel on every page of Cygnus. Operators ask about cameras, recordings, events, incidents and the estate, or ask to be taken to a page." },
      { id: "fastpath", label: "Fast path", detail: "Common questions, such as counts, today's incidents or a camera's status, are recognised in code and answered from live data in about 0.1 s, without the model." },
      { id: "agent", label: "Agent", detail: "Everything else goes to an agent loop on the Node server, where Qwen3-4B picks from dozens of tools. Each tool calls the server's own routes with the operator's token, so permissions and site scope always apply." },
      { id: "rag", label: "Docs RAG", detail: "Feature questions are answered from the product docs: BM25 and bge-small search fused with reciprocal rank fusion, with chunks that name an exact identifier ranked first." },
      { id: "confirm", label: "Confirm", detail: "Changes such as PTZ moves, renames or tracking a number plate are proposed as a confirmation card and run only when the operator confirms. Admin-only changes are escalated to administrators." },
      { id: "inference", label: "Inference", detail: "Qwen3-4B Q4_K_M on llama.cpp, on CPU, behind a token-protected service with Prometheus metrics. The warmed prompt is saved and restored, so a restart is ready in 6 s instead of 51 s." },
    ],
    highlights: [
      "Answers respect each operator's permissions and site scope",
      "Code-written answers for common questions in about 0.1 s",
      "Cold start cut from 51 s to 6 s with a saved prompt cache",
    ],
    linkNote: "Proprietary work at Infrax.ai",
  },
  {
    id: "arc",
    title: "Arc",
    kicker: "RAG assistant on this site, with a QLoRA fine-tune",
    categories: ["genai", "fullstack"],
    problem:
      "Recruiters arrive with specific questions, like whether he has used Firebase or whether a project's code is public. A static page can't answer them, and a generic chatbot makes things up.",
    solution:
      "A retrieval-augmented generation (RAG) assistant on a self-hosted open-weight model. It answers only from facts retrieved from this site, remembers each visitor's conversation and acts on the page after asking. Its earlier model was fine-tuned with QLoRA and evaluated against the base model on held-out questions.",
    stack: ["Python", "FastAPI", "llama.cpp", "Llama 3.2 3B", "Qwen2.5-1.5B", "QLoRA / PEFT", "bitsandbytes", "BM25", "bge-small embeddings", "Firebase", "Next.js", "pytest"],
    architecture: [
      { id: "search", label: "Hybrid search", detail: "The site's content is exported into a knowledge base. BM25 keyword search and bge-small dense embeddings are fused, with a boost for the project being asked about and a relevance floor that drops weak matches." },
      { id: "prompt", label: "Prompt", detail: "Instructions, the visitor's notes, the retrieved facts and the recent turns are packed into a 3,000-token budget." },
      { id: "llm", label: "Llama 3.2 3B", detail: "Served by llama.cpp as a 4-bit GGUF and streamed token by token. The model sits behind one interface, so switching to a hosted model is a configuration change." },
      { id: "actions", label: "Actions", detail: "Rules decide when a message asks for an action: scroll to a section, download the resume, open a repository. Arc offers it with Yes and No buttons and runs it only after the visitor agrees." },
      { id: "memory", label: "Memory", detail: "Conversations and short notes about the visitor are stored in Firestore under an anonymous Firebase sign-in, so no visitor can read another's." },
      { id: "qlora", label: "QLoRA fine-tune", detail: "Qwen2.5-1.5B in 4-bit NF4 with rank-16 LoRA adapters on every projection (18.5M trainable parameters, 1.18%), trained on 745 grounded examples built from Arc's own retrieval in 46 minutes on an RTX 3050, then merged and quantized to GGUF." },
      { id: "eval", label: "Evaluation", detail: "Base and fine-tuned models compared on 105 held-out questions, scored on the facts each answer must contain. A later Qwen3-4B fine-tune scored below its base model, so Arc now serves a stock model with stronger retrieval." },
    ],
    highlights: [
      "QLoRA fact recall: 71% → 90% on document questions, 46% → 76% on reasoning",
      "Self-hosted open-weight model, no third-party AI API",
      "70 automated tests for retrieval, prompts, actions and memory",
    ],
    linkNote: "Running on this site: press Ctrl + K",
  },
  {
    id: "rehearse",
    title: "Rehearse",
    kicker: "AI mock interviewer with voice and a scored debrief",
    categories: ["genai", "fullstack"],
    problem:
      "Interview practice usually means reading questions off a list. Nobody asks a follow-up when an answer is vague, and nobody says afterwards what was actually weak about it.",
    solution:
      "A voice-first mock interviewer. It speaks each question, listens to the spoken answer, probes vague answers with follow-ups like a real first round, and ends with a written debrief scored against a rubric, with a stronger version of every answer.",
    stack: ["Python", "FastAPI", "Groq", "gpt-oss-120b", "Whisper", "Web Speech API", "React", "Vite", "Framer Motion", "Vercel"],
    architecture: [
      { id: "setup", label: "Setup", detail: "The candidate picks a role, seniority, style (behavioral, technical or mixed) and length, can paste a job description to tailor the questions, and tests the mic." },
      { id: "voice", label: "Voice", detail: "The browser's Web Speech API speaks each question and transcribes the answer, sent after a short pause. If the browser's speech service is unreachable, the answer is recorded and transcribed on the server with Whisper large-v3-turbo." },
      { id: "interviewer", label: "Interviewer", detail: "gpt-oss-120b on Groq replies with JSON: what to say, and whether it is a new question, a follow-up or the close. Every reply is checked against a JSON Schema and requested again if it is invalid or cut off." },
      { id: "state", label: "State machine", detail: "The FastAPI server, not the model, keeps the interview on track: it counts main questions, caps follow-ups at two per question, and tells the model when to move on or wrap up, so every interview ends on time." },
      { id: "proctor", label: "Proctoring", detail: "Leaving the tab gives a warning and the third ends the interview. Browser extensions that change the page, such as AI sidebars and writing assistants, are detected and block the start." },
      { id: "debrief", label: "Debrief", detail: "The full transcript is scored by the model as a judge, against a rubric: an overall score, five dimensions (clarity, depth, structure, relevance, evidence), notes per question, a stronger answer in the candidate's own words and what to practise next. Exportable as PDF." },
    ],
    highlights: [
      "Real follow-ups on vague answers, with the server enforcing the interview's length",
      "Every model reply validated against a JSON Schema and retried if invalid",
      "Server-side Whisper fallback when the browser can't do speech recognition",
    ],
    github: "https://github.com/MehulDadhich/ai-mock-interviewer",
  },
  {
    id: "tmcs",
    title: "Traffic Management & Control System",
    kicker: "Industry · Infrax.ai",
    categories: ["cv", "industry"],
    problem:
      "Traffic operators need to know about stopped vehicles, accidents, fire, smoke and fallen objects on the road the moment they happen, across many live cameras.",
    solution:
      "The computer-vision module of an Advanced Traffic Management System: continuous RTSP ingestion, YOLO detection, and incident events delivered to operators through APIs, dashboards and alerts.",
    stack: ["YOLOv8", "YOLO11", "Python", "OpenCV", "MediaMTX", "FFmpeg", "FastAPI", "PostgreSQL"],
    architecture: [
      { id: "cctv", label: "CCTV / IP", detail: "Live RTSP streams from CCTV and IP cameras." },
      { id: "ingest", label: "Ingest", detail: "Continuous video ingestion with Python, OpenCV, MediaMTX and FFmpeg." },
      { id: "detect", label: "YOLO", detail: "YOLOv8 and YOLO11 identify road users and flag stopped vehicles, accidents, fire, smoke and fallen objects." },
      { id: "events", label: "Incidents", detail: "Model detections are converted into incident events." },
      { id: "api", label: "FastAPI", detail: "Events flow through FastAPI REST endpoints into PostgreSQL." },
      { id: "ops", label: "Operators", detail: "Monitoring dashboards and real-time alerts for downstream operators." },
    ],
    highlights: [
      "Deployed for continuous CCTV processing",
      "Tuned frame latency and stream-failure handling",
      "Optimised resource use and inference speed",
    ],
    linkNote: "Proprietary work at Infrax.ai",
  },
];

/** Measured results from the RoadGuard repository's README and evaluation reports. */
export const roadguardMetrics = [
  { value: "25.2 ms", label: "Tier-1 latency p50", note: "Per frame · held-out test clips · RTX 3050 laptop" },
  { value: "0.47 s", label: "VLM verdict p50", note: "Yes/no prompt · down from 5.5 s" },
  { value: "3.6 s", label: "Median time to alert", note: "After impact · 145 held-out accident clips" },
  { value: "4.26 GB", label: "Peak GPU memory", note: "Two YOLO models + Qwen3-VL-2B · 6 GB GPU" },
];

export const roadguardLessons = [
  {
    title: "One rule is never enough",
    body: "In a real side impact the two boxes peaked at IoU 0.21, under the 0.3 contact threshold. A multi-signal rule now fuses two different weak cues, here a sudden stop and a vanishing vehicle 0.04 s apart, so impacts like that one are caught.",
  },
  {
    title: "Ask the VLM a smaller question",
    body: "Switching the verifier from a detailed JSON prompt to a yes/no question cut median VLM latency from 5.5 s to 0.47 s, and Tier 1 got its GPU time back.",
  },
  {
    title: "Precision before model size",
    body: "Quantized to 4-bit, Qwen3-VL-2B said “accident” to nearly every normal-traffic frame. In bf16 it rejected 11 of 11 normal frames and still confirmed 9 of 9 crashes.",
  },
  {
    title: "Give the VLM less context",
    body: "Listing every vehicle in view made the VLM read unrelated vehicles as a collision. Listing only the tracks the rule flagged took normal frames rejected from 0 of 3 to 3 of 3.",
  },
];

export const experience = {
  company: "Infrax.ai",
  role: "AI Engineer Intern",
  period: "Jan 2026 – Jul 2026",
  mode: "Remote",
  system: "TMCS · computer-vision module of an ATMS",
  watches: ["Road users", "Stopped vehicles", "Accidents", "Fire", "Smoke", "Fallen objects"],
  work: [
    { verb: "Detect", body: "Developed the Traffic Management and Control System (TMCS) using YOLOv8 and YOLO11 to identify road users and flag incidents in live CCTV feeds." },
    { verb: "Ingest", body: "Built continuous video-ingestion and inference workflows for RTSP CCTV and IP-camera streams with Python, OpenCV, MediaMTX and FFmpeg." },
    { verb: "Integrate", body: "Converted detections into incident events and connected the pipeline to FastAPI REST endpoints, PostgreSQL, monitoring dashboards and real-time alerts." },
    { verb: "Optimise", body: "Optimised and deployed the pipeline for continuous CCTV processing, addressing frame latency, stream failures, resource use and inference performance." },
  ],
};

export type Evidence = { id: string; label: string };
export const evidence: Evidence[] = [
  { id: "tmcs", label: "Infrax.ai TMCS" },
  { id: "roadguard", label: "RoadGuard" },
  { id: "warehouse", label: "Warehouse Monitoring" },
  { id: "task-agent", label: "AI Task Manager" },
  { id: "astra", label: "ASTRA" },
  { id: "arc", label: "Arc" },
  { id: "rehearse", label: "Rehearse" },
];

export type SkillGroup = { id: string; label: string; skills: { name: string; used: string[] }[] };
export const skillGroups: SkillGroup[] = [
  {
    id: "cv",
    label: "Computer Vision",
    skills: [
      { name: "YOLOv8", used: ["tmcs", "roadguard"] },
      { name: "YOLO11", used: ["tmcs", "warehouse"] },
      { name: "Ultralytics", used: ["roadguard", "warehouse"] },
      { name: "OpenCV", used: ["tmcs", "roadguard", "warehouse"] },
      { name: "Object detection", used: ["tmcs", "roadguard", "warehouse"] },
      { name: "Object tracking", used: ["roadguard", "warehouse"] },
      { name: "Detector fine-tuning", used: ["roadguard"] },
      { name: "LSTM", used: [] },
    ],
  },
  {
    id: "vlm",
    label: "Vision-Language Models",
    skills: [
      { name: "Qwen3-VL", used: ["roadguard"] },
      { name: "VLM verification", used: ["roadguard"] },
      { name: "Multimodal prompting", used: ["roadguard"] },
      { name: "VLM benchmarking", used: ["roadguard"] },
    ],
  },
  {
    id: "voice",
    label: "Speech & Voice AI",
    skills: [
      { name: "Speech-to-text (Whisper)", used: ["rehearse"] },
      { name: "Text-to-speech", used: ["rehearse"] },
      { name: "Web Speech API", used: ["rehearse"] },
      { name: "Voice interfaces", used: ["rehearse"] },
      { name: "Audio recording (WAV)", used: ["rehearse"] },
    ],
  },
  {
    id: "agents",
    label: "Agentic AI",
    skills: [
      { name: "AI agents", used: ["task-agent", "astra"] },
      { name: "LangGraph", used: ["task-agent"] },
      { name: "LangChain", used: ["task-agent"] },
      { name: "Tool calling", used: ["task-agent", "astra"] },
      { name: "Multi-agent systems", used: [] },
      { name: "MCP", used: [] },
      { name: "Human-in-the-loop actions", used: ["arc", "astra"] },
      { name: "Conversational AI", used: ["rehearse", "arc", "astra"] },
      { name: "Conversation state machines", used: ["rehearse"] },
      { name: "Prompt-injection guarding", used: ["rehearse"] },
      { name: "Intent classification", used: ["task-agent"] },
      { name: "Prompt engineering", used: ["task-agent", "roadguard", "arc", "astra", "rehearse"] },
    ],
  },
  {
    id: "rag",
    label: "RAG & Retrieval",
    skills: [
      { name: "RAG", used: ["arc", "astra"] },
      { name: "Hybrid search (BM25 + dense)", used: ["arc", "astra"] },
      { name: "Embeddings", used: ["arc", "astra"] },
      { name: "Re-ranking", used: [] },
      { name: "Vector databases", used: [] },
      { name: "Conversation memory", used: ["arc"] },
    ],
  },
  {
    id: "llm",
    label: "LLMs & Fine-tuning",
    skills: [
      { name: "LLM applications", used: ["task-agent", "arc", "astra", "rehearse"] },
      { name: "LoRA / QLoRA", used: ["arc"] },
      { name: "PEFT", used: ["arc"] },
      { name: "Post-training (SFT)", used: ["arc"] },
      { name: "Training-data generation", used: ["arc"] },
      { name: "Open-weight models", used: ["arc", "roadguard"] },
      { name: "Structured outputs (JSON Schema)", used: ["rehearse"] },
      { name: "Reasoning models (gpt-oss)", used: ["rehearse"] },
      { name: "Hosted LLM APIs (Groq)", used: ["rehearse"] },
    ],
  },
  {
    id: "eval",
    label: "Evaluation & Observability",
    skills: [
      { name: "LLM evaluation", used: ["arc"] },
      { name: "Agent evaluation", used: [] },
      { name: "Held-out benchmarks", used: ["roadguard", "arc"] },
      { name: "LLM-as-a-judge rubric scoring", used: ["rehearse"] },
      { name: "Shadow testing", used: ["roadguard"] },
      { name: "AI observability", used: ["roadguard", "astra"] },
      { name: "Tracing & structured logs", used: ["roadguard"] },
    ],
  },
  {
    id: "inference",
    label: "Inference & Optimization",
    skills: [
      { name: "Model inference", used: ["tmcs", "roadguard", "warehouse", "arc", "astra"] },
      { name: "TensorRT (INT8)", used: ["roadguard"] },
      { name: "FP16 / bf16", used: ["roadguard"] },
      { name: "Quantization (4/8-bit, GGUF)", used: ["roadguard", "arc", "astra"] },
      { name: "llama.cpp", used: ["arc", "astra"] },
      { name: "CUDA", used: ["roadguard"] },
      { name: "Latency optimization", used: ["tmcs", "roadguard", "astra"] },
    ],
  },
  {
    id: "ml",
    label: "ML & Deep Learning",
    skills: [
      { name: "PyTorch", used: ["roadguard", "arc"] },
      { name: "Hugging Face Transformers", used: ["roadguard", "arc"] },
      { name: "NumPy", used: ["roadguard"] },
    ],
  },
  {
    id: "video",
    label: "Video & Streaming",
    skills: [
      { name: "RTSP", used: ["tmcs", "roadguard", "warehouse"] },
      { name: "FFmpeg", used: ["tmcs"] },
      { name: "MediaMTX", used: ["tmcs"] },
      { name: "Multithreading", used: ["roadguard"] },
    ],
  },
  {
    id: "backend",
    label: "Backend & Data",
    skills: [
      { name: "FastAPI", used: ["tmcs", "warehouse", "arc", "astra", "rehearse"] },
      { name: "REST APIs", used: ["tmcs", "warehouse", "task-agent", "arc", "rehearse"] },
      { name: "PostgreSQL", used: ["tmcs", "warehouse", "astra"] },
      { name: "MySQL", used: [] },
      { name: "Firebase", used: ["task-agent", "arc"] },
      { name: "Node.js", used: ["task-agent", "astra"] },
      { name: "React", used: ["warehouse", "task-agent", "astra", "rehearse"] },
      { name: "Next.js", used: ["arc"] },
      { name: "Vite", used: ["rehearse"] },
      { name: "Framer Motion", used: ["rehearse"] },
      { name: "Rate limiting", used: ["rehearse"] },
    ],
  },
  {
    id: "lang",
    label: "Languages",
    skills: [
      { name: "Python", used: ["tmcs", "roadguard", "warehouse", "task-agent", "arc", "astra", "rehearse"] },
      { name: "SQL", used: ["tmcs", "warehouse"] },
      { name: "JavaScript", used: ["task-agent", "rehearse"] },
      { name: "TypeScript", used: ["arc", "astra"] },
      { name: "Java", used: [] },
    ],
  },
  {
    id: "tools",
    label: "DevOps & Tools",
    skills: [
      { name: "Docker Compose", used: ["warehouse"] },
      { name: "Nginx", used: ["warehouse"] },
      { name: "Vercel", used: ["rehearse"] },
      { name: "Git & GitHub", used: ["roadguard", "warehouse", "task-agent", "arc", "rehearse"] },
      { name: "Linux", used: [] },
      { name: "Unit testing", used: ["roadguard", "arc", "astra"] },
    ],
  },
];

export type JourneyStep = { phase: string; when?: string; title: string; body: string; points?: string[] };
export const journey: JourneyStep[] = [
  {
    phase: "School",
    when: "2019 – 2021",
    title: "DAV Public School, Ashok Vihar",
    body: "Class X (CBSE) with 90.2% in 2019 and Class XII (CBSE) with 86% in 2021.",
  },
  {
    phase: "Education",
    when: "2022 – 2026",
    title: "B.Tech CSE, Artificial Intelligence & Machine Learning",
    body: "VIT-AP University · CGPA 7.67 / 10.",
  },
  {
    phase: "Projects",
    title: "From models to working systems",
    body: "Built an LLM task agent, a warehouse surveillance platform, a two-tier accident detection pipeline verified by a vision-language model, Arc, a RAG assistant with its own QLoRA fine-tune, and Rehearse, a voice-first AI mock interviewer. At Infrax.ai, built ASTRA, the AI operations agent inside the Cygnus video management system.",
    points: ["AI Task Manager", "Warehouse Monitoring System", "RoadGuard", "Arc", "Rehearse", "ASTRA"],
  },
  {
    phase: "Certifications",
    when: "2025",
    title: "Oracle Generative AI Professional and more",
    body: "Certified in generative AI on Oracle Cloud Infrastructure, plus Hedera developer certifications.",
  },
  {
    phase: "Industry",
    when: "Jan – Jul 2026",
    title: "AI Engineer Intern at Infrax.ai",
    body: "Shipped the computer-vision module of a traffic management system on live CCTV.",
  },
  {
    phase: "Direction",
    when: "Now",
    title: "Real-time vision, VLMs and agentic AI",
    body: "Looking for AI/ML engineering roles where models have to work on live, messy, real-world data.",
  },
];

export type Cert = { title: string; short: string; issuer: string; year?: string; relevance: string };
export const certifications: Cert[] = [
  {
    title: "Oracle Cloud Infrastructure 2025 Certified Generative AI Professional",
    short: "OCI Generative AI Professional",
    issuer: "Oracle",
    year: "2025",
    relevance: "Generative AI and LLM applications on a production cloud platform.",
  },
  {
    title: "Hedera Certified Developer Associate (HCDA)",
    short: "Hedera Developer Associate",
    issuer: "Hedera",
    relevance: "Developer-level certification on the Hedera network.",
  },
  {
    title: "Hedera Certified Foundation (HCF)",
    short: "Hedera Foundation",
    issuer: "Hedera",
    relevance: "Foundation certification on Hedera and distributed ledgers.",
  },
  {
    title: "Generative AI and ChatGPT",
    short: "Generative AI and ChatGPT",
    issuer: "BlackBucks Education",
    relevance: "Applied generative AI and prompt-driven workflows.",
  },
  {
    title: "Introduction to Software Engineering",
    short: "Intro to Software Engineering",
    issuer: "IBM · Coursera",
    relevance: "Software development life cycle and engineering practice.",
  },
];

export const sections = [
  { id: "work", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "journey", label: "Journey" },
  { id: "contact", label: "Contact" },
] as const;
