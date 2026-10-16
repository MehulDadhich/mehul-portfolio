import { Hero } from "@/components/hero/hero";
import { Featured } from "@/components/featured/featured";
import { World } from "@/components/world/world";
import { ProjectSheetHost } from "@/components/projects/projects";
import { SkillsSheet } from "@/components/sections/skills-sheet";
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
      <main id="main" className="relative z-10">
        <Hero />
        <Featured />
        <World />
      </main>
      <ProjectSheetHost />
      <SkillsSheet />
    </>
  );
}
