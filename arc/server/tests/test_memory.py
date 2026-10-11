import asyncio

import pytest

from app.memory.base import MAX_NOTES
from app.memory.extract import visitor_notes
from app.memory.local_store import LocalMemoryStore


@pytest.fixture
def store(tmp_path):
    return LocalMemoryStore(tmp_path)


def run(coro):
    return asyncio.run(coro)


def test_conversation_round_trip(store):
    run(store.append("visitor-a1", "conv-000001", [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}]))
    run(store.append("visitor-a1", "conv-000001", [{"role": "user", "content": "more"}]))
    assert [m["content"] for m in run(store.history("visitor-a1", "conv-000001"))] == ["hi", "hello", "more"]
    assert [m["content"] for m in run(store.history("visitor-a1", "conv-000001", limit=1))] == ["more"]


def test_visitors_cannot_see_each_other(store):
    run(store.append("visitor-a1", "conv-000001", [{"role": "user", "content": "secret"}]))
    run(store.add_note("visitor-a1", "The visitor is a recruiter at Acme."))
    assert run(store.history("visitor-b2", "conv-000001")) == []
    assert run(store.notes("visitor-b2")) == []


def test_notes_are_deduplicated_and_capped(store):
    for i in range(MAX_NOTES + 3):
        run(store.add_note("visitor-a1", f"note {i}"))
    run(store.add_note("visitor-a1", f"NOTE {MAX_NOTES + 2}"))
    notes = run(store.notes("visitor-a1"))
    assert len(notes) == MAX_NOTES and notes[0] == f"note {MAX_NOTES + 2}"


def test_forget_deletes_everything(store):
    run(store.append("visitor-a1", "conv-000001", [{"role": "user", "content": "hi"}]))
    run(store.forget("visitor-a1"))
    assert run(store.history("visitor-a1", "conv-000001")) == [] and run(store.notes("visitor-a1")) == []


@pytest.mark.parametrize("bad", ["../etc", "a", "x" * 200, "has space", ""])
def test_ids_are_validated(store, bad):
    with pytest.raises(ValueError):
        run(store.history(bad, "conv-000001"))


def test_only_meaningful_statements_are_remembered():
    assert visitor_notes("Hi, I'm a recruiter at Acme Robotics. Who is Mehul?") == ["The visitor is a recruiter at Acme Robotics."]
    assert visitor_notes("We're hiring for a computer vision engineer.") == ["The visitor is hiring for computer vision engineer."]
    assert visitor_notes("my name is Priya") == ["The visitor's name is Priya."]
    assert visitor_notes("What projects has he built?") == []
