from datetime import datetime
from pathlib import Path
from airflow import DAG
from airflow.operators.python import PythonOperator


default_args = {
    "owner": "opsly-growth",
    "depends_on_past": False,
    "start_date": datetime(2026, 4, 27),
    "retries": 1,
}


dag = DAG(
    "opsly_outbound_campaign",
    default_args=default_args,
    description="Lead research + draft outreach for human review (ethical outbound)",
    schedule_interval="0 9 * * 1-5",
    catchup=False,
    tags=["opsly", "growth", "outbound"],
)


def find_leads(**context):
  # Stub: replace by approved source/API integration
    return [
        {"name": "Agencia Horizonte", "segment": "marketing agency", "reason": "opera multiples cuentas B2B"},
        {"name": "Growth Orbit", "segment": "revops agency", "reason": "ofrece automatizacion para pymes"},
    ]


def create_drafts(**context):
    leads = context["ti"].xcom_pull(task_ids="find_leads")
    drafts = []
    for lead in leads:
        drafts.append(
            {
                "lead": lead["name"],
                "subject": "Idea para reducir tiempo operativo en cuentas de agencia",
                "body": (
                    f"Hola equipo de {lead['name']}, vimos que {lead['reason']}. "
                    "Estamos probando un enfoque para estandarizar automatizaciones por cliente "
                    "sin sobrecargar operaciones. Si les interesa, compartimos un piloto corto."
                ),
            }
        )
    return drafts


def persist_for_human_review(**context):
    drafts = context["ti"].xcom_pull(task_ids="create_drafts")
    day = datetime.utcnow().strftime("%Y-%m-%d")
    output_path = Path("/opt/opsly/docs/outbound") / f"leads-{day}.md"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# Leads Outbound {day}",
        "",
        "_Asistido por IA - requiere revision humana antes de envio_",
        "",
    ]
    for draft in drafts:
        lines.extend(
            [
                f"## {draft['lead']}",
                f"- Subject: {draft['subject']}",
                f"- Draft: {draft['body']}",
                "",
            ]
        )
    output_path.write_text("\n".join(lines), encoding="utf-8")
    return str(output_path)


find_leads_task = PythonOperator(
    task_id="find_leads",
    python_callable=find_leads,
    dag=dag,
)

create_drafts_task = PythonOperator(
    task_id="create_drafts",
    python_callable=create_drafts,
    dag=dag,
)

persist_task = PythonOperator(
    task_id="persist_for_human_review",
    python_callable=persist_for_human_review,
    dag=dag,
)

find_leads_task >> create_drafts_task >> persist_task
