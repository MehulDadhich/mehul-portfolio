"""
Decides what is worth remembering about a visitor across conversations.

Only a few kinds of statement qualify: who the visitor is ("I'm a recruiter at Acme"), what they're hiring for, and
their name. Everything else stays in the conversation only. Rules rather than a second model call: it adds no
latency, and it can't store something the visitor didn't actually say.
"""

from __future__ import annotations

import re

# capitalised words; dots only inside a word ("Infrax.ai"), so a sentence's full stop ends the name
_WORD = r"[A-Z][\w&'-]*(?:\.[a-z][\w-]*)*"
_ORG = rf"({_WORD}(?:\s+{_WORD}){{0,3}})"
ROLE = re.compile(
    r"\b(?:i am|i'm|im)\s+(?:a|an|the)\s+((?:senior |junior |lead |technical |tech |hiring |engineering )?"
    r"(?:recruiter|hiring manager|engineer|developer|founder|cto|ceo|manager|student|researcher|designer|talent partner|hr))"
    r"(?:\s+(?:at|from|with)\s+" + _ORG + r")?",
    re.I,
)
HIRING = re.compile(r"\b(?:we're|we are|i'm|i am|im)\s+(?:hiring|looking)\s+for\s+(?:a|an|some)?\s*([^.?!,]{3,60})", re.I)
NAME = re.compile(r"\bmy name is\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)")


def visitor_notes(message: str) -> list[str]:
    notes = []
    if m := ROLE.search(message):
        role = m.group(1).lower()
        notes.append(f"The visitor is a {role}" + (f" at {m.group(2)}" if m.group(2) else "") + ".")
    if m := HIRING.search(message):
        notes.append(f"The visitor is hiring for {m.group(1).strip()}.")
    if m := NAME.search(message):
        notes.append(f"The visitor's name is {m.group(1)}.")
    return notes
