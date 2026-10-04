import { Hero } from "@/components/hero/hero";
import { Featured } from "@/components/featured/featured";
import { Projects } from "@/components/projects/projects";
import { Experience } from "@/components/sections/experience";
import { Skills } from "@/components/sections/skills";
import { Journey } from "@/components/sections/journey";
import { Achievements } from "@/components/sections/achievements";
import { Contact } from "@/components/sections/contact";
import { Footer } from "@/components/sections/footer";
import { Ticker } from "@/components/shared/ticker";
import { profile } from "@/lib/content";
import { siteUrl } from "@/lib/site";

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: "AI/ML Engineer",
  email: `mailto:${profile.email}`,
  url: siteUrl,
  address: { "@type": "PostalAddress", addressLocality: "Delhi", addressCountry: "IN" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "VIT-AP University" },
  sameAs: [profile.linkedin, profile.github],
  knowsAbout: ["Computer vision", "Object detection", "LLM agents", "LangGraph", "FastAPI", "Real-time video analytics"],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <main id="main">
        <Hero />
        <Ticker items={["YOLO11", "26.9 ms p50", "LangGraph", "RTSP · FFmpeg", "0.849 F1", "FastAPI", "Qwen3-VL", "PostgreSQL", "CUDA · FP16", "ByteTrack", "6 months at Infrax.ai"]} />
        <Featured />
        <Projects />
        <Experience />
        <Skills />
        <Journey />
        <Achievements />
        <Ticker reverse items={["Computer vision", "AI agents", "Real-time video", "Generative AI", "Backend systems", "Shipped to production"]} />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
