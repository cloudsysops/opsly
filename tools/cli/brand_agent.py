from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ARTIFACTS_ROOT = REPO_ROOT / "docs" / "artifacts" / "brand-agent" / "examples"

REQUIRED_FIELDS = [
    "companyName",
    "shortName",
    "industry",
    "niche",
    "country",
    "language",
    "targetCustomer",
    "services",
    "brandTone",
]


@dataclass
class BrandProfile:
    company_name: str
    short_name: str
    industry: str
    niche: str
    country: str
    language: str
    target_customer: str
    services: List[str]
    brand_tone: str
    website: str = ""
    instagram: str = ""
    color_preferences: Any = None
    logo_style: str = ""
    tagline: str = ""
    mission: str = ""
    assets: Any = None
    source_kind: str = "preset"
    source_ref: str = ""

    def slug(self) -> str:
        value = (self.short_name or self.company_name).strip().lower()
        out = []
        prev_dash = False
        for ch in value:
            if ch.isalnum():
                out.append(ch)
                prev_dash = False
            elif not prev_dash:
                out.append("-")
                prev_dash = True
        return "".join(out).strip("-") or "brand-agent"

    def as_input(self) -> Dict[str, Any]:
        return {
            "companyName": self.company_name,
            "shortName": self.short_name,
            "industry": self.industry,
            "niche": self.niche,
            "country": self.country,
            "language": self.language,
            "targetCustomer": self.target_customer,
            "services": self.services,
            "brandTone": self.brand_tone,
            "website": self.website,
            "instagram": self.instagram,
            "colorPreferences": self.color_preferences,
            "logoStyle": self.logo_style,
            "tagline": self.tagline,
            "mission": self.mission,
            "assets": self.assets,
        }


PRESETS: Dict[str, Dict[str, Any]] = {
    "icso": {
        "companyName": "IntCloudSysOps",
        "shortName": "ICSO",
        "industry": "Business Growth & Automation",
        "niche": "Growth operations agency",
        "country": "United States",
        "language": "en",
        "targetCustomer": "Founders and operators who need leads, automation, and visibility",
        "services": ["Growth strategy", "GoHighLevel setup", "Automation design", "Executive dashboards"],
        "brandTone": "premium, technical, clear, operational",
        "website": "https://intcloudsysops.com",
        "instagram": "@intcloudsysops",
        "colorPreferences": {
            "dark": "#0A0A0A",
            "primaryBlue": "#2563EB",
            "cyan": "#06B6D4",
            "purple": "#8B5CF6",
            "green": "#22C55E",
            "light": "#F3F4F6",
        },
        "logoStyle": "hexagon eye brain circuits with growth accent",
        "tagline": "SEE. AUTOMATE. GROW.",
        "mission": "We help businesses capture leads, automate follow-ups, gain visibility into their operations and scale revenue.",
        "assets": {"logo": "brand/icso/logo-primary.png", "favicon": "brand/icso/favicon.png"},
    },
    "peskids": {
        "companyName": "Peskids",
        "shortName": "Peskids",
        "industry": "Education",
        "niche": "Academy and student growth",
        "country": "Mexico",
        "language": "es",
        "targetCustomer": "Parents looking for a structured academy experience for their children",
        "services": ["Trial class capture", "Enrollment follow-up", "Student lifecycle tracking", "Parent communication"],
        "brandTone": "warm, trustworthy, parent-friendly, operational",
        "website": "https://peskids.op-sly.com",
        "instagram": "@peskids",
        "colorPreferences": {
            "dark": "#0A0A0A",
            "primaryBlue": "#2563EB",
            "cyan": "#06B6D4",
            "purple": "#8B5CF6",
            "green": "#22C55E",
            "light": "#F3F4F6",
        },
        "logoStyle": "playful academy mark with clean modern geometry",
        "tagline": "Learn. Grow. Repeat.",
        "mission": "We help families capture opportunities, automate follow-ups, and keep visibility into student progress.",
        "assets": {"logo": "brand/peskids/logo-primary.png", "favicon": "brand/peskids/favicon.png"},
    },
    "agency-partner": {
        "companyName": "Agency Partner",
        "shortName": "Agency Partner",
        "industry": "Marketing Services",
        "niche": "Partner agency growth systems",
        "country": "United States",
        "language": "en",
        "targetCustomer": "Agency owners who want repeatable client onboarding and delivery",
        "services": ["Client onboarding", "Snapshot deployment", "Automation systems", "Reporting setup"],
        "brandTone": "confident, strategic, systems-first",
        "website": "https://agencypartner.example",
        "instagram": "@agencypartner",
        "colorPreferences": {
            "dark": "#0A0A0A",
            "primaryBlue": "#2563EB",
            "cyan": "#06B6D4",
            "purple": "#8B5CF6",
            "green": "#22C55E",
            "light": "#F3F4F6",
        },
        "logoStyle": "agency system mark with growth indicators",
        "tagline": "Deliver faster. Scale cleaner.",
        "mission": "We help agencies capture leads, automate delivery, and maintain operational visibility.",
        "assets": {"logo": "brand/agency-partner/logo-primary.png", "favicon": "brand/agency-partner/favicon.png"},
    },
}


def _validate_payload(payload: Dict[str, Any]) -> None:
    missing = [name for name in REQUIRED_FIELDS if not payload.get(name)]
    if missing:
        raise ValueError("Missing required intake fields: " + ", ".join(missing))
    if not isinstance(payload.get("services"), list) or not payload["services"]:
        raise ValueError("services must be a non-empty array")


def validate_intake_payload(payload: Dict[str, Any]) -> None:
    _validate_payload(payload)


def _profile_from_payload(payload: Dict[str, Any], source_kind: str, source_ref: str) -> BrandProfile:
    _validate_payload(payload)
    return BrandProfile(
        company_name=str(payload["companyName"]).strip(),
        short_name=str(payload["shortName"]).strip(),
        industry=str(payload["industry"]).strip(),
        niche=str(payload["niche"]).strip(),
        country=str(payload["country"]).strip(),
        language=str(payload["language"]).strip(),
        target_customer=str(payload["targetCustomer"]).strip(),
        services=[str(s).strip() for s in payload["services"]],
        brand_tone=str(payload["brandTone"]).strip(),
        website=str(payload.get("website") or ""),
        instagram=str(payload.get("instagram") or ""),
        color_preferences=payload.get("colorPreferences"),
        logo_style=str(payload.get("logoStyle") or ""),
        tagline=str(payload.get("tagline") or ""),
        mission=str(payload.get("mission") or ""),
        assets=payload.get("assets"),
        source_kind=source_kind,
        source_ref=source_ref,
    )


def profile_from_client(name: str) -> BrandProfile:
    if name not in PRESETS:
        raise ValueError("Unknown client preset: " + name)
    return _profile_from_payload(PRESETS[name], "preset", name)


def profile_from_input(path: Path) -> BrandProfile:
    return _profile_from_payload(json.loads(path.read_text(encoding="utf-8")), "input", str(path))


def generate_brand_kit(profile: BrandProfile) -> Dict[str, Any]:
    palette = profile.color_preferences or {
        "dark": "#0A0A0A",
        "primaryBlue": "#2563EB",
        "cyan": "#06B6D4",
        "purple": "#8B5CF6",
        "green": "#22C55E",
        "light": "#F3F4F6",
    }
    tagline_options = [profile.tagline or "SEE. AUTOMATE. GROW.", "From Leads to Revenue.", "From Chaos to Visibility."]
    return {
        "companyName": profile.company_name,
        "shortName": profile.short_name,
        "logoPrompt": f"Design a premium logo for {profile.company_name} ({profile.short_name}) with a {profile.logo_style or 'modern growth'} style.",
        "colorPalette": palette,
        "typography": {"primary": "Poppins", "secondary": "Inter", "fallback": "system-ui"},
        "taglineOptions": tagline_options,
        "missionStatement": profile.mission,
        "emailFooter": f"{profile.company_name}\nAI Powered Growth Operations\n{profile.tagline or 'SEE. AUTOMATE. GROW.'}",
        "socialBio": f"{profile.short_name} helps businesses capture leads, automate follow-up, and gain operational visibility.",
        "landingHeroCopy": {
            "headline": profile.tagline or f"Grow with {profile.short_name}",
            "subheadline": profile.mission or "Growth systems that turn lead flow into revenue.",
        },
        "ctaLabels": ["Book a Strategy Call", "See the System", "Get the Blueprint", "Start the Intake"],
        "dashboardSectionNames": ["Growth", "Automation", "Visibility", "Operations", "Revenue"],
    }


def generate_ghl_setup_manifest(profile: BrandProfile) -> Dict[str, Any]:
    is_academy = "academy" in profile.niche.lower() or "education" in profile.industry.lower()
    if is_academy:
        pipeline = "Academy Growth Pipeline"
        tags = ["academy_lead", "academy_trial", "academy_parent", "academy_student", "academy_active", "academy_lost", "academy_referral", "academy_instagram", "academy_facebook", "academy_website", "academy_whatsapp"]
        custom_fields = [
            {"fieldName": "Student Name", "fieldType": "text", "required": True, "usage": "Primary student identity"},
            {"fieldName": "Parent Name", "fieldType": "text", "required": True, "usage": "Responsible adult contact"},
            {"fieldName": "Student Age", "fieldType": "number", "required": True, "usage": "Class fit and safety"},
            {"fieldName": "Program Interest", "fieldType": "dropdown", "required": True, "usage": "Class or program selection"},
            {"fieldName": "Preferred Schedule", "fieldType": "text", "required": False, "usage": "Preferred class timing"},
            {"fieldName": "Trial Class Date", "fieldType": "date", "required": False, "usage": "Trial booking date"},
            {"fieldName": "Enrollment Date", "fieldType": "date", "required": False, "usage": "Enrollment timestamp"},
            {"fieldName": "Lead Source", "fieldType": "dropdown", "required": False, "usage": "Source attribution"},
        ]
        calendars = [{"name": "Trial Class Booking", "purpose": "Book the trial session", "durationMinutes": 30}, {"name": "Enrollment Follow-up", "purpose": "Post-trial conversion call", "durationMinutes": 20}]
    else:
        pipeline = "Agency Growth Pipeline" if "icso" in profile.short_name.lower() else "Partner Growth Pipeline"
        tags = [f"{profile.short_name.lower().replace(' ', '_')}_lead", f"{profile.short_name.lower().replace(' ', '_')}_active", f"{profile.short_name.lower().replace(' ', '_')}_lost"]
        custom_fields = [
            {"fieldName": "Company Name", "fieldType": "text", "required": True, "usage": "Client legal or trade name"},
            {"fieldName": "Industry", "fieldType": "text", "required": True, "usage": "Client industry"},
            {"fieldName": "Niche", "fieldType": "text", "required": True, "usage": "Client niche"},
            {"fieldName": "Website", "fieldType": "text", "required": False, "usage": "Client website"},
            {"fieldName": "Instagram", "fieldType": "text", "required": False, "usage": "Social reference"},
            {"fieldName": "Target Customer", "fieldType": "textarea", "required": True, "usage": "ICP or target audience"},
            {"fieldName": "Services", "fieldType": "textarea", "required": True, "usage": "Offer stack summary"},
            {"fieldName": "Brand Tone", "fieldType": "textarea", "required": True, "usage": "Voice and tone guidance"},
        ]
        calendars = [{"name": "Discovery Call", "purpose": "Initial qualification and needs discovery", "durationMinutes": 30}, {"name": "Implementation Check-in", "purpose": "Project onboarding and delivery review", "durationMinutes": 20}]
    return {
        "clientKey": profile.slug(),
        "companyName": profile.company_name,
        "shortName": profile.short_name,
        "setupTemplate": "academy" if is_academy else "agency",
        "pipelineName": pipeline,
        "pipelineStages": [
            {"name": "New Lead", "description": "Fresh intake", "objective": "Start follow-up"},
            {"name": "Contacted", "description": "Initial outreach sent", "objective": "Engage the lead"},
            {"name": "Interested", "description": "Lead shows intent", "objective": "Move toward the next step"},
            {"name": "Ready", "description": "Ready for handoff", "objective": "Close the loop"},
            {"name": "Lost", "description": "Lead did not convert", "objective": "Preserve the record"},
        ],
        "tags": [{"name": t, "purpose": t.replace("_", " ")} for t in tags],
        "customFields": custom_fields,
        "calendars": calendars,
        "emailTemplates": [
            {"name": "Welcome Email", "purpose": "Immediate confirmation after intake", "subject": f"{profile.company_name} intake received", "preview": "Thanks for reaching out. We have your request and will follow up shortly."},
            {"name": "Reminder Email", "purpose": "Reminder before the next scheduled step", "subject": f"Reminder from {profile.short_name}", "preview": "A short reminder to keep the process moving."},
            {"name": "Conversion Follow-up Email", "purpose": "Push toward the next business action", "subject": "Next step to keep momentum", "preview": "Here is the next step to move from interest to action."},
        ],
        "smsTemplates": [
            {"name": "Welcome SMS", "purpose": "Fast acknowledgment after intake", "preview": f"Thanks for contacting {profile.short_name}. We received your request and will follow up soon."},
            {"name": "Reminder SMS", "purpose": "Reminder for the next scheduled action", "preview": "Quick reminder: your next step is coming up soon."},
            {"name": "Follow-up SMS", "purpose": "Move the lead or client forward", "preview": "Just checking in to keep this moving. Reply if you want to continue."},
        ],
        "forms": [
            {"name": "Free Trial Form" if is_academy else "Client Intake Form", "fields": [], "successMessage": "Thanks. We will contact you with the next step."}
        ],
        "workflowsChecklist": ["Lead Intake", "Trial Reminder", "Post Trial Follow Up", "Enrollment Success"],
        "snapshotChecklist": ["Pipelines", "Tags", "Custom Fields", "Forms", "Calendars", "Workflows", "Email Templates", "SMS Templates", "Dashboard Widgets", "Branding"],
        "unsupportedManualSteps": ["Brand Board", "Whitelabel", "Domains", "Roles", "Workflow authoring", "Snapshot authoring", "Full agency setup"],
    }


def apply_ghl_supported_actions(profile: BrandProfile) -> List[Dict[str, Any]]:
    manifest = generate_ghl_setup_manifest(profile)
    actions = [{"resource": "contacts", "operation": "search", "status": "available"}]
    for tag in manifest["tags"]:
        actions.append({"resource": "tags", "operation": "create", "value": tag["name"], "status": "available"})
    for field in manifest["customFields"]:
        actions.append({"resource": "customFields", "operation": "create", "value": field["fieldName"], "status": "available"})
    for cal in manifest["calendars"]:
        actions.append({"resource": "calendars", "operation": "create", "value": cal["name"], "status": "available"})
    actions.append({"resource": "emailTemplates", "operation": "create", "status": "available"})
    actions.append({"resource": "opportunities", "operation": "prepare", "status": "available"})
    return actions


def generate_manual_checklist(profile: BrandProfile) -> List[str]:
    manifest = generate_ghl_setup_manifest(profile)
    return [f"Manual step: {step}" for step in manifest["unsupportedManualSteps"]]


def write_dry_run_artifacts(profile: BrandProfile, output_dir: Path) -> Dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    brand_kit = generate_brand_kit(profile)
    manifest = generate_ghl_setup_manifest(profile)
    report = {
        "source": {"kind": profile.source_kind, "ref": profile.source_ref},
        "profile": profile.as_input(),
        "summary": {"companyName": profile.company_name, "shortName": profile.short_name, "slug": profile.slug(), "outputDir": str(output_dir)},
        "files": {"brandKit": "brand-kit.json", "ghlSetupManifest": "ghl-setup-manifest.json", "dryRunReport": "dry-run-report.json"},
        "apiActionsPossible": apply_ghl_supported_actions(profile),
        "manualActionsRequired": generate_manual_checklist(profile),
        "generatedCounts": {"apiActions": len(apply_ghl_supported_actions(profile)), "manualActions": len(generate_manual_checklist(profile))},
        "brandKit": brand_kit,
        "ghlSetupManifest": manifest,
    }
    (output_dir / "brand-kit.json").write_text(json.dumps(brand_kit, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    (output_dir / "ghl-setup-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    (output_dir / "dry-run-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    return {"brand_kit": output_dir / "brand-kit.json", "manifest": output_dir / "ghl-setup-manifest.json", "report": output_dir / "dry-run-report.json"}


def load_intake_schema() -> Dict[str, Any]:
    return {
        "required": REQUIRED_FIELDS,
        "optional": ["website", "instagram", "colorPreferences", "logoStyle", "tagline", "mission", "assets"],
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="brand-agent")
    sub = parser.add_subparsers(dest="command", required=True)
    dry = sub.add_parser("dry-run")
    dry.add_argument("--client", default=None)
    dry.add_argument("--input", default=None)
    dry.add_argument("--out-dir", default=None)
    dry.add_argument("--json", action="store_true")
    return parser


def main(argv: Any = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command != "dry-run":
        return 1
    if args.client and args.input:
        raise ValueError("Use either --client or --input, not both")
    if args.input:
        profile = profile_from_input(Path(args.input))
    elif args.client:
        profile = profile_from_client(args.client)
    else:
        raise ValueError("Provide either --client or --input")
    out_dir = Path(args.out_dir or (DEFAULT_ARTIFACTS_ROOT / profile.slug()))
    files = write_dry_run_artifacts(profile, out_dir)
    if args.json:
        print((out_dir / "dry-run-report.json").read_text(encoding="utf-8"))
    else:
        print("\n".join([
            "DRY RUN COMPLETE",
            f"Client: {profile.company_name} ({profile.short_name})",
            f"Source: {profile.source_kind}:{profile.source_ref}",
            f"Output directory: {out_dir}",
            f"Brand kit: {files['brand_kit']}",
            f"GHL manifest: {files['manifest']}",
            f"Report: {files['report']}",
        ]))
    return 0
