"""
BYOPGateCS.studio backend regression tests.
Covers: health/meta, seed, questions CRUD + bulk, filters, practice/SRS,
study-logs, timeline (+ schedule/complete revisions), revisits, calendar,
pulse, settings, mistakes.
"""
import os
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
S = requests.Session()
S.headers.update({"Content-Type": "application/json"})

TODAY = date.today().isoformat()


def _get(p, **kw): return S.get(f"{BASE_URL}{p}", timeout=30, **kw)
def _post(p, **kw): return S.post(f"{BASE_URL}{p}", timeout=30, **kw)
def _put(p, **kw): return S.put(f"{BASE_URL}{p}", timeout=30, **kw)
def _delete(p, **kw): return S.delete(f"{BASE_URL}{p}", timeout=30, **kw)


# ---------------- health/meta ----------------
def test_root():
    r = _get("/")
    assert r.status_code == 200
    j = r.json()
    assert j["app"] == "BYOPGateCS.studio"
    assert j["status"] == "ok"


def test_meta():
    r = _get("/meta")
    assert r.status_code == 200
    j = r.json()
    assert len(j["subjects"]) == 12
    assert len(j["activities"]) == 5
    assert j["srs_intervals"] == [1, 3, 7, 14, 30, 90]


# ---------------- seed ----------------
def test_seed_demo_idempotent():
    r1 = _post("/seed-demo")
    assert r1.status_code == 200
    j1 = r1.json()
    # Either a fresh seed (seeded=True, count=8) or already-seeded skip
    # (seeded=False, count>=8). Both are acceptable.
    assert j1.get("count", 0) >= 8
    assert j1.get("seeded") in (True, False)

    r2 = _post("/seed-demo")
    assert r2.status_code == 200
    j2 = r2.json()
    # The second call MUST be a no-op (already-seeded).
    assert j2.get("seeded") is False


# ---------------- questions CRUD ----------------
def test_question_invalid_subject():
    r = _post("/questions", json={"subject": "XYZ", "statement": "x"})
    assert r.status_code == 400


_q_state = {}


def test_question_crud_and_enrichment():
    payload = {
        "subject": "OS", "topic": "Scheduling", "question_type": "MCQ",
        "statement": "TEST_question", "options": ["a", "b"],
        "correct_answer": "A", "explanation": "ex",
    }
    r = _post("/questions", json=payload)
    assert r.status_code == 200, r.text
    qid = r.json()["id"]
    _q_state["id"] = qid

    rl = _get("/questions")
    assert rl.status_code == 200
    items = rl.json()["items"]
    me = next((i for i in items if i["id"] == qid), None)
    assert me is not None
    assert "srs" in me and "mastery" in me and "next_revision_date" in me

    rs = _get(f"/questions/{qid}")
    assert rs.status_code == 200
    assert rs.json()["statement"] == "TEST_question"
    assert "attempts" in rs.json()

    ru = _put(f"/questions/{qid}", json={"topic": "TEST_NEWTOPIC"})
    assert ru.status_code == 200
    assert ru.json()["topic"] == "TEST_NEWTOPIC"
    assert _get(f"/questions/{qid}").json()["topic"] == "TEST_NEWTOPIC"


def test_question_filters():
    r = _get("/questions", params={"subject": "OS"})
    assert r.status_code == 200
    assert all(i["subject"] == "OS" for i in r.json()["items"])

    r = _get("/questions", params={"search": "process"})
    assert r.status_code == 200

    r = _get("/questions", params={"filter_mode": "never_attempted"})
    assert r.status_code == 200
    assert any(i["id"] == _q_state["id"] for i in r.json()["items"])

    r = _get("/questions", params={"filter_mode": "mastered"})
    assert r.status_code == 200
    assert all(i.get("mastery", 0) >= 80 for i in r.json()["items"])


def test_bulk_create_and_delete():
    rows = [
        {"subject": "DB", "statement": "TEST_bulk1", "question_type": "MCQ",
         "options": "x|y|z", "correct_answer": "A"},
        {"subject": "INVALID", "statement": "skip"},
        {"subject": "CN", "statement": "TEST_bulk2", "question_type": "MCQ",
         "options": "a|b", "correct_answer": "B"},
    ]
    r = _post("/questions/bulk-create", json={"rows": rows})
    assert r.status_code == 200
    j = r.json()
    assert j["created"] == 2
    assert j["skipped"] == 1

    lst = _get("/questions", params={"search": "TEST_bulk1"}).json()["items"]
    assert lst and lst[0]["options"] == ["x", "y", "z"]

    to_del = [lst[0]["id"]]
    other = _get("/questions", params={"search": "TEST_bulk2"}).json()["items"]
    if other: to_del.append(other[0]["id"])
    rd = _post("/questions/bulk-delete", json={"ids": to_del})
    assert rd.status_code == 200
    assert rd.json()["deleted"] == len(to_del)


# ---------------- practice / SRS ----------------
def test_practice_submit_srs_advance_and_reset():
    items = _get("/questions").json()["items"]
    assert items
    q = items[0]
    qid = q["id"]
    _q_state["practice_qid"] = qid

    r1 = _post("/practice/submit",
               json={"question_id": qid, "correct": True, "confidence": 4, "time_taken_sec": 60})
    assert r1.status_code == 200
    srs1 = r1.json()["srs"]
    assert srs1["total_attempts"] >= 1 and srs1["correct_attempts"] >= 1
    initial_idx = srs1["interval_idx"]
    assert initial_idx >= 1
    days = [1, 3, 7, 14, 30, 90][initial_idx]
    expected = (date.today() + timedelta(days=days)).isoformat()
    assert srs1["next_review_date"] == expected

    r2 = _post("/practice/submit",
               json={"question_id": qid, "correct": False, "confidence": 2})
    assert r2.status_code == 200
    assert r2.json()["srs"]["interval_idx"] == 0

    logs = _get("/study-logs", params={"start": TODAY, "end": TODAY}).json()["items"]
    assert any(l.get("activity") == "Practice" and l.get("auto") is True for l in logs)


def test_practice_next_due_mode():
    r = _get("/practice/next", params={"mode": "due"})
    assert r.status_code == 200


def test_srs_due():
    r = _get("/srs/due")
    assert r.status_code == 200
    assert "items" in r.json()


# ---------------- study-logs ----------------
def test_study_logs_crud():
    r = _post("/study-logs", json={"activity": "Lecture", "subject": "OS",
                                    "duration_min": 30, "remarks": "TEST_log"})
    assert r.status_code == 200
    lid = r.json()["id"]
    rl = _get("/study-logs")
    assert any(i["id"] == lid for i in rl.json()["items"])
    assert _delete(f"/study-logs/{lid}").status_code == 200


# ---------------- timeline ----------------
_tl = {}


def test_timeline_create_and_autolog():
    r = _post("/timeline", json={"subject": "DS", "topic": "Trees",
                                  "activity": "Lecture", "title": "TEST_tl",
                                  "duration_min": 45, "date": TODAY})
    assert r.status_code == 200
    eid = r.json()["id"]
    _tl["id"] = eid
    logs = _get("/study-logs", params={"start": TODAY, "end": TODAY}).json()["items"]
    assert any(l.get("timeline_entry_id") == eid for l in logs)


def test_timeline_schedule_and_complete_revision():
    eid = _tl["id"]
    r = _post(f"/timeline/{eid}/schedule-revision", json={"days": 7})
    assert r.status_code == 200
    expected = (date.today() + timedelta(days=7)).isoformat()
    assert expected in r.json()["scheduled_revisions"]

    r2 = _post(f"/timeline/{eid}/complete-revision", json={"date": expected})
    assert r2.status_code == 200
    assert expected in r2.json()["completed_revisions"]

    logs = _get("/study-logs", params={"start": TODAY, "end": TODAY}).json()["items"]
    assert any(l.get("activity") == "Revision" and l.get("timeline_entry_id") == eid for l in logs)


def test_timeline_delete_cascades():
    r = _post("/timeline", json={"subject": "AL", "activity": "Practice",
                                  "title": "TEST_del", "duration_min": 10, "date": TODAY})
    eid = r.json()["id"]
    logs_before = [l for l in _get("/study-logs", params={"start": TODAY, "end": TODAY}).json()["items"]
                    if l.get("timeline_entry_id") == eid]
    assert logs_before
    assert _delete(f"/timeline/{eid}").status_code == 200
    logs_after = [l for l in _get("/study-logs", params={"start": TODAY, "end": TODAY}).json()["items"]
                   if l.get("timeline_entry_id") == eid]
    assert not logs_after


# ---------------- revisits ----------------
_rv = {}


def test_revisit_create_bad_type():
    r = _post("/revisits", json={"item_type": "BAD", "item_id": "x", "days": 1})
    assert r.status_code == 400


def test_revisit_flow():
    qid = _q_state["id"]
    r = _post("/revisits", json={"item_type": "question", "item_id": qid,
                                  "item_title": "test", "days": 0})
    assert r.status_code == 200
    today_rid = r.json()["id"]

    r2 = _post("/revisits", json={"item_type": "question", "item_id": qid,
                                   "item_title": "test", "days": 3})
    assert r2.status_code == 200
    _rv["future_id"] = r2.json()["id"]

    due = _get("/revisits", params={"due_only": "true"}).json()["items"]
    assert any(i["id"] == today_rid for i in due)
    assert not any(i["id"] == _rv["future_id"] for i in due)

    rc = _post(f"/revisits/{today_rid}/complete")
    assert rc.status_code == 200
    assert rc.json()["completed"] is True


# ---------------- calendar ----------------
def test_calendar():
    start = TODAY
    end = (date.today() + timedelta(days=2)).isoformat()
    r = _get("/calendar", params={"start": start, "end": end})
    assert r.status_code == 200
    days = r.json()["days"]
    assert len(days) == 3
    for k in ("study_minutes", "study_hours", "questions_solved",
              "revisions_completed", "pending_revisit",
              "scheduled_revisions", "timeline_count"):
        assert k in days[0]


# ---------------- pulse ----------------
def test_pulse():
    r = _get("/pulse")
    assert r.status_code == 200
    p = r.json()
    for k in ("today", "mission", "momentum", "due_revisions", "due_revisits",
              "weak_topics", "subject_completion", "pyq_percent",
              "revision_readiness", "mock_readiness", "days_until_exam",
              "exam_date", "today_questions", "today_minutes",
              "daily_q_percent", "targets"):
        assert k in p, f"missing {k}"
    assert len(p["subject_completion"]) == 12
    assert 0 <= p["momentum"] <= 100
    assert len(p["mission"]) <= 4


# ---------------- settings ----------------
def test_settings():
    r = _get("/settings")
    assert r.status_code == 200
    assert "exam_date" in r.json()
    new_date = "2027-02-06"
    r2 = _put("/settings", json={"exam_date": new_date})
    assert r2.status_code == 200
    assert r2.json()["exam_date"] == new_date
    assert _get("/pulse").json()["exam_date"] == new_date


# ---------------- mistakes ----------------
def test_mistakes_modes():
    qid = _q_state["practice_qid"]
    _post("/practice/submit", json={"question_id": qid, "correct": False})
    r = _get("/mistakes", params={"mode": "all"})
    assert r.status_code == 200
    assert qid in [i["id"] for i in r.json()["items"]]

    _post("/practice/submit", json={"question_id": qid, "correct": False})
    r2 = _get("/mistakes", params={"mode": "frequently_wrong"})
    assert r2.status_code == 200
    assert qid in [i["id"] for i in r2.json()["items"]]


# ---------------- cleanup ----------------
def test_zz_cleanup_test_question():
    qid = _q_state.get("id")
    if qid:
        r = _delete(f"/questions/{qid}")
        assert r.status_code in (200, 404)
        assert _get(f"/questions/{qid}").status_code == 404
