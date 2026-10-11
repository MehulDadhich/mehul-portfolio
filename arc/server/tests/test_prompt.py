from app.prompt import build_prompt, count_tokens, query_follows_up, retrieval_query


def test_prompt_contains_rules_facts_and_question(retriever):
    hits = retriever.search("where did he study", k=3)
    p = build_prompt("Where did he study?", hits, [], [], name="Arc", budget=3000)
    system = p.messages[0]["content"]
    assert p.messages[0]["role"] == "system" and "You are Arc" in system
    assert "VIT-AP" in system and "**" not in system  # markdown bold stripped from facts
    assert p.messages[-1] == {"role": "user", "content": "Where did he study?"}


def test_prompt_stays_within_budget_and_keeps_latest_turns(retriever):
    hits = retriever.search("tell me about roadguard", k=5)
    history = []
    for i in range(30):
        history += [{"role": "user", "content": f"question {i} " + "x" * 300},
                    {"role": "assistant", "content": f"answer {i} " + "y" * 300}]
    p = build_prompt("and then?", hits, history, [], name="Arc", budget=1500)
    assert p.tokens <= 1500
    assert 0 < p.history_turns < len(history)
    kept = p.messages[1:-1]
    assert kept[0]["role"] == "user"  # never starts with an orphaned answer
    assert kept[-1]["content"].startswith("answer 29")  # the most recent turn survives


def test_visitor_notes_are_included(retriever):
    p = build_prompt("hi", [], [], ["The visitor is a recruiter at Acme."], name="Arc", budget=3000)
    assert "recruiter at Acme" in p.messages[0]["content"]


def test_follow_ups_borrow_the_previous_question():
    history = [{"role": "user", "content": "Tell me about RoadGuard"}, {"role": "assistant", "content": "…"}]
    assert retrieval_query("What models does it use?", history) == "Tell me about RoadGuard What models does it use?"
    assert retrieval_query("Where did he study at university?", history) == "Where did he study at university?"
    assert query_follows_up("why?") and not query_follows_up("Which certifications has he earned?")


def test_token_estimate_is_conservative():
    assert count_tokens("hello world, this is a sentence.") >= 7
