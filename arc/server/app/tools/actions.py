"""
Things Arc can do on the page for the visitor, always after asking:

    navigate   scroll to a section            "take me to the contact section"
               or open a project's architecture  "show me Rehearse's architecture", "take me to that project"
    tour       play the whole site for them   "show me the website", "show all the animations", "give me a tour"
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
from difflib import get_close_matches
from typing import Callable

from .navigation import CONTENTS, SECTIONS, is_navigation_request, requested_section

YES = re.compile(
    r"^\W*(yes+|yeah|yea|yep|yup|ya|ye|yse|tes|yrs|sure|ok|okay|please|go ahead|do it|take me|open it|show it|"
    r"download it|let'?s go|of course|definitely|alright|sounds good|y)\b|\bi (meant|was writing|wrote|typed|said) yes\b",
    re.I,
)
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
# a request about one project's card rather than its code ("proect" and other slips included)
ARCHITECTURE = re.compile(r"\b(archi\w*|arch|pipeline|diagram|design|how it works|card|pro\w{0,2}ct|system)\b", re.I)
# softer than OPEN_VERB; only counts together with an architecture word ("I want to see the architecture of …")
VIEW_VERB = re.compile(r"\b(see|view|look at|display|show)\b", re.I)
# a project's own running site, not this portfolio ("I want to see its site", "is Rehearse live?")
LIVE = re.compile(r"\b(live|demo|deployed|hosted)\b|\btry (it|it out)\b"
                  r"|\b(its|it'?s|the project'?s?|[a-z]+'s)\s+(own\s+)?(site|website|web ?site|web ?app|app|url)\b", re.I)
SITE = re.compile(r"\b(site|website|web ?app)\b", re.I)
PORTFOLIO = re.compile(r"\b(portfolio|this (site|website|page)|your (site|website)|mehul'?s (site|website))\b", re.I)
REFERS = re.compile(r"\b(it|its|this|that|the same)\b", re.I)
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
# a guided tour of the whole portfolio, rather than one section ("show me the website", "show all the animations")
WHOLE_SITE = r"(?:the |this |your |his |mehul'?s )?(?:whole |entire |full |complete )?(?:site|website|web ?site|portfolio)"
TOUR = re.compile(
    r"\btour\b|\bshow me around\b|\bwalk ?(?:me )?through\b.{0,20}\b(?:site|website|portfolio)\b"
    rf"|\b(?:show|play|run|demo)\s+(?:me\s+)?{WHOLE_SITE}\b"
    rf"|\b(?:explore|experience|see|view|watch)\s+{WHOLE_SITE}\b"
    r"|\b(?:show|play|see|watch|view|run)\b.{0,30}\banimation",
    re.I,
)


@dataclass(frozen=True)
class Action:
    kind: str  # "navigate" | "download" | "open" | "tour"
    key: str  # what it acts on: a section id, "tour", "resume", "github", "linkedin", "email", "phone" or "<project>-code"
    label: str  # how it's named to the visitor
    confirm: bool  # True: Arc is asking; False: the visitor agreed, do it now
    href: str | None = None
    section: str | None = None
    note: str | None = None  # something the visitor should hear first ("Rehearse has no live site")

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
        if self.key.endswith("-demo"):
            what = f"open the live site of {self.label.removesuffix(' live site')} in a new tab"
            doing = "opening the live site in a new tab"
        if self.kind == "navigate" and self.section and self.section.startswith("project-"):
            what = f"open the {self.label}, which shows the project's pipeline stage by stage, its highlights and stack"
            doing = f"opening the {self.label}"
        elif self.kind == "navigate":
            what = f"take them to the {self.label} section, which shows {CONTENTS[self.section]}"
            doing = f"taking them to the {self.label} section"
        if self.confirm:
            note = f"{self.note} " if self.note else ""
            return (f"{note}The visitor asked you to do something on the page. In one or two short sentences, ask whether they'd "
                    f"like you to {what}. End with the question. Don't add anything else, don't write out options or "
                    f"links, and don't say where things are on the page.")
        return f"The visitor said yes. Say in one short sentence that you're {doing} now. Don't add anything else."


DESCRIBE = {
    "tour": ("give them a guided tour of the whole site, which scrolls through every section for them so each animation "
             "plays, with a short caption at each stop", "starting the guided tour of the site"),
    "resume": ("download Mehul's resume (a PDF) to their device", "downloading his resume"),
    "github": ("open Mehul's GitHub profile in a new tab", "opening his GitHub in a new tab"),
    "linkedin": ("open Mehul's LinkedIn profile in a new tab", "opening his LinkedIn in a new tab"),
    "email": ("open a new email to Mehul in their email app", "opening a new email to Mehul"),
    "phone": ("start a call to Mehul's phone", "starting a call to Mehul"),
}

# "yes" when no action was offered: the model must not pretend to open or move anything
NOTHING_PENDING = ("The visitor said yes, but nothing on the page is waiting to happen, so don't say you're opening, "
                   "taking them anywhere or doing anything. If your last message offered more information, give it now; "
                   "otherwise ask what they'd like to know.")

DECLINED = ("The visitor said no, so nothing happens. Reply with one short sentence such as \"No problem!\" and offer to "
            "help with anything else about Mehul. Give no reasons and mention nothing else.")


@dataclass(frozen=True)
class Decision:
    action: Action | None = None
    task: str | None = None  # an extra instruction for the model


def named_projects(text: str, projects: dict[str, list[str]]) -> list[str]:
    lowered = text.lower()
    found = [pid for pid, names in projects.items() if any(re.search(rf"\b{re.escape(n)}\b", lowered) for n in names)]
    if found:
        return found
    # a misspelt one-word name ("reheasrse", "roadgaurd"); long names only, so ordinary words never match
    words = re.findall(r"[a-z]{5,}", lowered)
    return [pid for pid, names in projects.items()
            if any(" " not in n and len(n) >= 5 and get_close_matches(n, words, n=1, cutoff=0.8) for n in names)]


def requested_project(text: str, projects: dict[str, list[str]], focus: str | None) -> str | None:
    """The project whose architecture a message asks to see: named in it, or "that project" when one is in focus."""
    if CODE.search(text):
        return None
    wants_view = bool(ARCHITECTURE.search(text)) and bool(OPEN_VERB.search(text) or VIEW_VERB.search(text))
    named = named_projects(text, projects)
    if len(named) == 1:
        # "take me to roadguard" is its own section; only its architecture or card opens the project
        return named[0] if wants_view or (OPEN_VERB.search(text) and not requested_section(text)) else None
    # "open architecture for me", "take me to that project": the project being talked about
    if not named and focus and wants_view:
        return focus
    return None


def requested_demo(text: str, projects: dict[str, list[str]], focus: str | None) -> str | None:
    """The project whose live site a message asks about: named in it, or "its site" when one is in focus."""
    if CODE.search(text) or PORTFOLIO.search(text):
        return None
    named = named_projects(text, projects)
    if len(named) == 1 and (LIVE.search(text) or SITE.search(text)):
        return named[0]
    if not named and focus and LIVE.search(text):
        return focus
    return None


def requested_action(text: str, links: dict, projects: dict[str, list[str]], confirm: bool,
                     focus: str | None = None) -> Action | None:
    """The action a message asks for, if any. Links come from arc/knowledge/links.json."""
    lowered = text.lower()
    if links.get("resume") and RESUME.search(text) and RESUME_VERB.search(text) and "computer vision" not in lowered:
        return Action("download", "resume", "resume", confirm, href=links["resume"])
    if (pid := requested_demo(text, projects, focus)) and (project := links.get("projects", {}).get(pid)):
        if project.get("demo"):
            return Action("open", f"{pid}-demo", f"{project['title']} live site", confirm, href=project["demo"])
        if project.get("github"):
            return Action("open", f"{pid}-code", f"{project['title']} code", confirm, href=project["github"],
                          note=f"{project['title']} has no live site linked on this portfolio; say that first.")
        return Action("navigate", f"{pid}-architecture", f"{project['title']} architecture", confirm,
                      section=f"project-{pid}", note=f"{project['title']} has no live site and its code isn't public. "
                                                     f"Say that first, in one sentence, and don't mention GitHub or code.")
    if TOUR.search(text) and not CODE.search(text) and not named_projects(text, projects):
        return Action("tour", "tour", "guided tour", confirm)
    if CODE.search(text) and OPEN_VERB.search(text):
        for pid, names in projects.items():
            if links.get("projects", {}).get(pid, {}).get("github") and any(re.search(rf"\b{re.escape(n)}\b", lowered) for n in names):
                project = links["projects"][pid]
                return Action("open", f"{pid}-code", f"{project['title']} code", confirm, href=project["github"])
    for key, (label, pattern) in PROFILES.items():
        if links.get(key) and pattern.search(text) and OPEN_VERB.search(text):
            return Action("open", key, label, confirm, href=links[key])
    if links.get("email") and EMAIL.search(text):
        return Action("open", "email", "email", confirm, href=links["email"])
    if links.get("phone") and CALL.search(text):
        return Action("open", "phone", "phone", confirm, href=links["phone"])
    if (pid := requested_project(text, projects, focus)) and pid in links.get("projects", {}):
        title = links["projects"][pid]["title"]
        return Action("navigate", f"{pid}-architecture", f"{title} architecture", confirm, section=f"project-{pid}")
    if is_navigation_request(text):
        sid = requested_section(text)
        return Action("navigate", sid, SECTIONS[sid][0], confirm, section=sid)
    return None


Focus = Callable[[str, list[dict]], "str | None"]


def action_for(text: str, earlier: list[dict], links: dict, projects: dict[str, list[str]], confirm: bool,
               focus: Focus | None = None) -> Action | None:
    """The action a message asks for, resolving "take me to that link" / "open it" against the message before it."""
    if action := requested_action(text, links, projects, confirm, focus(text, earlier) if focus else None):
        return action
    if OPEN_VERB.search(text) and POINTER.search(text):
        before = next((t["content"] for t in reversed(earlier) if t["role"] == "user"), "")
        # the earlier message may have been a question rather than a request, so lend it this message's verb
        if before:
            return requested_action(f"open {before}", links, projects, confirm, focus(before, earlier) if focus else None)
    return None


def decide(question: str, history: list[dict], links: dict, projects: dict[str, list[str]],
           focus: Focus | None = None) -> Decision:
    """`focus` names the project a message is about, from it or the exchange before it ("that project")."""
    offer = history[-1].get("offer") if history and history[-1]["role"] == "assistant" else None
    # a message that is a request of its own ("take me to the contact section") isn't an answer to the offer
    if offer and len(question.split()) <= 8 and not requested_action(question, links, projects, True):
        if NO.match(question):
            return Decision(None, DECLINED)
        if YES.search(question) or (OPEN_VERB.search(question) and POINTER.search(question)):
            action = Action(offer["kind"], offer["key"], offer["label"], False, offer.get("href"), offer.get("section"))
            return Decision(action, action.instruction())
    if action := action_for(question, history, links, projects, confirm=True, focus=focus):
        return Decision(action, action.instruction())
    # an answer to Arc's last offer: the previous request was an action, so Arc offered it with Yes / No buttons
    # (decided from the request, not from how the model happened to word its reply)
    if len(history) >= 2 and len(question.split()) <= 8:
        last_user, last_answer = history[-2], history[-1]
        offered = last_user["role"] == "user" and last_answer["role"] == "assistant"
        if offered and (pending := action_for(last_user["content"], history[:-2], links, projects, confirm=False,
                                              focus=focus)):
            if NO.match(question):
                return Decision(None, DECLINED)
            if YES.match(question):
                return Decision(pending, pending.instruction())
        elif YES.match(question):
            return Decision(None, NOTHING_PENDING)
    return Decision()
