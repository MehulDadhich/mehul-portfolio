"""The portfolio's sections, and spotting a request to go to one ("take me to the contact section")."""

from __future__ import annotations

import re

# section id on the page → (name shown to visitors, words visitors use for it)
SECTIONS: dict[str, tuple[str, list[str]]] = {
    "contact": ("Contact", ["contact", "contacts", "contact info", "contact details", "get in touch", "reach out", "reach him", "hire him", "email"]),
    "work": ("Projects", ["projects", "project", "work", "portfolio projects", "all projects"]),
    "featured": ("RoadGuard", ["roadguard", "road guard", "featured project", "featured", "case study", "accident detection"]),
    "experience": ("Experience", ["experience", "work experience", "internship", "infrax", "job"]),
    "skills": ("Skills", ["skills", "skill", "tech stack", "technologies"]),
    "journey": ("Journey", ["journey", "timeline", "education", "story"]),
    "achievements": ("Achievements", ["achievements", "achievement", "certifications", "certificates", "awards", "hackathons"]),
    "top": ("top of the page", ["top", "home", "beginning", "start", "intro", "introduction", "hero"]),
}

# what each section shows, so Arc can describe it without guessing
CONTENTS = {
    "contact": "Mehul's email, phone, LinkedIn and GitHub, and his resume download",
    "work": "all of Mehul's projects, each with an architecture view",
    "featured": "a scroll-through of the RoadGuard accident-detection pipeline",
    "experience": "his AI engineering internship at Infrax.ai",
    "skills": "his skills grouped by area, each linked to the projects that used it",
    "journey": "his education and the path to his current work",
    "achievements": "his certifications and achievements",
    "top": "the introduction to Mehul",
}

GO_VERB = re.compile(
    r"\b(take|bring|send|lead|guide|direct|navigate|scroll|jump|go|move)\b(?:\s+\w+){0,2}?\s+\b(to|towards)\b"
    r"|\bwhere\b.{0,25}\b(is|are|can i (?:find|see)|do i find)\b|\bhow (?:do|can) i (?:get|go) to\b",
    re.I,
)
SECTION_WORD = re.compile(r"\b(section|page|part|tab)\b", re.I)


def requested_section(text: str) -> str | None:
    lowered = text.lower()
    found = [sid for sid, (_, words) in SECTIONS.items() if any(re.search(rf"\b{re.escape(w)}\b", lowered) for w in words)]
    # the earliest mention wins ("take me to the contact section" → contact)
    found.sort(key=lambda sid: min(m.start() for w in SECTIONS[sid][1] for m in re.finditer(rf"\b{re.escape(w)}\b", lowered)))
    return found[0] if found else None


def is_navigation_request(text: str) -> bool:
    return bool(requested_section(text)) and bool(GO_VERB.search(text) or SECTION_WORD.search(text))
