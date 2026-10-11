"""
Things Arc can do on the page for the visitor, always after asking:

    navigate   scroll to a section            "take me to the contact section"
    download   download Mehul's resume        "download his resume"
    open       open a link in a new tab       "take me to his GitHub", "open his LinkedIn", "show me RoadGuard's code"
               or start an email / a call     "email him", "call him"

Each is a two-step exchange decided by rules (never by the model, so it can't misfire):
  1. the request  →  an offer: Arc asks, and the chat shows Yes / No buttons
  2. "yes"        →  the action runs;  "no"  →  nothing happens and Arc says so
The model still writes every reply; the tool tells it what is happening and tells the browser what to do.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .navigation import CONTENTS, SECTIONS, is_navigation_request, requested_section

YES = re.compile(r"^\W*(yes|yeah|yep|yup|ya|sure|ok|okay|please|go ahead|do it|take me|open it|download it|let'?s go|of course|definitely|alright|sounds good|y)\b", re.I)
NO = re.compile(r"^\W*(no|nope|nah|not now|no thanks|don'?t|cancel|never ?mind)\b", re.I)

OPEN_VERB = re.compile(
    r"\b(take|bring|send|lead|guide|direct|navigate|go|move)\b(?:\s+\w+){0,2}?\s+\b(to|towards)\b"
    r"|\b(take|bring|lead|go|navigate)\b(?:\s+\w+){0,2}?\s+\bthere\b"
    r"|\b(open|visit|launch|show me|check out|pull up)\b|\bwhere\b.{0,25}\b(is|are|can i (?:find|see))\b",
    re.I,
)
RESUME = re.compile(r"\b(resume|résumé|curriculum vitae|(?:his|the|a|your) cv)\b", re.I)
RESUME_VERB = re.compile(r"\b(download|get|send|give|save|see|view|open|show|grab|have|want|need|share)\b", re.I)
# also catches run-together spellings like "githubrepo" or "repolink"
CODE = re.compile(r"\b(git ?hub\w*|code|codebase|repo\w*|repositor\w*|source)\b", re.I)
# "take me to that link", "open it", "go there": points back at what the previous message asked for
POINTER = re.compile(r"\b(that|this|the) (link|url|repo|repository|page|profile|site|one)\b|\b(it|there)\b", re.I)
PROFILES = {
    "github": ("GitHub", re.compile(r"\bgit ?hub\b", re.I)),
    "linkedin": ("LinkedIn", re.compile(r"\blinked ?in\b", re.I)),
}
EMAIL = re.compile(
    r"\b(e-?mail|mail|write to|message)\s+(him|mehul)\b|\bsend (him|mehul) (an? )?(e-?mail|mail|message)\b"
    r"|\b(open|compose|draft|write|start) (an? )?(new )?(e-?mail|mail)\b",
    re.I,
)
CALL = re.compile(r"\b(call|phone|ring|dial)\s+(him|mehul)\b|\bmake a call\b", re.I)


@dataclass(frozen=True)
class Action:
    kind: str  # "navigate" | "download" | "open"
    key: str  # what it acts on: a section id, "resume", "github", "linkedin", "email", "phone" or "<project>-code"
    label: str  # how it's named to the visitor
    confirm: bool  # True: Arc is asking; False: the visitor agreed, do it now
    href: str | None = None
    section: str | None = None

    def event(self) -> dict:
        body = {"kind": self.kind, "key": self.key, "label": self.label, "confirm": self.confirm}
        if self.href:
            body["href"] = self.href
        if self.section:
            body["section"] = self.section
        return {"type": "action", "action": body}

    def instruction(self) -> str:
        what, doing = DESCRIBE.get(self.key, (None, None)) if not self.key.endswith("-code") else (
            f"open the code for {self.label.removesuffix(' code')} on GitHub in a new tab", "opening the code on GitHub in a new tab")
        if self.kind == "navigate":
            what = f"take them to the {self.label} section, which shows {CONTENTS[self.section]}"
            doing = f"taking them to the {self.label} section"
        if self.confirm:
            return (f"The visitor asked you to do something on the page. In one or two short sentences, ask whether they'd "
                    f"like you to {what}. End with the question. Don't add anything else, don't write out options or "
                    f"links, and don't say where things are on the page.")
        return f"The visitor said yes. Say in one short sentence that you're {doing} now. Don't add anything else."


DESCRIBE = {
    "resume": ("download Mehul's resume (a PDF) to their device", "downloading his resume"),
    "github": ("open Mehul's GitHub profile in a new tab", "opening his GitHub in a new tab"),
    "linkedin": ("open Mehul's LinkedIn profile in a new tab", "opening his LinkedIn in a new tab"),
    "email": ("open a new email to Mehul in their email app", "opening a new email to Mehul"),
    "phone": ("start a call to Mehul's phone", "starting a call to Mehul"),
}

DECLINED = ("The visitor said no, so nothing happens. Reply with one short sentence such as \"No problem!\" and offer to "
            "help with anything else about Mehul. Give no reasons and mention nothing else.")


@dataclass(frozen=True)
class Decision:
    action: Action | None = None
    task: str | None = None  # an extra instruction for the model


def requested_action(text: str, links: dict, projects: dict[str, list[str]], confirm: bool) -> Action | None:
    """The action a message asks for, if any. Links come from arc/knowledge/links.json."""
    lowered = text.lower()
    if links.get("resume") and RESUME.search(text) and RESUME_VERB.search(text) and "computer vision" not in lowered:
        return Action("download", "resume", "resume", confirm, href=links["resume"])
    if CODE.search(text) and OPEN_VERB.search(text):
        for pid, names in projects.items():
            if pid in links.get("projects", {}) and any(re.search(rf"\b{re.escape(n)}\b", lowered) for n in names):
                project = links["projects"][pid]
                return Action("open", f"{pid}-code", f"{project['title']} code", confirm, href=project["github"])
    for key, (label, pattern) in PROFILES.items():
        if links.get(key) and pattern.search(text) and OPEN_VERB.search(text):
            return Action("open", key, label, confirm, href=links[key])
    if links.get("email") and EMAIL.search(text):
        return Action("open", "email", "email", confirm, href=links["email"])
    if links.get("phone") and CALL.search(text):
        return Action("open", "phone", "phone", confirm, href=links["phone"])
    if is_navigation_request(text):
        sid = requested_section(text)
        return Action("navigate", sid, SECTIONS[sid][0], confirm, section=sid)
    return None


def action_for(text: str, earlier: list[dict], links: dict, projects: dict[str, list[str]], confirm: bool) -> Action | None:
    """The action a message asks for, resolving "take me to that link" / "open it" against the message before it."""
    if action := requested_action(text, links, projects, confirm):
        return action
    if OPEN_VERB.search(text) and POINTER.search(text):
        before = next((t["content"] for t in reversed(earlier) if t["role"] == "user"), "")
        # the earlier message may have been a question rather than a request, so lend it this message's verb
        if before:
            return requested_action(f"open {before}", links, projects, confirm)
    return None


def decide(question: str, history: list[dict], links: dict, projects: dict[str, list[str]]) -> Decision:
    if action := action_for(question, history, links, projects, confirm=True):
        return Decision(action, action.instruction())
    # an answer to Arc's last offer: the previous request was an action, so Arc offered it with Yes / No buttons
    # (decided from the request, not from how the model happened to word its reply)
    if len(history) >= 2 and len(question.split()) <= 8:
        last_user, last_answer = history[-2], history[-1]
        offered = last_user["role"] == "user" and last_answer["role"] == "assistant"
        if offered and (pending := action_for(last_user["content"], history[:-2], links, projects, confirm=False)):
            if NO.match(question):
                return Decision(None, DECLINED)
            if YES.match(question):
                return Decision(pending, pending.instruction())
    return Decision()
