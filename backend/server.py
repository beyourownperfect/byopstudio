"""
BYOPGateCS.studio — GATE CSE Study Operating System
Single-user backend. MongoDB. FastAPI.
"""

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
import random
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
import uuid
from datetime import datetime, timezone, date, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME", "byopstudio")

if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
else:
    try:
        import mongomock_motor

        client = mongomock_motor.AsyncMongoMockClient()
        db = client[db_name]
    except Exception as exc:
        print(f"Failed to initialize fallback database backend: {exc}", file=sys.stderr)
        raise

app = FastAPI(title="BYOPGateCS.studio API")
api_router = APIRouter(prefix="/api")

SUBJECTS = ["C", "DS", "AL", "OS", "DB", "COA", "TOC", "CD", "DL", "EM", "DM", "CN"]
ACTIVITIES = ["Lecture", "Practice", "Revision", "Mock Test", "Reading"]
SRS_INTERVALS = [1, 3, 7, 14, 30, 90]  # days
REVISIT_TYPES = [
    "question",
    "note",
    "journal",
    "study_session",
    "lecture",
    "timeline_entry",
    "mock_test",
    "weak_topic",
    "repository_item",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_iso() -> str:
    return date.today().isoformat()


def add_days(iso_date: str, days: int) -> str:
    d = datetime.strptime(iso_date, "%Y-%m-%d").date()
    return (d + timedelta(days=days)).isoformat()


def strip_id(d):
    if d and "_id" in d:
        d.pop("_id")
    return d


# ============================== MODELS ==============================
class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject: str
    topic: str = ""
    question_type: Literal["MCQ", "MSQ", "NAT"] = "MCQ"
    statement: str
    options: List[str] = Field(default_factory=list)
    correct_answer: str = (
        ""  # for MCQ: option letter; MSQ: comma-separated; NAT: number
    )
    explanation: str = ""
    gateoverflow_url: str = ""
    year: Optional[int] = None
    difficulty: Literal["Easy", "Medium", "Hard"] = "Medium"
    bookmarked: bool = False
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class QuestionCreate(BaseModel):
    subject: str
    topic: str = ""
    question_type: Literal["MCQ", "MSQ", "NAT"] = "MCQ"
    statement: str
    options: List[str] = Field(default_factory=list)
    correct_answer: str = ""
    explanation: str = ""
    gateoverflow_url: str = ""
    year: Optional[int] = None
    difficulty: Literal["Easy", "Medium", "Hard"] = "Medium"
    bookmarked: bool = False
    notes: str = ""


class QuestionUpdate(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    question_type: Optional[str] = None
    statement: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    gateoverflow_url: Optional[str] = None
    year: Optional[int] = None
    difficulty: Optional[str] = None
    bookmarked: Optional[bool] = None
    notes: Optional[str] = None


class Attempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_id: str
    correct: bool
    confidence: int = 3  # 1..5
    user_answer: str = ""
    time_taken_sec: int = 0
    created_at: str = Field(default_factory=now_iso)


class SrsRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_id: str
    interval_idx: int = 0  # 0 -> 1 day
    next_review_date: str = Field(default_factory=today_iso)
    last_reviewed: Optional[str] = None
    total_attempts: int = 0
    correct_attempts: int = 0
    consecutive_correct: int = 0


class StudyLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    activity: str
    subject: str
    topic: str = ""
    duration_min: int = 0
    questions_attempted: int = 0
    questions_correct: int = 0
    questions_wrong: int = 0
    remarks: str = ""
    date: str = Field(default_factory=today_iso)
    timeline_entry_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class TimelineEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject: str
    topic: str = ""
    activity: str  # Lecture, Practice, Revision, Mock Test, Reading
    title: str
    duration_min: int = 0
    questions_solved: int = 0
    notes: str = ""
    date: str = Field(default_factory=today_iso)
    scheduled_revisions: List[str] = Field(default_factory=list)
    completed_revisions: List[str] = Field(default_factory=list)
    completion_status: Literal["planned", "in_progress", "completed"] = "completed"
    created_at: str = Field(default_factory=now_iso)


class RevisitItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_type: str
    item_id: str
    item_title: str = ""
    item_subject: Optional[str] = None
    revisit_date: str  # YYYY-MM-DD
    completed: bool = False
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class Settings(BaseModel):
    id: str = "singleton"
    exam_date: str = "2026-02-07"  # GATE 2026 weekend (default; user editable)
    daily_question_target: int = 20
    daily_revision_target: int = 10
    daily_study_minutes_target: int = 240
    updated_at: str = Field(default_factory=now_iso)


class UserMission(BaseModel):
    """User-authored mission task (separate from system-computed recommendations)."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    notes: str = ""
    order: int = 0
    completed: bool = False
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


# ============================ HELPERS ==============================
async def _ensure_srs(question_id: str) -> dict:
    rec = await db.srs.find_one({"question_id": question_id}, {"_id": 0})
    if rec:
        return rec
    s = SrsRecord(question_id=question_id)
    await db.srs.insert_one(s.model_dump())
    return s.model_dump()


def _compute_mastery(srs: dict) -> int:
    """Mastery score 0-100. Blends current SRS interval reached (60% weight)
    with lifetime accuracy (40% weight). A perfect run through all 6 intervals
    with 100% accuracy => 100. Zero attempts => 0."""
    if not srs or srs.get("total_attempts", 0) == 0:
        return 0
    acc = srs["correct_attempts"] / srs["total_attempts"]
    interval_pct = (srs.get("interval_idx", 0) / (len(SRS_INTERVALS) - 1)) * 100
    return int(min(100, 0.6 * interval_pct + 40 * acc))


def _is_question_completed(srs: dict) -> bool:
    """A question is "completed" only after 1 correct solve + 2 successful SRS revisions.
    That requires advancing through 3 SRS intervals (idx 0 -> 1 -> 2 -> 3),
    which can only happen via 3 correct answers in a row from the start
    (or after a reset). interval_idx >= 3 AND correct_attempts >= 3."""
    if not srs:
        return False
    return srs.get("interval_idx", 0) >= 3 and srs.get("correct_attempts", 0) >= 3


async def _get_settings() -> dict:
    s = await db.settings.find_one({"id": "singleton"}, {"_id": 0})
    if s:
        return s
    s = Settings().model_dump()
    # insert_one mutates `s` by adding _id; insert a copy and return the clean dict
    await db.settings.insert_one(dict(s))
    return s


# ============================ HEALTH ===============================
@api_router.get("/")
async def root():
    return {"app": "BYOPGateCS.studio", "status": "ok"}


@api_router.get("/meta")
async def meta():
    return {
        "subjects": SUBJECTS,
        "activities": ACTIVITIES,
        "srs_intervals": SRS_INTERVALS,
    }


# ============================ SETTINGS =============================
@api_router.get("/settings")
async def get_settings():
    return await _get_settings()


@api_router.put("/settings")
async def update_settings(payload: Dict[str, Any]):
    update = {k: v for k, v in payload.items() if v is not None}
    update["updated_at"] = now_iso()
    await db.settings.update_one({"id": "singleton"}, {"$set": update}, upsert=True)
    return await _get_settings()


# ============================ QUESTIONS ============================
@api_router.post("/questions", response_model=Question)
async def create_question(payload: QuestionCreate):
    if payload.subject not in SUBJECTS:
        raise HTTPException(400, f"Invalid subject. Use one of {SUBJECTS}")
    q = Question(**payload.model_dump())
    await db.questions.insert_one(q.model_dump())
    await _ensure_srs(q.id)
    return q


@api_router.get("/questions")
async def list_questions(
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    question_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    bookmarked: Optional[bool] = None,
    search: Optional[str] = None,
    filter_mode: Optional[
        str
    ] = None,  # due_today, revisit_today, wrong, weak, never_attempted, mastered
    limit: int = 1000,
    skip: int = 0,
):
    query: Dict[str, Any] = {}
    if subject and subject != "ALL":
        query["subject"] = subject
    if topic:
        query["topic"] = {"$regex": topic, "$options": "i"}
    if question_type:
        query["question_type"] = question_type
    if difficulty:
        query["difficulty"] = difficulty
    if bookmarked is not None:
        query["bookmarked"] = bookmarked
    if search:
        query["$or"] = [
            {"statement": {"$regex": search, "$options": "i"}},
            {"topic": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}},
        ]

    docs = (
        await db.questions.find(query, {"_id": 0})
        .sort("updated_at", -1)
        .skip(skip)
        .to_list(limit)
    )

    # Batch-fetch enrichment data in 3 queries instead of N+1 per question
    today = today_iso()
    qids = [q["id"] for q in docs]

    # 1. All SRS records for these questions
    srs_docs = await db.srs.find({"question_id": {"$in": qids}}, {"_id": 0}).to_list(limit)
    srs_map = {s["question_id"]: s for s in srs_docs}

    # 2. Latest attempt per question (via aggregation for efficiency)
    last_attempt_map: Dict[str, dict] = {}
    if qids:
        pipeline = [
            {"$match": {"question_id": {"$in": qids}}},
            {"$sort": {"created_at": -1}},
            {"$group": {"_id": "$question_id", "doc": {"$first": "$$ROOT"}}},
        ]
        async for g in db.attempts.aggregate(pipeline):
            doc = g["doc"]
            doc.pop("_id", None)
            last_attempt_map[g["_id"]] = doc

    # 3. Revisit data: last and next (upcoming) per question
    all_revisits = await db.revisits.find(
        {"item_type": "question", "item_id": {"$in": qids}}, {"_id": 0}
    ).sort("revisit_date", -1).to_list(limit * 4)
    last_revisit_map: Dict[str, dict] = {}
    next_revisit_map: Dict[str, dict] = {}
    for rv in all_revisits:
        qid = rv["item_id"]
        if qid not in last_revisit_map:
            last_revisit_map[qid] = rv
        if not rv.get("completed") and rv.get("revisit_date", "") >= today:
            existing = next_revisit_map.get(qid)
            if not existing or rv["revisit_date"] < existing["revisit_date"]:
                next_revisit_map[qid] = rv

    enriched = []
    for q in docs:
        qid = q["id"]
        srs = srs_map.get(qid, {})
        last_attempt = last_attempt_map.get(qid)
        last_revisit = last_revisit_map.get(qid)
        next_revisit_doc = next_revisit_map.get(qid)
        q["srs"] = srs
        q["mastery"] = _compute_mastery(srs)
        q["last_attempt"] = last_attempt
        q["last_attempt_correct"] = last_attempt["correct"] if last_attempt else None
        q["confidence"] = last_attempt["confidence"] if last_attempt else None
        q["next_revision_date"] = srs.get("next_review_date")
        q["last_reviewed"] = srs.get("last_reviewed")
        q["next_revisit_date"] = (
            next_revisit_doc["revisit_date"] if next_revisit_doc else None
        )
        q["last_revisit_date"] = last_revisit["revisit_date"] if last_revisit else None
        enriched.append(q)

    # filter_mode is applied post-enrichment
    if filter_mode:
        if filter_mode == "due_today":
            enriched = [
                q
                for q in enriched
                if q.get("next_revision_date") and q["next_revision_date"] <= today
            ]
        elif filter_mode == "revisit_today":
            revisit_ids = {
                r["item_id"]
                for r in await db.revisits.find(
                    {
                        "item_type": "question",
                        "completed": False,
                        "revisit_date": {"$lte": today},
                    },
                    {"_id": 0},
                ).to_list(10000)
            }
            enriched = [q for q in enriched if q["id"] in revisit_ids]
        elif filter_mode == "bookmarked":
            enriched = [q for q in enriched if q.get("bookmarked")]
        elif filter_mode == "wrong":
            enriched = [q for q in enriched if q.get("last_attempt_correct") is False]
        elif filter_mode == "weak":
            enriched = [
                q
                for q in enriched
                if q.get("mastery", 0) < 40
                and q.get("srs", {}).get("total_attempts", 0) > 0
            ]
        elif filter_mode == "never_attempted":
            enriched = [q for q in enriched if not q.get("last_attempt")]
        elif filter_mode == "mastered":
            enriched = [q for q in enriched if q.get("mastery", 0) >= 80]

    return {"items": enriched, "total": len(enriched)}


@api_router.get("/questions/{qid}")
async def get_question(qid: str):
    q = await db.questions.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Question not found")
    srs = await db.srs.find_one({"question_id": qid}, {"_id": 0}) or {}
    attempts = (
        await db.attempts.find({"question_id": qid}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(50)
    )
    q["srs"] = srs
    q["mastery"] = _compute_mastery(srs)
    q["attempts"] = attempts
    return q


@api_router.put("/questions/{qid}")
async def update_question(qid: str, payload: QuestionUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    update["updated_at"] = now_iso()
    res = await db.questions.find_one_and_update(
        {"id": qid}, {"$set": update}, return_document=True
    )
    if not res:
        raise HTTPException(404, "Question not found")
    return strip_id(res)


@api_router.delete("/questions/{qid}")
async def delete_question(qid: str):
    res = await db.questions.delete_one({"id": qid})
    if res.deleted_count == 0:
        raise HTTPException(404)
    await db.srs.delete_many({"question_id": qid})
    await db.attempts.delete_many({"question_id": qid})
    await db.revisits.delete_many({"item_type": "question", "item_id": qid})
    return {"success": True}


@api_router.post("/questions/bulk-delete")
async def bulk_delete_questions(payload: Dict[str, List[str]]):
    ids = payload.get("ids", [])
    if not ids:
        return {"deleted": 0}
    res = await db.questions.delete_many({"id": {"$in": ids}})
    await db.srs.delete_many({"question_id": {"$in": ids}})
    await db.attempts.delete_many({"question_id": {"$in": ids}})
    await db.revisits.delete_many({"item_type": "question", "item_id": {"$in": ids}})
    return {"deleted": res.deleted_count}


@api_router.post("/questions/bulk-create")
async def bulk_create_questions(payload: Dict[str, List[Dict[str, Any]]]):
    rows = payload.get("rows", [])
    created = 0
    skipped = 0
    for r in rows:
        try:
            if r.get("subject") not in SUBJECTS:
                skipped += 1
                continue
            if isinstance(r.get("options"), str):
                r["options"] = [o.strip() for o in r["options"].split("|") if o.strip()]
            q = Question(**{k: v for k, v in r.items() if k in Question.model_fields})
            await db.questions.insert_one(q.model_dump())
            await _ensure_srs(q.id)
            created += 1
        except Exception:
            skipped += 1
    return {"created": created, "skipped": skipped}


# ============================ PRACTICE / SRS =======================
@api_router.get("/practice/next")
async def next_question(
    mode: str = "due",  # due, wrong, bookmarked, weak, new, all, subject
    subject: Optional[str] = None,
    exclude_ids: Optional[str] = None,
):
    today = today_iso()
    exclude = set(exclude_ids.split(",")) if exclude_ids else set()
    query: Dict[str, Any] = {}
    if subject and subject != "ALL":
        query["subject"] = subject

    candidates: List[dict] = []
    if mode == "due":
        due_srs = await db.srs.find(
            {"next_review_date": {"$lte": today}}, {"_id": 0}
        ).to_list(1000)
        ids = [s["question_id"] for s in due_srs if s["question_id"] not in exclude]
        if ids:
            q = {**query, "id": {"$in": ids}}
            candidates = await db.questions.find(q, {"_id": 0}).to_list(1000)
    elif mode == "wrong":
        # latest attempt was wrong
        all_attempts = (
            await db.attempts.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
        )
        latest_by_q: Dict[str, dict] = {}
        for a in all_attempts:
            if a["question_id"] not in latest_by_q:
                latest_by_q[a["question_id"]] = a
        ids = [
            qid
            for qid, a in latest_by_q.items()
            if not a["correct"] and qid not in exclude
        ]
        if ids:
            candidates = await db.questions.find(
                {**query, "id": {"$in": ids}}, {"_id": 0}
            ).to_list(1000)
    elif mode == "bookmarked":
        candidates = await db.questions.find(
            {**query, "bookmarked": True, "id": {"$nin": list(exclude)}}, {"_id": 0}
        ).to_list(1000)
    elif mode == "weak":
        all_srs = await db.srs.find({"total_attempts": {"$gt": 0}}, {"_id": 0}).to_list(
            5000
        )
        weak_ids = [
            s["question_id"]
            for s in all_srs
            if _compute_mastery(s) < 40 and s["question_id"] not in exclude
        ]
        if weak_ids:
            candidates = await db.questions.find(
                {**query, "id": {"$in": weak_ids}}, {"_id": 0}
            ).to_list(1000)
    elif mode == "new":
        attempted_ids = {
            a["question_id"]
            for a in await db.attempts.find({}, {"_id": 0, "question_id": 1}).to_list(
                50000
            )
        }
        all_qs = await db.questions.find(query, {"_id": 0}).to_list(5000)
        candidates = [
            q for q in all_qs if q["id"] not in attempted_ids and q["id"] not in exclude
        ]
    else:  # all / subject
        candidates = await db.questions.find(
            {**query, "id": {"$nin": list(exclude)}}, {"_id": 0}
        ).to_list(5000)

    if not candidates:
        return None

    picked = random.choice(candidates)
    srs = await _ensure_srs(picked["id"])
    picked["srs"] = srs
    picked["mastery"] = _compute_mastery(srs)
    return picked


@api_router.post("/practice/submit")
async def submit_practice(payload: Dict[str, Any]):
    qid = payload["question_id"]
    correct = bool(payload.get("correct", False))
    confidence = int(payload.get("confidence", 3))
    user_answer = str(payload.get("user_answer", ""))
    time_taken = int(payload.get("time_taken_sec", 0))

    q = await db.questions.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Question not found")

    attempt = Attempt(
        question_id=qid,
        correct=correct,
        confidence=confidence,
        user_answer=user_answer,
        time_taken_sec=time_taken,
    )
    await db.attempts.insert_one(attempt.model_dump())

    srs = await _ensure_srs(qid)
    # SRS update rule:
    #   correct  -> advance one interval (capped at last), streak += 1
    #   wrong    -> reset to first interval (1 day), streak = 0
    # next_review_date = today + SRS_INTERVALS[new_idx]
    if correct:
        new_idx = min(srs["interval_idx"] + 1, len(SRS_INTERVALS) - 1)
        cc = srs.get("consecutive_correct", 0) + 1
    else:
        new_idx = 0
        cc = 0
    days = SRS_INTERVALS[new_idx]
    next_review = (date.today() + timedelta(days=days)).isoformat()
    update = {
        "interval_idx": new_idx,
        "next_review_date": next_review,
        "last_reviewed": today_iso(),
        "total_attempts": srs.get("total_attempts", 0) + 1,
        "correct_attempts": srs.get("correct_attempts", 0) + (1 if correct else 0),
        "consecutive_correct": cc,
    }
    await db.srs.update_one({"question_id": qid}, {"$set": update}, upsert=True)

    # auto-log: aggregate practice into today's practice log for this subject
    log_filter = {
        "date": today_iso(),
        "activity": "Practice",
        "subject": q["subject"],
        "auto": True,
    }
    existing = await db.study_logs.find_one(log_filter, {"_id": 0})
    if existing:
        await db.study_logs.update_one(
            {"id": existing["id"]},
            {
                "$inc": {
                    "questions_attempted": 1,
                    "questions_correct": 1 if correct else 0,
                    "questions_wrong": 0 if correct else 1,
                    "duration_min": max(1, time_taken // 60),
                }
            },
        )
    else:
        log = StudyLog(
            activity="Practice",
            subject=q["subject"],
            topic=q.get("topic", ""),
            duration_min=max(1, time_taken // 60),
            questions_attempted=1,
            questions_correct=1 if correct else 0,
            questions_wrong=0 if correct else 1,
            remarks="auto-logged",
        )
        doc = log.model_dump()
        doc["auto"] = True
        await db.study_logs.insert_one(doc)

    updated_srs = await db.srs.find_one({"question_id": qid}, {"_id": 0})
    return {
        "attempt": attempt.model_dump(),
        "srs": updated_srs,
        "mastery": _compute_mastery(updated_srs),
        "next_review_date": next_review,
        "correct_answer": q.get("correct_answer"),
        "explanation": q.get("explanation"),
        "gateoverflow_url": q.get("gateoverflow_url"),
    }


@api_router.get("/srs/due")
async def srs_due(limit: int = 100):
    today = today_iso()
    due = (
        await db.srs.find({"next_review_date": {"$lte": today}}, {"_id": 0})
        .sort("next_review_date", 1)
        .to_list(limit)
    )
    qids = [s["question_id"] for s in due]
    if not qids:
        return {"items": [], "total": 0}
    qs = await db.questions.find({"id": {"$in": qids}}, {"_id": 0}).to_list(limit)
    qmap = {q["id"]: q for q in qs}
    items = []
    for s in due:
        q = qmap.get(s["question_id"])
        if q:
            items.append({**q, "srs": s, "mastery": _compute_mastery(s)})
    return {"items": items, "total": len(items)}


# ============================ STUDY LOGS ===========================
@api_router.post("/study-logs", response_model=StudyLog)
async def create_log(payload: Dict[str, Any]):
    payload.setdefault("date", today_iso())
    log = StudyLog(**{k: v for k, v in payload.items() if k in StudyLog.model_fields})
    await db.study_logs.insert_one(log.model_dump())
    return log


@api_router.get("/study-logs")
async def list_logs(
    start: Optional[str] = None, end: Optional[str] = None, limit: int = 1000
):
    query: Dict[str, Any] = {}
    if start or end:
        rng = {}
        if start:
            rng["$gte"] = start
        if end:
            rng["$lte"] = end
        query["date"] = rng
    docs = (
        await db.study_logs.find(query, {"_id": 0})
        .sort("created_at", -1)
        .to_list(limit)
    )
    return {"items": docs, "total": len(docs)}


@api_router.delete("/study-logs/{log_id}")
async def delete_log(log_id: str):
    res = await db.study_logs.delete_one({"id": log_id})
    if res.deleted_count == 0:
        raise HTTPException(404)
    return {"success": True}


# ============================ TIMELINE =============================
@api_router.post("/timeline", response_model=TimelineEntry)
async def create_timeline_entry(payload: Dict[str, Any]):
    payload.setdefault("date", today_iso())
    entry = TimelineEntry(
        **{k: v for k, v in payload.items() if k in TimelineEntry.model_fields}
    )
    await db.timeline.insert_one(entry.model_dump())

    # auto-create study log unless skipped
    if not payload.get("skip_log", False):
        log = StudyLog(
            activity=entry.activity,
            subject=entry.subject,
            topic=entry.topic,
            duration_min=entry.duration_min,
            questions_attempted=entry.questions_solved,
            remarks=entry.title,
            date=entry.date,
            timeline_entry_id=entry.id,
        )
        await db.study_logs.insert_one(log.model_dump())

    return entry


@api_router.get("/timeline")
async def list_timeline(
    start: Optional[str] = None, end: Optional[str] = None, limit: int = 1000
):
    query: Dict[str, Any] = {}
    if start or end:
        rng = {}
        if start:
            rng["$gte"] = start
        if end:
            rng["$lte"] = end
        query["date"] = rng
    docs = await db.timeline.find(query, {"_id": 0}).sort("date", -1).to_list(limit)

    # Also include entries whose scheduled_revisions intersect the range
    # (so revisions scheduled in this range show up even if parent entry was outside).
    parent_for_scheduling: List[dict] = []
    if start or end:
        sched_query: Dict[str, Any] = {
            "scheduled_revisions": {"$exists": True, "$ne": []}
        }
        if start and end:
            sched_query["scheduled_revisions"] = {
                "$elemMatch": {"$gte": start, "$lte": end}
            }
        elif start:
            sched_query["scheduled_revisions"] = {"$elemMatch": {"$gte": start}}
        elif end:
            sched_query["scheduled_revisions"] = {"$elemMatch": {"$lte": end}}
        existing_ids = {e["id"] for e in docs}
        extra = await db.timeline.find(sched_query, {"_id": 0}).to_list(limit)
        for e in extra:
            if e["id"] not in existing_ids:
                parent_for_scheduling.append(e)

    # Project scheduled revisions as virtual timeline items so the frontend can render them
    # on their target date even though they are stored on the parent entry.
    scheduled = []
    all_parents = docs + parent_for_scheduling
    for e in all_parents:
        for rd in e.get("scheduled_revisions", []):
            if start and rd < start:
                continue
            if end and rd > end:
                continue
            if rd not in e.get("completed_revisions", []):
                scheduled.append(
                    {
                        "id": f"rev-{e['id']}-{rd}",
                        "parent_id": e["id"],
                        "subject": e["subject"],
                        "topic": e["topic"],
                        "activity": "Revision",
                        "title": f"Revise: {e['title']}",
                        "date": rd,
                        "duration_min": 0,
                        "questions_solved": 0,
                        "notes": "",
                        "scheduled_revisions": [],
                        "completed_revisions": [],
                        "completion_status": "planned",
                        "is_virtual": True,
                    }
                )
    return {"items": docs, "scheduled_revisions": scheduled, "total": len(docs)}


@api_router.get("/timeline/{entry_id}")
async def get_timeline_entry(entry_id: str):
    e = await db.timeline.find_one({"id": entry_id}, {"_id": 0})
    if not e:
        raise HTTPException(404)
    return e


@api_router.put("/timeline/{entry_id}")
async def update_timeline_entry(entry_id: str, payload: Dict[str, Any]):
    update = {k: v for k, v in payload.items() if v is not None}
    res = await db.timeline.find_one_and_update(
        {"id": entry_id}, {"$set": update}, return_document=True
    )
    if not res:
        raise HTTPException(404)
    return strip_id(res)


@api_router.delete("/timeline/{entry_id}")
async def delete_timeline_entry(entry_id: str):
    res = await db.timeline.delete_one({"id": entry_id})
    if res.deleted_count == 0:
        raise HTTPException(404)
    # cascade
    await db.study_logs.delete_many({"timeline_entry_id": entry_id})
    return {"success": True}


@api_router.post("/timeline/{entry_id}/schedule-revision")
async def schedule_revision(entry_id: str, payload: Dict[str, Any]):
    rev_date = payload.get("date")
    if not rev_date:
        days = int(payload.get("days", 1))
        rev_date = (date.today() + timedelta(days=days)).isoformat()
    e = await db.timeline.find_one({"id": entry_id}, {"_id": 0})
    if not e:
        raise HTTPException(404)
    rev = list(set(e.get("scheduled_revisions", []) + [rev_date]))
    rev.sort()
    await db.timeline.update_one(
        {"id": entry_id}, {"$set": {"scheduled_revisions": rev}}
    )
    return {"scheduled_revisions": rev}


@api_router.post("/timeline/{entry_id}/complete-revision")
async def complete_revision(entry_id: str, payload: Dict[str, Any]):
    rev_date = payload.get("date", today_iso())
    e = await db.timeline.find_one({"id": entry_id}, {"_id": 0})
    if not e:
        raise HTTPException(404)
    completed = list(set(e.get("completed_revisions", []) + [rev_date]))
    await db.timeline.update_one(
        {"id": entry_id}, {"$set": {"completed_revisions": completed}}
    )
    # auto-log
    log = StudyLog(
        activity="Revision",
        subject=e["subject"],
        topic=e["topic"],
        duration_min=0,
        remarks=f"Revised: {e['title']}",
        timeline_entry_id=entry_id,
    )
    await db.study_logs.insert_one(log.model_dump())
    return {"completed_revisions": completed}


# ============================ REVISITS =============================
@api_router.post("/revisits", response_model=RevisitItem)
async def create_revisit(payload: Dict[str, Any]):
    if "revisit_date" not in payload:
        days = int(payload.get("days", 1))
        payload["revisit_date"] = (date.today() + timedelta(days=days)).isoformat()
    if payload.get("item_type") not in REVISIT_TYPES:
        raise HTTPException(400, f"Invalid item_type. Use one of {REVISIT_TYPES}")
    r = RevisitItem(
        **{k: v for k, v in payload.items() if k in RevisitItem.model_fields}
    )
    await db.revisits.insert_one(r.model_dump())
    return r


@api_router.get("/revisits")
async def list_revisits(
    completed: Optional[bool] = None,
    due_only: bool = False,
    item_type: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
):
    query: Dict[str, Any] = {}
    if completed is not None:
        query["completed"] = completed
    if item_type:
        query["item_type"] = item_type
    if due_only:
        query["completed"] = False
        query["revisit_date"] = {"$lte": today_iso()}
    elif start or end:
        rng = {}
        if start:
            rng["$gte"] = start
        if end:
            rng["$lte"] = end
        query["revisit_date"] = rng
    docs = (
        await db.revisits.find(query, {"_id": 0}).sort("revisit_date", 1).to_list(2000)
    )
    return {"items": docs, "total": len(docs)}


@api_router.post("/revisits/{rid}/complete")
async def complete_revisit(rid: str):
    res = await db.revisits.find_one_and_update(
        {"id": rid},
        {"$set": {"completed": True, "completed_at": now_iso()}},
        return_document=True,
    )
    if not res:
        raise HTTPException(404)
    return strip_id(res)


@api_router.delete("/revisits/{rid}")
async def delete_revisit(rid: str):
    res = await db.revisits.delete_one({"id": rid})
    if res.deleted_count == 0:
        raise HTTPException(404)
    return {"success": True}


# ============================ CALENDAR / PULSE =====================
async def _aggregate_day(d_iso: str) -> dict:
    logs = await db.study_logs.find({"date": d_iso}, {"_id": 0}).to_list(1000)
    revisits_completed = await db.revisits.count_documents(
        {"completed": True, "completed_at": {"$regex": f"^{d_iso}"}}
    )
    revisits_pending = await db.revisits.count_documents(
        {"completed": False, "revisit_date": d_iso}
    )
    timeline_count = await db.timeline.count_documents({"date": d_iso})
    scheduled_today = 0
    async for _e in db.timeline.find({"scheduled_revisions": d_iso}, {"_id": 0}):
        scheduled_today += 1
    total_minutes = sum(log.get("duration_min", 0) for log in logs)
    qs_solved = sum(log.get("questions_attempted", 0) for log in logs)
    return {
        "date": d_iso,
        "study_minutes": total_minutes,
        "study_hours": round(total_minutes / 60, 1),
        "questions_solved": qs_solved,
        "revisions_completed": revisits_completed,
        "pending_revisit": revisits_pending,
        "scheduled_revisions": scheduled_today,
        "timeline_count": timeline_count,
    }


@api_router.get("/calendar")
async def calendar(start: str, end: str):
    d0 = datetime.strptime(start, "%Y-%m-%d").date()
    d1 = datetime.strptime(end, "%Y-%m-%d").date()
    days = []
    cur = d0
    while cur <= d1:
        days.append(await _aggregate_day(cur.isoformat()))
        cur += timedelta(days=1)
    return {"days": days}


async def _momentum_score() -> int:
    """Momentum 0-100 over last 7 days. Rewards five things, capped:
        - daily consistency  (active days * 5,   cap 35)
        - subject diversity  (subjects * 3,      cap 20)
        - solve volume       (questions // 5,    cap 20)
        - hours invested     (minutes // 30,     cap 15)
        - revision habit     (revisions * 2,     cap 10)
    Intentional: rewards habit over heroics — one big day cannot maximise the score."""
    today = date.today()
    last7 = [(today - timedelta(days=i)).isoformat() for i in range(7)]
    logs = await db.study_logs.find({"date": {"$in": last7}}, {"_id": 0}).to_list(5000)
    if not logs:
        return 0
    active_days = len({log["date"] for log in logs})
    subjects_touched = len({log["subject"] for log in logs})
    qs = sum(log.get("questions_attempted", 0) for log in logs)
    mins = sum(log.get("duration_min", 0) for log in logs)
    revisions_done = sum(1 for log in logs if log.get("activity") == "Revision")
    score = (
        min(35, active_days * 5)
        + min(20, subjects_touched * 3)
        + min(20, qs // 5)
        + min(15, mins // 30)
        + min(10, revisions_done * 2)
    )
    return min(100, score)


@api_router.get("/pulse")
async def pulse():
    today = today_iso()
    settings = await _get_settings()

    # Due revisions (SRS) + due timeline-scheduled revisions
    due_srs = await db.srs.count_documents({"next_review_date": {"$lte": today}})
    # Timeline scheduled revisions whose date <= today and not yet completed
    timeline_with_sched = await db.timeline.find(
        {"scheduled_revisions": {"$exists": True, "$ne": []}}, {"_id": 0}
    ).to_list(5000)
    due_timeline_revs = 0
    for tle in timeline_with_sched:
        completed = set(tle.get("completed_revisions", []))
        for rd in tle.get("scheduled_revisions", []):
            if rd <= today and rd not in completed:
                due_timeline_revs += 1
    due_revisions_total = due_srs + due_timeline_revs
    # Due revisits
    due_revisits = await db.revisits.count_documents(
        {"completed": False, "revisit_date": {"$lte": today}}
    )

    # Today's logs
    today_logs = await db.study_logs.find({"date": today}, {"_id": 0}).to_list(1000)
    today_qs = sum(log.get("questions_attempted", 0) for log in today_logs)
    today_minutes = sum(log.get("duration_min", 0) for log in today_logs)

    # ----- Weakness Engine -----
    # Group last-30-day attempts by (subject, topic). A bucket is "weak" if it has
    # at least 3 attempts AND accuracy < 70%. Top 3 weakest are surfaced.
    cutoff = (date.today() - timedelta(days=30)).isoformat()
    recent_attempts = await db.attempts.find(
        {"created_at": {"$gte": cutoff}}, {"_id": 0}
    ).to_list(50000)
    if recent_attempts:
        qids = list({a["question_id"] for a in recent_attempts})
        qs = await db.questions.find({"id": {"$in": qids}}, {"_id": 0}).to_list(10000)
        qmap = {q["id"]: q for q in qs}
        agg: Dict[str, Dict[str, Any]] = {}
        for a in recent_attempts:
            q = qmap.get(a["question_id"])
            if not q:
                continue
            key = f"{q['subject']}::{q.get('topic','') or 'General'}"
            d = agg.setdefault(
                key,
                {
                    "subject": q["subject"],
                    "topic": q.get("topic", "") or "General",
                    "total": 0,
                    "correct": 0,
                },
            )
            d["total"] += 1
            d["correct"] += 1 if a["correct"] else 0
        weak_topics = []
        for _k, d in agg.items():
            if d["total"] >= 3:
                acc = d["correct"] / d["total"]
                if acc < 0.7:
                    weak_topics.append({**d, "accuracy": round(acc * 100, 1)})
        weak_topics.sort(key=lambda x: x["accuracy"])
        weak_topics = weak_topics[:3]
    else:
        weak_topics = []

    # Subject completion: a question is "completed" after 1 correct solve + 2 successful
    # SRS revisions (see _is_question_completed). Percent = completed / total per subject.
    subject_completion = []
    overall_total = 0
    overall_completed = 0
    for s in SUBJECTS:
        total = await db.questions.count_documents({"subject": s})
        if total == 0:
            subject_completion.append(
                {"subject": s, "total": 0, "completed": 0, "percent": 0}
            )
            continue
        ids = [
            q["id"]
            async for q in db.questions.find({"subject": s}, {"_id": 0, "id": 1})
        ]
        srs_records = await db.srs.find(
            {"question_id": {"$in": ids}}, {"_id": 0}
        ).to_list(10000)
        completed = sum(1 for s_rec in srs_records if _is_question_completed(s_rec))
        overall_total += total
        overall_completed += completed
        subject_completion.append(
            {
                "subject": s,
                "total": total,
                "completed": completed,
                "percent": round(completed / total * 100, 1),
            }
        )
    overall_completion_percent = (
        round(overall_completed / overall_total * 100, 1) if overall_total else 0
    )

    # PYQ completion
    pyq_total = await db.questions.count_documents({"year": {"$ne": None}})
    pyq_attempted_ids = list(
        {
            a["question_id"]
            for a in await db.attempts.find({}, {"_id": 0, "question_id": 1}).to_list(
                50000
            )
        }
    )
    pyq_done = (
        await db.questions.count_documents(
            {"year": {"$ne": None}, "id": {"$in": pyq_attempted_ids}}
        )
        if pyq_attempted_ids
        else 0
    )
    pyq_percent = round((pyq_done / pyq_total) * 100, 1) if pyq_total else 0

    # Revision readiness: % of due revisions completed in last 7d
    last_7 = [(date.today() - timedelta(days=i)).isoformat() for i in range(7)]
    completed_rev_7 = await db.study_logs.count_documents(
        {"activity": "Revision", "date": {"$in": last_7}}
    )
    revision_readiness = min(100, completed_rev_7 * 10)

    # Mock readiness: 50% of average subject completion + 50% mock activity ratio
    avg_sub = sum(s["percent"] for s in subject_completion) / max(
        1, len([s for s in subject_completion if s["total"] > 0])
    )
    mock_count = await db.study_logs.count_documents({"activity": "Mock Test"})
    mock_readiness = round(min(100, avg_sub * 0.6 + min(40, mock_count * 5)), 1)

    momentum = await _momentum_score()

    # Today's Mission (max 4) — prioritized: due revisions, due revisits, weak topics, new practice
    mission = []
    if due_revisions_total > 0:
        mission.append(
            {
                "id": "due-rev",
                "title": f"Complete {min(due_revisions_total, settings['daily_revision_target'])} due revisions",
                "count": due_revisions_total,
                "kind": "due_revisions",
            }
        )
    if due_revisits > 0:
        mission.append(
            {
                "id": "due-revisit",
                "title": f"Tackle {due_revisits} revisit items",
                "count": due_revisits,
                "kind": "due_revisits",
            }
        )
    if weak_topics:
        w = weak_topics[0]
        mission.append(
            {
                "id": "weak",
                "title": f"Practice 10 {w['subject']} questions ({w['topic']})",
                "subject": w["subject"],
                "topic": w["topic"],
                "kind": "weak_topic",
            }
        )
    if len(mission) < 4:
        # New practice in least-completed subject
        weakest = sorted(
            [s for s in subject_completion if s["total"] > 0],
            key=lambda x: x["percent"],
        )
        if weakest:
            s0 = weakest[0]
            mission.append(
                {
                    "id": "new",
                    "title": f"Solve {settings['daily_question_target']} new {s0['subject']} questions",
                    "subject": s0["subject"],
                    "kind": "new_practice",
                }
            )
    mission = mission[:4]

    # GATE Readiness
    exam_date = settings["exam_date"]
    days_until = max(
        0, (datetime.strptime(exam_date, "%Y-%m-%d").date() - date.today()).days
    )

    # Daily progress
    daily_q_pct = round(
        min(100, today_qs / max(1, settings["daily_question_target"]) * 100), 1
    )
    daily_m_pct = round(
        min(100, today_minutes / max(1, settings["daily_study_minutes_target"]) * 100),
        1,
    )

    # User-managed Mission tasks (separate from AI/system-recommended mission)
    user_missions = (
        await db.user_missions.find({}, {"_id": 0})
        .sort([("completed", 1), ("order", 1), ("created_at", 1)])
        .to_list(50)
    )

    return {
        "today": today,
        "mission": mission,
        "user_missions": user_missions,
        "momentum": momentum,
        "due_revisions": due_revisions_total,
        "due_srs": due_srs,
        "due_timeline_revisions": due_timeline_revs,
        "due_revisits": due_revisits,
        "weak_topics": weak_topics,
        "subject_completion": subject_completion,
        "overall_completion_percent": overall_completion_percent,
        "overall_completed": overall_completed,
        "overall_total": overall_total,
        "pyq_percent": pyq_percent,
        "pyq_done": pyq_done,
        "pyq_total": pyq_total,
        "revision_readiness": revision_readiness,
        "mock_readiness": mock_readiness,
        "days_until_exam": days_until,
        "exam_date": exam_date,
        "today_questions": today_qs,
        "today_minutes": today_minutes,
        "daily_q_percent": daily_q_pct,
        "daily_m_percent": daily_m_pct,
        "targets": {
            "daily_question_target": settings["daily_question_target"],
            "daily_revision_target": settings["daily_revision_target"],
            "daily_study_minutes_target": settings["daily_study_minutes_target"],
        },
    }


# ============================ USER MISSIONS ========================
@api_router.get("/user-missions")
async def list_user_missions():
    docs = (
        await db.user_missions.find({}, {"_id": 0})
        .sort([("completed", 1), ("order", 1), ("created_at", 1)])
        .to_list(200)
    )
    return {"items": docs, "total": len(docs)}


@api_router.post("/user-missions", response_model=UserMission)
async def create_user_mission(payload: Dict[str, Any]):
    if not (payload.get("title") or "").strip():
        raise HTTPException(400, "title is required")
    # Place new item at end of incomplete list
    if "order" not in payload:
        last = await db.user_missions.find_one(
            {"completed": False}, {"_id": 0}, sort=[("order", -1)]
        )
        payload["order"] = (last["order"] + 1) if last else 0
    item = UserMission(
        **{k: v for k, v in payload.items() if k in UserMission.model_fields}
    )
    await db.user_missions.insert_one(item.model_dump())
    return item


@api_router.put("/user-missions/{mid}")
async def update_user_mission(mid: str, payload: Dict[str, Any]):
    update = {
        k: v
        for k, v in payload.items()
        if k in UserMission.model_fields and v is not None
    }
    if not update:
        raise HTTPException(400, "No fields to update")
    # If toggling completion, stamp the timestamp
    if "completed" in update:
        update["completed_at"] = now_iso() if update["completed"] else None
    update["updated_at"] = now_iso()
    res = await db.user_missions.find_one_and_update(
        {"id": mid},
        {"$set": update},
        return_document=True,
    )
    if not res:
        raise HTTPException(404, "Mission not found")
    return strip_id(res)


@api_router.delete("/user-missions/{mid}")
async def delete_user_mission(mid: str):
    res = await db.user_missions.delete_one({"id": mid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Mission not found")
    return {"success": True}


@api_router.post("/user-missions/reorder")
async def reorder_user_missions(payload: Dict[str, List[str]]):
    """Accept an ordered list of mission ids; persist their `order`."""
    ids = payload.get("ids", [])
    for idx, mid in enumerate(ids):
        await db.user_missions.update_one(
            {"id": mid},
            {"$set": {"order": idx, "updated_at": now_iso()}},
        )
    return {"reordered": len(ids)}


# ============================ MISTAKES BANK ========================
@api_router.get("/mistakes")
async def mistakes(mode: str = "all"):
    """mode: wrong_today | frequently_wrong | forgotten | bookmarked_mistakes | all"""
    all_attempts = (
        await db.attempts.find({}, {"_id": 0}).sort("created_at", -1).to_list(20000)
    )
    today = today_iso()
    by_q: Dict[str, List[dict]] = {}
    for a in all_attempts:
        by_q.setdefault(a["question_id"], []).append(a)

    result_ids: List[str] = []
    if mode == "wrong_today":
        result_ids = [
            qid
            for qid, atts in by_q.items()
            if any(not a["correct"] and a["created_at"].startswith(today) for a in atts)
        ]
    elif mode == "frequently_wrong":
        result_ids = [
            qid
            for qid, atts in by_q.items()
            if sum(1 for a in atts if not a["correct"]) >= 2
        ]
    elif mode == "forgotten":
        # latest attempt incorrect and last_reviewed older than 14 days
        srs_all = await db.srs.find({}, {"_id": 0}).to_list(10000)
        cutoff = (date.today() - timedelta(days=14)).isoformat()
        for s in srs_all:
            atts = by_q.get(s["question_id"], [])
            if (
                atts
                and not atts[0]["correct"]
                and s.get("last_reviewed")
                and s["last_reviewed"] <= cutoff
            ):
                result_ids.append(s["question_id"])
    elif mode == "bookmarked_mistakes":
        wrong_ids = {
            qid for qid, atts in by_q.items() if atts and not atts[0]["correct"]
        }
        qs = await db.questions.find(
            {"bookmarked": True, "id": {"$in": list(wrong_ids)}}, {"_id": 0}
        ).to_list(2000)
        return {"items": qs, "total": len(qs)}
    else:
        # all wrong (latest)
        result_ids = [
            qid for qid, atts in by_q.items() if atts and not atts[0]["correct"]
        ]

    if not result_ids:
        return {"items": [], "total": 0}
    qs = await db.questions.find({"id": {"$in": result_ids}}, {"_id": 0}).to_list(5000)
    return {"items": qs, "total": len(qs)}


# ============================ SEED ==================================
SAMPLE_QUESTIONS = [
    {
        "subject": "OS",
        "topic": "Process Synchronization",
        "year": 2023,
        "difficulty": "Medium",
        "question_type": "MCQ",
        "statement": "Consider two processes $P_1$ and $P_2$ sharing a critical section guarded by a binary semaphore $S$ initialized to 1. Which of the following is a valid sequence to ensure mutual exclusion?",
        "options": [
            "wait(S) ... signal(S)",
            "signal(S) ... wait(S)",
            "wait(S) ... wait(S)",
            "signal(S) ... signal(S)",
        ],
        "correct_answer": "A",
        "explanation": "Mutual exclusion is achieved by performing wait(S) before entering and signal(S) after leaving the critical section.",
        "gateoverflow_url": "https://gateoverflow.in/",
    },
    {
        "subject": "DS",
        "topic": "Trees",
        "year": 2022,
        "difficulty": "Easy",
        "question_type": "NAT",
        "statement": "What is the maximum number of nodes in a binary tree of height $h = 4$ (counting root as height 0)?",
        "correct_answer": "31",
        "explanation": "Max nodes = $2^{h+1} - 1 = 2^5 - 1 = 31$.",
        "gateoverflow_url": "https://gateoverflow.in/",
    },
    {
        "subject": "DB",
        "topic": "Normalization",
        "year": 2024,
        "difficulty": "Hard",
        "question_type": "MSQ",
        "statement": "Which of the following decompositions are lossless? Select all that apply.",
        "options": [
            "R(A,B,C) into R1(A,B), R2(B,C) with B as key in R1",
            "R(A,B,C,D) into R1(A,B), R2(C,D)",
            "R(A,B,C) into R1(A,B), R2(A,C) with A as key in both",
            "R(A,B,C) into R1(A,C), R2(B,C)",
        ],
        "correct_answer": "A,C",
        "explanation": "Lossless decomposition requires the common attribute to be a superkey in at least one relation.",
        "gateoverflow_url": "https://gateoverflow.in/",
    },
    {
        "subject": "AL",
        "topic": "Dynamic Programming",
        "year": 2021,
        "difficulty": "Medium",
        "question_type": "MCQ",
        "statement": "The recurrence $T(n) = T(n-1) + T(n-2) + 1$, $T(0)=T(1)=1$ has time complexity?",
        "options": [
            "$O(n)$",
            "$O(n \\log n)$",
            "$O(2^n)$",
            "$O(\\phi^n)$ where $\\phi = (1+\\sqrt{5})/2$",
        ],
        "correct_answer": "D",
        "explanation": "This is the Fibonacci recurrence (with +1), exponential in golden ratio $\\phi$.",
        "gateoverflow_url": "https://gateoverflow.in/",
    },
    {
        "subject": "CN",
        "topic": "TCP",
        "year": 2023,
        "difficulty": "Medium",
        "question_type": "MCQ",
        "statement": "TCP uses which mechanism for reliable delivery?",
        "options": [
            "Sliding Window with cumulative ACKs",
            "Stop-and-Wait only",
            "No ACKs (best-effort)",
            "Selective Repeat without ACKs",
        ],
        "correct_answer": "A",
        "explanation": "TCP uses a sliding window protocol with cumulative acknowledgments for reliable in-order delivery.",
        "gateoverflow_url": "https://gateoverflow.in/",
    },
    {
        "subject": "TOC",
        "topic": "Regular Languages",
        "year": 2020,
        "difficulty": "Easy",
        "question_type": "MCQ",
        "statement": "Which of the following languages is regular?",
        "options": [
            "$\\{a^n b^n : n \\geq 0\\}$",
            "$\\{a^n b^m : n, m \\geq 0\\}$",
            "$\\{ww : w \\in \\{a,b\\}^* \\}$",
            "$\\{a^n : n \\text{ is prime}\\}$",
        ],
        "correct_answer": "B",
        "explanation": "$a^* b^*$ is a regular expression. The others require counting or unbounded memory.",
        "gateoverflow_url": "https://gateoverflow.in/",
    },
    {
        "subject": "COA",
        "topic": "Cache",
        "year": 2022,
        "difficulty": "Medium",
        "question_type": "NAT",
        "statement": "A direct-mapped cache has 64 lines of 16 bytes each. For a 32-bit address, how many bits are used for the tag?",
        "correct_answer": "22",
        "explanation": "Offset = $\\log_2 16 = 4$, Index = $\\log_2 64 = 6$, Tag = $32 - 6 - 4 = 22$.",
        "gateoverflow_url": "https://gateoverflow.in/",
    },
    {
        "subject": "DM",
        "topic": "Sets and Functions",
        "year": 2024,
        "difficulty": "Easy",
        "question_type": "MCQ",
        "statement": "If $|A| = 5$ and $|B| = 3$, the number of onto functions from $A$ to $B$ is?",
        "options": ["150", "120", "243", "60"],
        "correct_answer": "A",
        "explanation": "Using inclusion-exclusion: $3^5 - \\binom{3}{1} 2^5 + \\binom{3}{2} 1^5 = 243 - 96 + 3 = 150$.",
        "gateoverflow_url": "https://gateoverflow.in/",
    },
]


@api_router.post("/seed-demo")
async def seed_demo():
    try:
        count = await db.questions.count_documents({})
        if count > 0:
            return {
                "seeded": False,
                "reason": "questions already exist",
                "count": count,
            }
        for s in SAMPLE_QUESTIONS:
            q = Question(**s)
            await db.questions.insert_one(q.model_dump())
            await _ensure_srs(q.id)
        await _get_settings()  # initialize singleton
        return {"seeded": True, "count": len(SAMPLE_QUESTIONS)}
    except Exception as exc:
        logger.exception("Seed demo failed")
        raise HTTPException(500, detail=f"Seed demo failed: {exc}")


# ============================ MOUNT =================================
app.include_router(api_router)

# CORS: in production, set CORS_ORIGINS to the Render URL; defaults to "*" for local dev
cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
cors_origins = [o.strip() for o in cors_origins if o.strip()]
if not cors_origins:
    cors_origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the React production build from frontend/build/ (Render single-service deployment)
BUILD_DIR = (ROOT_DIR / ".." / "frontend" / "build").resolve()
if BUILD_DIR.is_dir():
    # Mount /static for JS/CSS/media assets produced by CRA
    app.mount("/static", StaticFiles(directory=str(BUILD_DIR / "static")), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA. /api/* is handled by api_router. All other paths
        serve static files from the build dir, falling back to index.html for
        React Router client-side routing."""
        file_path = BUILD_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(BUILD_DIR / "index.html")
else:
    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_placeholder(full_path: str):
        if full_path in ("", "/"):
            return {
                "message": "BYOPGateCS.studio — frontend build not found. "
                "Run `cd frontend && yarn build` or use `yarn start` for dev mode on port 3000."
            }
        raise HTTPException(404, "Frontend build not found. Run `cd frontend && yarn build`.")

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
