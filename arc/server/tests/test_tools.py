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
    d = ask("yes", turn("is he good at computer vision?", "Yes, it's his core area."))
    assert d.action is None and "nothing on the page" in d.task  # and the model is told not to pretend otherwise
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


def service(projects):
    from app.conversation import ArcService
    svc = ArcService.__new__(ArcService)
    svc.projects = projects
    return svc


ALL = {**PROJECTS, "rehearse": ["rehearse", "mock interviewer"]}
ARCH_LINKS = {**LINKS, "projects": {**LINKS["projects"], "rehearse": {"title": "Rehearse"}, "roadguard": {"title": "RoadGuard"}}}


def test_that_project_is_the_one_arc_just_named():
    # the question before named no project; Arc's answer did
    history = turn("does mehul know text to speech", "Yes, he used text-to-speech.") + \
        turn("in which project did he use this", "Mehul used text-to-speech in the Rehearse project.")
    svc = service(ALL)
    assert svc.focus("can you take me to that proect architecture", history) == "rehearse"
    d = decide("can you take me to that proect architecture", history, ARCH_LINKS, ALL, focus=svc.focus)
    assert d.action.kind == "navigate" and d.action.section == "project-rehearse" and d.action.confirm
    yes = decide("yes", history + turn("can you take me to that proect architecture", "Shall I open it?"),
                 ARCH_LINKS, ALL, focus=svc.focus)
    assert yes.action.section == "project-rehearse" and not yes.action.confirm


@pytest.mark.parametrize("q, section", [
    ("show me the rehearse architecture", "project-rehearse"),
    ("take me to the mock interviewer project", "project-rehearse"),
    ("take me to roadguard's pipeline", "project-roadguard"),
    ("take me to roadguard", "featured"),
    ("show me the warehouse code", None),
])
def test_project_architecture_requests(q, section):
    d = decide(q, [], ARCH_LINKS, ALL)
    assert (d.action.section if d.action and d.action.kind == "navigate" else None) == section


def test_its_site_without_a_live_site_offers_the_code():
    links = {**ARCH_LINKS, "projects": {**ARCH_LINKS["projects"],
                                         "rehearse": {"title": "Rehearse", "github": "https://github.com/x/rehearse"}}}
    history = turn("can you show me this project", "Would you like me to open the Rehearse project architecture?")
    svc = service(ALL)
    d = decide("no not the architecture i want to see its site", history, links, ALL, focus=svc.focus)
    assert d.action.kind == "open" and d.action.href.endswith("/rehearse") and d.action.confirm
    assert "no live site" in d.task


def test_live_site_opens_when_there_is_one():
    links = {**ARCH_LINKS, "projects": {"rehearse": {"title": "Rehearse", "demo": "https://rehearse.example"}}}
    d = decide("is rehearse live?", [], links, ALL)
    assert d.action.href == "https://rehearse.example"


def test_no_site_and_no_code_is_said_plainly():
    d = decide("show me the roadguard demo", [], ARCH_LINKS, ALL)
    assert d.action.section == "project-roadguard" and "isn't public" in d.task


def test_this_portfolio_is_not_a_project_site():
    assert ask("take me to the top of this site").action.section == "top"


def offered(user: str, answer: str, action) -> list[dict]:
    return [{"role": "user", "content": user}, {"role": "assistant", "content": answer, "offer": action.event()["action"]}]


def test_the_offer_is_what_yes_runs():
    svc = service(ALL)
    history = turn("does mehul do tts stt", "Yes, in his Rehearse project.")
    offer = decide("can you take me to that project", history, ARCH_LINKS, ALL, focus=svc.action_focus).action
    assert offer.section == "project-rehearse"
    history += offered("can you take me to that project", "Shall I open the Rehearse architecture?", offer)
    for reply in ["open it for me", "yes", "tes", "i was writing yes", "sure, show it"]:
        d = decide(reply, history, ARCH_LINKS, ALL, focus=svc.action_focus)
        assert d.action.section == "project-rehearse" and not d.action.confirm, reply
    assert decide("no thanks", history, ARCH_LINKS, ALL).task == DECLINED
    # a new request of its own still wins over the offer
    assert decide("take me to the contact section", history, ARCH_LINKS, ALL).action.section == "contact"


@pytest.mark.parametrize("q", ["i want you to show me reheasrse archi", "i want to see the architecture of the rehearse project"])
def test_misspelt_and_soft_architecture_requests(q):
    assert decide(q, [], ARCH_LINKS, ALL).action.section == "project-rehearse"


def test_open_architecture_uses_the_project_being_discussed():
    svc = service(ALL)
    history = turn("tell me about rehearse", "It's a mock interviewer.") + turn("ok", "Anything else?")
    d = decide("open architecture for me", history, ARCH_LINKS, ALL, focus=svc.action_focus)
    assert d.action.section == "project-rehearse"


@pytest.mark.parametrize("q", ["does rehearse show a score?", "what does the architecture of a RAG system look like"])
def test_questions_about_projects_are_not_requests(q):
    assert decide(q, [], ARCH_LINKS, ALL).action is None


@pytest.mark.parametrize("q", [
    "show me the website",
    "show all the animation of this site",
    "can you show me all the animations",
    "give me a tour",
    "take me on a tour of the site",
    "show me around",
    "walk me through the whole website",
    "show me his portfolio",
    "I want to see the whole site",
])
def test_tour_requests_are_offered_first(q):
    d = ask(q)
    assert d.action and (d.action.kind, d.action.key) == ("tour", "tour") and d.action.confirm
    assert "ask whether" in d.task and "guided tour" in d.task


@pytest.mark.parametrize("q", [
    "take me to the top of this site",  # one section, not the tour
    "show me the warehouse system's code",
    "what animations does the site use?",
    "show me roadguard's animation",  # a project's own chapter, not the whole site
])
def test_tour_does_not_swallow_other_requests(q):
    d = ask(q)
    assert not (d.action and d.action.kind == "tour")


def test_yes_to_a_tour_starts_it():
    first = ask("show me the website")
    d = ask("yes", offered("show me the website", "Would you like a guided tour?", first.action))
    assert d.action and d.action.kind == "tour" and not d.action.confirm
    assert d.action.event()["action"] == {"kind": "tour", "key": "tour", "label": "guided tour", "confirm": False}
