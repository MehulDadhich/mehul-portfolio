from app.knowledge import split_text
from app.rag import detect_project, stem


def test_stemming_joins_word_forms():
    assert stem("graduated") == stem("graduate") == stem("graduation") == stem("graduating")
    assert stem("studied") == stem("study") == stem("studies")
    assert stem("projects") == stem("project")
    assert stem("yolo11") == "yolo11"  # model names stay intact


def test_knowledge_base_loads_every_document(chunks):
    ids = {c.doc_id for c in chunks}
    assert {"about", "education", "contact", "roadguard.overview", "skills.cv"} <= ids
    assert all(c.text and c.title for c in chunks)


def test_long_documents_split_with_overlap():
    text = " ".join(f"Sentence number {i} is here." for i in range(80))
    parts = split_text(text, max_chars=300)
    assert len(parts) > 1 and all(len(p) <= 340 for p in parts)
    assert parts[0].split(". ")[-1] in parts[1]  # one sentence repeated across the boundary


def test_graduated_finds_education(retriever):
    hits = retriever.search("where did he graduated from", k=3)
    assert hits[0].chunk.doc_id == "education"


def test_project_focus_keeps_other_projects_out(retriever, projects):
    project = detect_project("Tell me about the accident detection system", projects)
    assert project == "roadguard"
    hits = retriever.search("what models does it use for detection", k=6, project=project)
    assert hits and all(h.chunk.entity in (None, "roadguard") for h in hits)


def test_detect_project_ignores_comparisons(projects):
    assert detect_project("compare roadguard and the warehouse system", projects) is None
    assert detect_project("what are his skills?", projects) is None


def test_include_pins_a_document(retriever):
    hits = retriever.search("I'm a recruiter at Acme Robotics", k=4, include=("about",))
    assert hits[0].chunk.doc_id == "about"


def test_unrelated_question_returns_few_or_no_hits(retriever):
    assert len(retriever.search("what is the capital of peru", k=5, min_score=0.3)) <= 2


def test_follow_up_lookalike_keeps_its_own_topic(retriever, projects):
    """"projects that show…" reads like a follow-up ("that"), but the earlier question must not crowd it out."""
    from app.config import settings
    from app.conversation import ArcService
    from tests.conftest import ScriptedLLM

    svc = ArcService(settings, retriever, ScriptedLLM(), None, projects, {})
    question = "what are his projects that show he is good at what he does"
    hits = svc.find(question, f"is mehul good for hiring for an ai ml engineer role {question}", None, ())
    assert hits and hits[0].chunk.id == retriever.search(question, settings.top_k, settings.min_score)[0].chunk.id
