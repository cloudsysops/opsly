#!/usr/bin/env python3
"""
Peskids BI snapshot generator.

Fetches tenant data from Supabase, computes operational metrics with pandas,
and writes a JSON snapshot that the Next.js app can read at runtime.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()

TENANT_ID = os.getenv("NEXT_PUBLIC_TENANT_ID", "peskids").strip()
SUPABASE_URL = (os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL") or "").strip()
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
DEFAULT_OUTPUT_PATH = Path(
    os.getenv(
        "PESKIDS_BI_SNAPSHOT_PATH",
        Path(__file__).resolve().parents[1] / "runtime" / "analytics" / "peskids-bi.json",
    )
)


def require_env() -> None:
    missing = [
        name
        for name, value in {
            "NEXT_PUBLIC_SUPABASE_URL": SUPABASE_URL,
            "SUPABASE_SERVICE_ROLE_KEY": SERVICE_ROLE_KEY,
        }.items()
        if not value
    ]
    if missing:
        raise SystemExit(f"Missing required env vars: {', '.join(missing)}")


def fetch_table(table: str, select: str, filters: dict[str, str] | None = None, page_size: int = 1000) -> pd.DataFrame:
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "accept": "application/json",
    }
    base_params: dict[str, str] = {"select": select}
    if filters:
        base_params.update(filters)

    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        params = {**base_params, "limit": str(page_size), "offset": str(offset)}
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=headers,
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        batch = response.json()
        if not isinstance(batch, list):
            break
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    return pd.DataFrame(rows)


def normalize_email(series: pd.Series) -> pd.Series:
    return series.fillna("").astype(str).str.strip().str.lower()


def safe_dt(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce", utc=True)


def map_submission_status(status: Any) -> str:
    if status == "graded":
        return "reviewed"
    if status == "submitted":
        return "completed"
    return "pending"


def extract_parent_email(row: pd.Series) -> str:
    candidates = [
        row.get("parent_email"),
        (row.get("form_data") or {}).get("parent_email") if isinstance(row.get("form_data"), dict) else None,
        (row.get("form_data") or {}).get("family_email") if isinstance(row.get("form_data"), dict) else None,
        (row.get("form_data") or {}).get("email") if isinstance(row.get("form_data"), dict) else None,
        (row.get("form_data") or {}).get("guardian_email") if isinstance(row.get("form_data"), dict) else None,
    ]
    for value in candidates:
        if value:
            return str(value).strip().lower()
    return ""


def ensure_dataframe(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=columns)
    return df


def compute_family_metrics(submissions: pd.DataFrame, feedback: pd.DataFrame, messages: pd.DataFrame) -> dict[str, dict[str, Any]]:
    if submissions.empty:
        return {}

    by_parent: dict[str, dict[str, Any]] = {}
    for parent_email, group in submissions.groupby("parent_email"):
        if not parent_email:
            continue

        submission_ids = group["submission_id"].dropna().astype(str).tolist()
        thread_mask = messages["submission_id"].isin(submission_ids) if not messages.empty else pd.Series([], dtype=bool)
        thread_messages = messages.loc[thread_mask] if not messages.empty else pd.DataFrame()
        family_feedback = feedback.loc[normalize_email(feedback.get("parent_email", pd.Series(dtype=str))) == parent_email] if not feedback.empty else pd.DataFrame()

        feedback_scores = pd.to_numeric(family_feedback.get("satisfaction", pd.Series(dtype=float)), errors="coerce").dropna()
        latest_candidates = []
        if "completed_at" in group:
            latest_candidates.append(safe_dt(group["completed_at"]))
        if not thread_messages.empty:
            latest_candidates.append(safe_dt(thread_messages["created_at"]))
        if not family_feedback.empty and "created_at" in family_feedback:
            latest_candidates.append(safe_dt(family_feedback["created_at"]))

        latest_activity = None
        if latest_candidates:
            merged = pd.concat(latest_candidates).dropna()
            if not merged.empty:
                latest_activity = merged.max().isoformat()

        mapped_status = group["mapped_status"].tolist()
        by_parent[parent_email] = {
            "totalSubmissions": int(len(group)),
            "reviewedSubmissions": int(sum(1 for status in mapped_status if status == "reviewed")),
            "pendingSubmissions": int(sum(1 for status in mapped_status if status == "pending")),
            "averageSatisfaction": int(round(feedback_scores.mean())) if not feedback_scores.empty else 0,
            "privateNotesCount": int(
                len(
                    family_feedback[
                        (family_feedback.get("visibility", "") == "private")
                        & (family_feedback.get("audience", "") == "family")
                    ]
                )
            ) if not family_feedback.empty else 0,
            "activeChatThreads": int(thread_messages["sender_contact"].nunique()) if not thread_messages.empty else 0,
            "recentMessages": int(len(thread_messages)) if not thread_messages.empty else 0,
            "latestActivityAt": latest_activity,
        }

    return by_parent


def compute_teacher_metrics(submissions: pd.DataFrame, messages: pd.DataFrame) -> dict[str, Any]:
    if submissions.empty:
        return {
            "totalSubmissions": 0,
            "reviewedCount": 0,
            "pendingCount": 0,
            "needsRevisionCount": 0,
            "uniqueStudents": 0,
            "uniqueFamilies": 0,
            "averageGrade": 0,
            "averageProgress": 0,
            "activeChatThreads": 0,
            "recentFamilyMessages": 0,
            "latestActivityAt": None,
        }

    thread_contacts = set(submissions["submission_id"].dropna().astype(str).map(lambda sid: f"submission-chat:{sid}"))
    thread_messages = messages[messages["sender_contact"].isin(thread_contacts)] if not messages.empty else pd.DataFrame()
    grade_values = pd.to_numeric(submissions.get("score", pd.Series(dtype=float)), errors="coerce").dropna()
    progress_values = submissions.get("progress_percent", pd.Series(dtype=float))
    progress_values = pd.to_numeric(progress_values, errors="coerce").dropna()

    latest_candidates = [safe_dt(submissions["completed_at"])] if "completed_at" in submissions else []
    if not thread_messages.empty:
        latest_candidates.append(safe_dt(thread_messages["created_at"]))
    latest_activity = None
    if latest_candidates:
        merged = pd.concat(latest_candidates).dropna()
        if not merged.empty:
            latest_activity = merged.max().isoformat()

    return {
        "totalSubmissions": int(len(submissions)),
        "reviewedCount": int((submissions["mapped_status"] == "reviewed").sum()),
        "pendingCount": int((submissions["mapped_status"] == "pending").sum()),
        "needsRevisionCount": int((submissions["mapped_status"] == "needs_revision").sum()),
        "uniqueStudents": int(submissions.get("student_id", submissions["submission_id"]).astype(str).nunique()),
        "uniqueFamilies": int(normalize_email(submissions.get("parent_email", pd.Series(dtype=str))).nunique()),
        "averageGrade": int(round(grade_values.mean())) if not grade_values.empty else 0,
        "averageProgress": int(round(progress_values.mean())) if not progress_values.empty else 0,
        "activeChatThreads": int(thread_messages["sender_contact"].nunique()) if not thread_messages.empty else 0,
        "recentFamilyMessages": int((thread_messages["direction"] == "inbound").sum()) if not thread_messages.empty else 0,
        "latestActivityAt": latest_activity,
    }


def compute_admin_metrics(
    leads: pd.DataFrame,
    students: pd.DataFrame,
    feedback: pd.DataFrame,
    followups: pd.DataFrame,
    messages: pd.DataFrame,
) -> dict[str, Any]:
    avg_satisfaction = 0
    if not feedback.empty and "satisfaction" in feedback:
        scores = pd.to_numeric(feedback["satisfaction"], errors="coerce").dropna()
        avg_satisfaction = int(round(scores.mean())) if not scores.empty else 0

    active_chats = int(messages["sender_contact"].nunique()) if not messages.empty else 0
    open_followups = int((followups["status"] == "pending").sum()) if not followups.empty else 0

    alerts: list[str] = []
    if open_followups >= 10:
        alerts.append(f"{open_followups} seguimientos abiertos")
    if avg_satisfaction and avg_satisfaction <= 3:
        alerts.append("Satisfacción baja en familias")
    if active_chats >= 15:
        alerts.append(f"{active_chats} hilos activos")
    if len(leads) >= 15:
        alerts.append(f"{len(leads)} leads nuevos en la ventana")

    return {
        "activeStudents": int(len(students)),
        "newLeads7d": int(len(leads)),
        "openFollowups": open_followups,
        "activeChats": active_chats,
        "avgSatisfaction": avg_satisfaction,
        "alerts": alerts,
    }


def compute_trends(
    leads: pd.DataFrame,
    feedback: pd.DataFrame,
    followups: pd.DataFrame,
    messages: pd.DataFrame,
) -> list[dict[str, Any]]:
    data = pd.DataFrame()
    if not leads.empty:
        data = pd.concat(
            [
                data,
                pd.DataFrame(
                    {
                        "date": safe_dt(leads["created_at"]).dt.date,
                        "leads": 1,
                        "messages": 0,
                        "followups": 0,
                        "feedback": 0,
                    }
                ),
            ],
            ignore_index=True,
        )
    if not feedback.empty:
        data = pd.concat(
            [
                data,
                pd.DataFrame(
                    {
                        "date": safe_dt(feedback["created_at"]).dt.date,
                        "leads": 0,
                        "messages": 0,
                        "followups": 0,
                        "feedback": 1,
                    }
                ),
            ],
            ignore_index=True,
        )
    if not followups.empty:
        data = pd.concat(
            [
                data,
                pd.DataFrame(
                    {
                        "date": safe_dt(followups["created_at"]).dt.date,
                        "leads": 0,
                        "messages": 0,
                        "followups": 1,
                        "feedback": 0,
                    }
                ),
            ],
            ignore_index=True,
        )
    if not messages.empty:
        data = pd.concat(
            [
                data,
                pd.DataFrame(
                    {
                        "date": safe_dt(messages["created_at"]).dt.date,
                        "leads": 0,
                        "messages": 1,
                        "followups": 0,
                        "feedback": 0,
                    }
                ),
            ],
            ignore_index=True,
        )

    if data.empty:
        return []

    data["date"] = pd.to_datetime(data["date"])
    grouped = data.groupby("date", as_index=False)[["leads", "messages", "followups", "feedback"]].sum()
    grouped["date"] = grouped["date"].dt.strftime("%Y-%m-%d")
    return grouped.tail(14).to_dict(orient="records")


def build_snapshot() -> dict[str, Any]:
    today = datetime.now(timezone.utc)
    window_start = today - timedelta(days=30)
    week_start = today - timedelta(days=7)

    leads = ensure_dataframe(
        fetch_table(
            "leads",
            "id,tenant_id,name,email,phone,class_modality,neighborhood,grade_interested,referral_source,referral_code,referred_by_code,referral_discount_cents,referral_redemptions,status,admin_notes,created_at,updated_at",
            {"tenant_id": f"eq.{TENANT_ID}", "created_at": f"gte.{week_start.isoformat()}"},
        ),
        ["id", "created_at"],
    )
    students = ensure_dataframe(
        fetch_table(
            "students",
            "id,tenant_id,name,grade,status,parent_email,enrollment_date,created_at,updated_at",
            {"tenant_id": f"eq.{TENANT_ID}", "status": "eq.active"},
        ),
        ["id", "parent_email"],
    )
    feedback = ensure_dataframe(
        fetch_table(
            "feedback",
            "id,tenant_id,child_name,satisfaction,suggestion,contact_wanted,parent_email,author_type,author_ref_id,subject_type,subject_ref_id,visibility,audience,body,rating,status,created_at,updated_at",
            {"tenant_id": f"eq.{TENANT_ID}", "created_at": f"gte.{window_start.isoformat()}"},
        ),
        ["id", "created_at"],
    )
    followups = ensure_dataframe(
        fetch_table(
            "followups",
            "id,tenant_id,contact_id,contact_type,type,due_date,status,notes,created_at,updated_at",
            {"tenant_id": f"eq.{TENANT_ID}"},
        ),
        ["id", "created_at"],
    )
    messages = ensure_dataframe(
        fetch_table(
            "messages",
            "id,tenant_id,source,sender_name,sender_contact,message_text,external_id,direction,parent_message_id,status,ai_generated,created_at,updated_at",
            {"tenant_id": f"eq.{TENANT_ID}", "created_at": f"gte.{window_start.isoformat()}"},
        ),
        ["id", "created_at"],
    )
    submissions = ensure_dataframe(
        fetch_table(
            "form_submissions",
            "submission_id,tenant_id,form_id,user_id,parent_email,form_data,status,score,started_at,completed_at,created_at",
            {"tenant_id": f"eq.{TENANT_ID}"},
        ),
        ["submission_id", "parent_email"],
    )

    if not submissions.empty:
        submissions = submissions.copy()
        submissions["parent_email"] = submissions.apply(extract_parent_email, axis=1)
        submissions["mapped_status"] = submissions["status"].map(map_submission_status)
        submissions["student_id"] = submissions.get("user_id", submissions["submission_id"]).fillna(submissions["submission_id"]).astype(str)
        submissions["progress_percent"] = submissions["score"].apply(
            lambda value: int(max(0, min(100, round(float(value))))) if pd.notna(value) else 0
        )
    else:
        submissions = pd.DataFrame(columns=["submission_id", "parent_email", "mapped_status", "student_id", "progress_percent"])

    if not messages.empty:
        messages = messages.copy()
        messages["submission_id"] = messages["sender_contact"].astype(str).str.replace("submission-chat:", "", regex=False)

    family_metrics = compute_family_metrics(submissions, feedback, messages)
    teacher_metrics = compute_teacher_metrics(submissions, messages)
    admin_metrics = compute_admin_metrics(
        leads,
        students,
        feedback,
        followups,
        messages,
    )

    return {
        "generatedAt": today.isoformat(),
        "tenantId": TENANT_ID,
        "admin": admin_metrics,
        "teacher": teacher_metrics,
        "families": {
            "byParentEmail": family_metrics,
        },
        "trends": compute_trends(leads, feedback, followups, messages),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Peskids BI snapshot with pandas")
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT_PATH),
        help="JSON output path for the BI snapshot",
    )
    args = parser.parse_args()

    require_env()
    snapshot = build_snapshot()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
