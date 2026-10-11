"""The HTTP API end to end, with the scripted model standing in for Arc-3B."""

import json
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from app.auth import Auth
from app.config import settings
from app.conversation import ArcService
from app.main import app
from app.memory.local_store import LocalMemoryStore
from tests.conftest import ScriptedLLM

VISITOR = {"x-arc-visitor": "visitor-aaaa1111"}


@pytest.fixture
def client(tmp_path, retriever, projects):
    def make(llm=None, api_key=""):
        s = replace(settings, api_key=api_key)
        llm = llm or ScriptedLLM()
        links = {"resume": "/Mehul-Dadhich-Resume.pdf", "github": "https://github.com/MehulDadhich"}
        app.state.service = ArcService(s, retriever, llm, LocalMemoryStore(tmp_path), projects, links)
        app.state.auth = Auth(s)
        return TestClient(app), llm  # no `with`: skips the real startup (model download, llama.cpp)
    return make


def chat(c, question, conv="conv-000001", headers=VISITOR):
    r = c.post("/chat", json={"question": question, "conversation_id": conv}, headers=headers)
    return r, [json.loads(line) for line in r.text.splitlines() if line]


def test_answer_is_streamed_from_the_model(client):
    c, llm = client(ScriptedLLM("RoadGuard detects accidents in real time."))
    r, events = chat(c, "What is RoadGuard?")
    assert r.status_code == 200
    assert [e["type"] for e in events][0] == "context" and events[-1]["type"] == "done"
    assert "".join(e["text"] for e in events if e["type"] == "token").strip() == "RoadGuard detects accidents in real time."
    assert any(s["id"].startswith("roadguard") for s in events[0]["sources"])
    system = llm.calls[0][0]["content"]
    assert "RoadGuard" in system  # the retrieved facts reached the model


def test_conversation_is_remembered_between_turns(client):
    c, llm = client()
    chat(c, "Tell me about RoadGuard")
    _, events = chat(c, "What models does it use?")
    assert events[0]["history_turns"] == 2 and events[0]["project"] == "roadguard"
    assert [m["role"] for m in llm.calls[1]] == ["system", "user", "assistant", "user"]
    stored = c.get("/conversations/conv-000001", headers=VISITOR).json()["messages"]
    assert [m["content"] for m in stored][::2] == ["Tell me about RoadGuard", "What models does it use?"]


def test_other_visitors_see_nothing(client):
    c, _ = client()
    chat(c, "I'm a recruiter at Acme. Who is Mehul?")
    other = {"x-arc-visitor": "visitor-bbbb2222"}
    assert c.get("/conversations/conv-000001", headers=other).json()["messages"] == []
    _, events = chat(c, "Do you remember me?", conv="conv-000002", headers=other)
    assert events[0]["remembered"] == 0
    _, events = chat(c, "Do you remember me?", conv="conv-000003")
    assert events[0]["remembered"] == 1


def test_navigation_asks_then_goes(client):
    c, llm = client(ScriptedLLM("The Contact section is at the end. Should I take you there?"))
    _, events = chat(c, "take me to the contact section")
    offer = [e for e in events if e["type"] == "action"]
    assert offer and offer[0]["action"]["confirm"] and offer[0]["action"]["section"] == "contact"
    assert "Instruction for this reply" in llm.calls[0][-1]["content"]  # told to ask first, next to the question
    _, events = chat(c, "yes")
    go = [e for e in events if e["type"] == "action"]
    assert go and go[0]["action"] == {"kind": "navigate", "key": "contact", "section": "contact", "label": "Contact", "confirm": False}


def test_resume_download_asks_then_downloads(client):
    c, _ = client(ScriptedLLM("Would you like me to download his resume?"))
    _, events = chat(c, "download mehul's resume")
    offer = next(e for e in events if e["type"] == "action")["action"]
    assert offer["kind"] == "download" and offer["confirm"] and offer["href"] == "/Mehul-Dadhich-Resume.pdf"
    _, events = chat(c, "Yes")
    go = next(e for e in events if e["type"] == "action")["action"]
    assert go["kind"] == "download" and not go["confirm"]
    _, events = chat(c, "download his resume", conv="conv-000002")
    _, events = chat(c, "No", conv="conv-000002")
    assert not [e for e in events if e["type"] == "action"]


def test_a_plain_greeting_is_answered_as_a_greeting(client):
    c, llm = client(ScriptedLLM("Hi there! What would you like to know about Mehul?"))
    chat(c, "hi")
    last = llm.calls[0][-1]["content"]
    assert "only said hello" in last and "Don't say how you are" in last
    chat(c, "how are you?", conv="conv-000002")
    assert "asked how you are" in llm.calls[1][-1]["content"]
    chat(c, "hi, what does he do?", conv="conv-000003")
    assert "Instruction for this reply" not in llm.calls[2][-1]["content"]  # a real question is answered normally


def test_forgetting(client):
    c, _ = client()
    chat(c, "I'm a recruiter at Acme.")
    assert c.delete("/memory", headers=VISITOR).json() == {"ok": True}
    assert c.get("/conversations/conv-000001", headers=VISITOR).json()["messages"] == []


def test_rate_limited_model_says_busy(client):
    c, _ = client(ScriptedLLM(fail=True, status=429))
    _, events = chat(c, "What is RoadGuard?")
    assert events[-1]["type"] == "error" and "try again in a minute" in events[-1]["message"]


def test_model_failure_is_reported_not_saved(client):
    c, _ = client(ScriptedLLM(fail=True))
    _, events = chat(c, "What is RoadGuard?")
    assert events[-1]["type"] == "error"
    assert c.get("/conversations/conv-000001", headers=VISITOR).json()["messages"] == []


def test_api_key_and_input_validation(client):
    c, _ = client(api_key="s3cret")
    assert chat(c, "hi")[0].status_code == 401
    assert chat(c, "hi", headers={**VISITOR, "x-arc-key": "s3cret"})[0].status_code == 200
    assert chat(c, "hi", headers={"x-arc-key": "s3cret"})[0].status_code == 400  # no visitor id
    r = c.post("/chat", json={"question": "x" * 501, "conversation_id": "conv-000001"}, headers={**VISITOR, "x-arc-key": "s3cret"})
    assert r.status_code == 422
