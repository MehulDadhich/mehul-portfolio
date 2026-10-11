import { Hero } from "@/components/hero/hero";
import { Featured } from "@/components/featured/featured";
import { Projects } from "@/components/projects/projects";
import { Experience } from "@/components/sections/experience";
import { Skills } from "@/components/sections/skills";
import { Journey } from "@/components/sections/journey";
import { Achievements } from "@/components/sections/achievements";
import { Contact } from "@/components/sections/contact";
import { Footer } from "@/components/sections/footer";
import { SectionWheel } from "@/components/wheel/section-wheel";
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
        <SectionWheel
          panels={[
            { id: "top", label: "Intro", content: <Hero /> },
            { id: "featured", label: "RoadGuard", content: <Featured /> },
            { id: "work", label: "Work", content: <Projects /> },
            { id: "experience", label: "Experience", content: <Experience /> },
            { id: "skills", label: "Skills", content: <Skills /> },
            { id: "journey", label: "Journey", content: <Journey /> },
            { id: "achievements", label: "Achievements", content: <Achievements /> },
            { id: "contact", label: "Contact", content: <><Contact /><Footer /></> },
          ]}
        />
      </main>
    </>
  );
}
