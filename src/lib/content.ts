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
    "I build machine-learning systems across computer vision, NLP and LLM-powered agents, and I take them past the notebook: training and evaluating models, optimising inference, and shipping them behind APIs and data pipelines that real products depend on.",
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
    kicker: "Real-time accident detection",
    categories: ["cv"],
    featured: true,
    problem:
      "Highway CCTV produces hours of footage that nobody watches live. Accidents need to be caught in seconds without drowning operators in false alarms from normal traffic.",
    solution:
      "A streaming pipeline that detects vehicles, tracks them over time, reads their motion with an LSTM and asks a vision-language model to verify the event before raising one alert with evidence.",
    stack: ["Python", "Ultralytics YOLO", "ByteTrack", "PyTorch LSTM", "Qwen3-VL", "OpenCV", "FFmpeg", "CUDA / FP16"],
    architecture: [
      { id: "video", label: "Video in", detail: "Video files, webcams and RTSP streams. A threaded single-frame buffer drops stale frames so latency never grows on live streams." },
      { id: "yolo", label: "YOLO", detail: "Ultralytics YOLO at 640 px inference with a 0.50 confidence threshold, automatic CUDA/CPU selection and FP16 on CUDA." },
      { id: "track", label: "Tracking", detail: "Multi-object tracking keeps a persistent ID on every vehicle, so the system reasons about motion over time instead of single frames." },
      { id: "lstm", label: "LSTM", detail: "A 30-step LSTM reads trajectory and interaction features to separate potential accidents from normal traffic interactions." },
      { id: "vlm", label: "VLM", detail: "A vision-language model verifies the candidate event on the frames around it before anything reaches an operator." },
      { id: "alert", label: "Alert", detail: "An event state machine creates one best-confidence snapshot and one H.264 clip of up to 30 seconds per accident, tolerating 0.75-second detection gaps." },
    ],
    highlights: [
      "Validated model and class maps at start-up",
      "One snapshot and one clip per accident, not one per frame",
      "Survives detection gaps of up to 0.75 s",
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

/** Measured results from the RoadGuard repositories' READMEs and reports. */
export const roadguardMetrics = [
  { value: "0.849", label: "Detector F1", note: "1,168 frames · 2,868 boxes · IoU 0.5" },
  { value: "99.14%", label: "LSTM recall", note: "Held-out public test · 61.66% specificity" },
  { value: "26.9 ms", label: "Detection latency p50", note: "Per frame, two-tier build · RTX 3050 laptop" },
  { value: "56 s", label: "Early hazard warning", note: "Stopped-vehicle alert before impact on a test clip" },
];

export const roadguardLessons = [
  {
    title: "One rule is never enough",
    body: "In a real side impact the two boxes peaked at IoU 0.21, under the 0.3 contact threshold. I added a multi-signal rule that combines weaker cues so impacts like that one are not missed.",
  },
  {
    title: "Ask the VLM a smaller question",
    body: "Switching the verifier from a detailed JSON prompt to a yes/no question cut median VLM latency from 5.5 s to 0.47 s.",
  },
  {
    title: "Small objects need more pixels",
    body: "Motorcycles were nearly invisible at 768 px. Running 1280 px inference over 3×3 tiles raised the share of frames with a motorcycle detection on a test clip from 1.7% to 42.9%.",
  },
  {
    title: "Operators need incidents, not alerts",
    body: "Grouping related hazard events turned 14 separate alerts for a single incident into one incident record.",
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
];

export type SkillGroup = { id: string; label: string; skills: { name: string; used: string[] }[] };
export const skillGroups: SkillGroup[] = [
  {
    id: "cv",
    label: "Computer Vision",
    skills: [
      { name: "YOLOv8", used: ["tmcs"] },
      { name: "YOLO11", used: ["tmcs", "warehouse"] },
      { name: "Ultralytics", used: ["roadguard", "warehouse"] },
      { name: "OpenCV", used: ["tmcs", "roadguard", "warehouse"] },
      { name: "Object detection", used: ["tmcs", "roadguard", "warehouse"] },
      { name: "Object tracking", used: ["roadguard", "warehouse"] },
      { name: "LSTM", used: ["roadguard"] },
      { name: "VLM", used: ["roadguard"] },
    ],
  },
  {
    id: "genai",
    label: "Generative AI & NLP",
    skills: [
      { name: "LLM applications", used: ["task-agent"] },
      { name: "AI agents", used: ["task-agent"] },
      { name: "LangGraph", used: ["task-agent"] },
      { name: "LangChain", used: ["task-agent"] },
      { name: "Tool calling", used: ["task-agent"] },
      { name: "Intent classification", used: ["task-agent"] },
      { name: "RAG", used: [] },
      { name: "Embeddings", used: [] },
      { name: "Vector databases", used: [] },
      { name: "MCP", used: [] },
      { name: "Prompt engineering", used: ["task-agent", "roadguard"] },
    ],
  },
  {
    id: "ml",
    label: "ML & Deep Learning",
    skills: [
      { name: "PyTorch", used: ["roadguard"] },
      { name: "Model inference", used: ["tmcs", "roadguard", "warehouse"] },
      { name: "NumPy", used: ["roadguard"] },
    ],
  },
  {
    id: "video",
    label: "Video & Performance",
    skills: [
      { name: "RTSP", used: ["tmcs", "roadguard", "warehouse"] },
      { name: "FFmpeg", used: ["tmcs", "roadguard"] },
      { name: "MediaMTX", used: ["tmcs"] },
      { name: "CUDA", used: ["roadguard"] },
      { name: "FP16 inference", used: ["roadguard"] },
      { name: "Multithreading", used: ["roadguard"] },
    ],
  },
  {
    id: "backend",
    label: "Backend & Data",
    skills: [
      { name: "FastAPI", used: ["tmcs", "warehouse"] },
      { name: "REST APIs", used: ["tmcs", "warehouse", "task-agent"] },
      { name: "PostgreSQL", used: ["tmcs", "warehouse"] },
      { name: "MySQL", used: [] },
      { name: "Firebase", used: ["task-agent"] },
      { name: "Node.js", used: ["task-agent"] },
      { name: "React", used: ["warehouse", "task-agent"] },
    ],
  },
  {
    id: "lang",
    label: "Languages",
    skills: [
      { name: "Python", used: ["tmcs", "roadguard", "warehouse", "task-agent"] },
      { name: "SQL", used: ["tmcs", "warehouse"] },
      { name: "JavaScript", used: ["task-agent"] },
      { name: "Java", used: [] },
    ],
  },
  {
    id: "tools",
    label: "DevOps & Tools",
    skills: [
      { name: "Docker Compose", used: ["warehouse"] },
      { name: "Nginx", used: ["warehouse"] },
      { name: "Git & GitHub", used: ["roadguard", "warehouse", "task-agent"] },
      { name: "Linux", used: [] },
      { name: "Unit testing", used: ["roadguard"] },
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
    body: "Built an LLM task agent, a warehouse surveillance platform and a real-time accident detection pipeline.",
    points: ["AI Task Manager", "Warehouse Monitoring System", "RoadGuard"],
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
    title: "Real-time vision and agentic AI",
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
