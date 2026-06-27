"""
Pre-deployment review tests for BYOPGateCS.studio
Covers:
  - Timeline revision scheduling -> pulse due_revisions/due_timeline_revisions + mission
  - Timeline list with date range pulling scheduled_revisions outside parent date
  - Complete revision flow decreases due_timeline_revisions
  - Regression checks on /api/, /api/meta, /api/settings, /api/questions,
    /api/srs/due, /api/calendar
"""
import os
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
S = requests.Session()
S.headers.update({"Content-Type": "application/json"})

TODAY = date.today().isoformat()


def _get(p, **kw): return S.get(f"{BASE_URL}{p}", timeout=30, **kw)
def _post(p, **kw): return S.post(f"{BASE_URL}{p}", timeout=30, **kw)
def _delete(p, **kw): return S.delete(f"{BASE_URL}{p}", timeout=30, **kw)


# ---- Regression on existing endpoints ----
@pytest.mark.parametrize("path", ["/", "/meta", "/settings", "/questions", "/srs/due"])
def test_regression_existing_endpoints(path):
    r = _get(path)
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"


def test_regression_calendar_range():
    r = _get("/calendar", params={"start": "2026-06-01", "end": "2026-06-30"})
    assert r.status_code == 200
    days = r.json()["days"]
    assert isinstance(days, list) and len(days) == 30


# ---- New scenario: scheduling a revision for TODAY bumps pulse counts ----
def test_pulse_increments_for_today_scheduled_revision():
    pulse_before = _get("/pulse").json()
    base_due_total = pulse_before["due_revisions"]
    base_due_tl = pulse_before["due_timeline_revisions"]

    # Create timeline entry with date OUTSIDE the test range
    parent_date = "2026-06-20"
    create = _post("/timeline", json={
        "subject": "OS", "topic": "TEST_review",
        "activity": "Lecture", "title": "TEST_review_entry",
        "duration_min": 10, "date": parent_date,
    })
    assert create.status_code == 200, create.text
    eid = create.json()["id"]

    try:
        # Schedule revision for TODAY
        sched = _post(f"/timeline/{eid}/schedule-revision", json={"date": TODAY})
        assert sched.status_code == 200
        assert TODAY in sched.json()["scheduled_revisions"]

        pulse_after = _get("/pulse").json()
        # due_timeline_revisions must increase by at least 1
        assert pulse_after["due_timeline_revisions"] == base_due_tl + 1, (
            f"expected {base_due_tl + 1}, got {pulse_after['due_timeline_revisions']}"
        )
        # due_revisions total must include this addition
        assert pulse_after["due_revisions"] == base_due_total + 1

        # Mission should contain a 'Complete N due revisions' item
        titles = [m.get("title", "") for m in pulse_after.get("mission", [])]
        assert any(
            "due revisions" in t.lower() and "complete" in t.lower() for t in titles
        ), f"mission titles: {titles}"

        # New 'due_timeline_revisions' field is exposed
        assert "due_timeline_revisions" in pulse_after
        assert "due_srs" in pulse_after

        # ---- Now complete the revision and re-verify counts decrement ----
        comp = _post(f"/timeline/{eid}/complete-revision", json={"date": TODAY})
        assert comp.status_code == 200
        assert TODAY in comp.json()["completed_revisions"]

        pulse_done = _get("/pulse").json()
        assert pulse_done["due_timeline_revisions"] == base_due_tl, (
            f"expected back to {base_due_tl}, got {pulse_done['due_timeline_revisions']}"
        )
        assert pulse_done["due_revisions"] == base_due_total
    finally:
        # Cleanup test entry + autologs
        _delete(f"/timeline/{eid}")


# ---- New scenario: timeline list pulls in revisions scheduled INSIDE range
# even when parent entry date is OUTSIDE range ----
def test_timeline_list_pulls_scheduled_revisions_in_range():
    parent_date = "2026-06-20"   # outside range below
    rev_date = "2026-06-27"      # inside range
    create = _post("/timeline", json={
        "subject": "DS", "topic": "TEST_range",
        "activity": "Lecture", "title": "TEST_range_entry",
        "duration_min": 10, "date": parent_date,
    })
    assert create.status_code == 200
    eid = create.json()["id"]

    try:
        sched = _post(f"/timeline/{eid}/schedule-revision", json={"date": rev_date})
        assert sched.status_code == 200

        r = _get("/timeline", params={"start": "2026-06-25", "end": "2026-06-30"})
        assert r.status_code == 200
        body = r.json()
        scheduled = body.get("scheduled_revisions", [])
        # The virtual revision entry referencing our parent must appear
        match = [s for s in scheduled if s.get("parent_id") == eid and s.get("date") == rev_date]
        assert match, (
            f"expected scheduled revision for parent {eid} on {rev_date} in "
            f"{[{'parent': s.get('parent_id'), 'date': s.get('date')} for s in scheduled]}"
        )
        assert match[0]["activity"] == "Revision"
        assert match[0].get("is_virtual") is True

        # And the parent should NOT appear in `items` (because its date is outside the range)
        item_ids = [i["id"] for i in body.get("items", [])]
        assert eid not in item_ids
    finally:
        _delete(f"/timeline/{eid}")
