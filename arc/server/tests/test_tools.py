import pytest

from app.tools import decide
from app.tools.actions import DECLINED

LINKS = {
    "resume": "/Mehul-Dadhich-Resume.pdf",
    "github": "https://github.com/MehulDadhich",
    "linkedin": "https://linkedin.com/in/mehul",
    "email": "mailto:m@example.com",
    "phone": "tel:+910000000000",
    "projects": {"warehouse": {"title": "Warehouse Monitoring System", "github": "https://github.com/MehulDadhich/wms"}},
}
PROJECTS = {"roadguard": ["roadguard", "accident detection"], "warehouse": ["warehouse", "warehouse monitoring"]}


def ask(q, history=()):
    return decide(q, list(history), LINKS, PROJECTS)


def turn(user: str, answer: str) -> list[dict]:
    return [{"role": "user", "content": user}, {"role": "assistant", "content": answer}]


@pytest.mark.parametrize("q, kind, key", [
    ("take me to the contact section", "navigate", "contact"),
    ("Where is the contact section?", "navigate", "contact"),
    ("where can I find his projects", "navigate", "work"),
    ("go to skills", "navigate", "skills"),
    ("take me back to the top", "navigate", "top"),
    ("download mehul's resume", "download", "resume"),
    ("can I get his CV?", "download", "resume"),
    ("I want his resume", "download", "resume"),
    ("take me to his github", "open", "github"),
    ("open his LinkedIn", "open", "linkedin"),
    ("show me the warehouse system's code", "open", "warehouse-code"),
    ("can you take me to his githubrepo of the warehouse monitoring system", "open", "warehouse-code"),
    ("open the warehouse repository", "open", "warehouse-code"),
    ("email him", "open", "email"),
    ("I'd like to send him an email", "open", "email"),
    ("call him", "open", "phone"),
])
def test_requests_are_offered_first(q, kind, key):
    d = ask(q)
    assert d.action and (d.action.kind, d.action.key) == (kind, key) and d.action.confirm
    assert "ask whether" in d.task


@pytest.mark.parametrize("q", [
    "what are his skills?",
    "show me his projects",
    "what's his email?",
    "does he have a github?",
    "is he good at computer vision?",
    "what's on his CV for computer vision",
    "where did he graduate from",
    "how can I contact him?",
    "show me roadguard's code",  # RoadGuard's code isn't public: Arc answers instead of opening anything
])
def test_questions_are_not_actions(q):
    assert ask(q).action is None


@pytest.mark.parametrize("request_, href", [
    ("download his resume", "/Mehul-Dadhich-Resume.pdf"),
    ("take me to his github", "https://github.com/MehulDadhich"),
    ("open his linkedin", "https://linkedin.com/in/mehul"),
])
def test_yes_after_an_offer_does_it(request_, href):
    history = turn(request_, "Would you like me to do that?")
    for reply in ["Yes", "yes please", "sure", "ok"]:
        d = ask(reply, history)
        assert d.action and not d.action.confirm and d.action.href == href


def test_yes_to_a_section_scrolls():
    d = ask("Yes", turn("where is the contact section?", "Should I take you there?"))
    assert d.action.kind == "navigate" and d.action.section == "contact" and not d.action.confirm


def test_no_declines_without_acting():
    d = ask("No", turn("download his resume", "Would you like me to download it?"))
    assert d.action is None and d.task == DECLINED


def test_yes_without_an_offer_does_nothing():
    assert ask("yes", turn("is he good at computer vision?", "Yes, it's his core area.")) == ask("hello")
    assert ask("yes").action is None


def test_that_link_refers_back_to_the_previous_message():
    history = turn("is the warehouse system's code on github?", "Yes, the code is public on GitHub.")
    for follow_up in ["take me to that link", "open it", "can you take me there"]:
        d = ask(follow_up, history)
        assert d.action and d.action.key == "warehouse-code" and d.action.confirm
    history = turn("does he have a linkedin?", "Yes, he's on LinkedIn.")
    assert ask("open that profile", history).action.key == "linkedin"
    # and the answer to that offer works too, two messages on from the original question
    history = turn("is the warehouse system's code on github?", "Yes.") + turn("take me to that link", "Shall I open it?")
    yes = ask("Yes", history)
    assert yes.action and yes.action.key == "warehouse-code" and not yes.action.confirm
    assert ask("No", history).task == DECLINED
    # nothing to point back at: no action
    assert ask("take me to that link", turn("what are his skills?", "Python, PyTorch…")).action is None


def test_event_payload():
    event = ask("take me to his github").action.event()
    assert event == {"type": "action", "action": {"kind": "open", "key": "github", "label": "GitHub", "confirm": True,
                                                  "href": "https://github.com/MehulDadhich"}}
