# Peskids Reunion Checklist

Status: `READY FOR SALES`

## URLs

- App root: `https://peskids.op-sly.com`
- Admin login: `https://peskids.op-sly.com/admin/login`
- Teacher login: `https://peskids.op-sly.com/teacher/login`
- Families login: `https://peskids.op-sly.com/familias/login`
- Admin dashboard: `https://peskids.op-sly.com/admin`
- Health: `https://peskids.op-sly.com/api/health`
- Twenty health: `https://crm-peskids.op-sly.com/healthz`
- n8n health: `https://n8n-peskids.op-sly.com/healthz`
- WACRM health: `https://wa-peskids.op-sly.com/healthz`
- Lead intake webhook: `https://n8n-peskids.op-sly.com/webhook/peskids-lead-intake`

## Demo Accounts

- Admin demo: `peskids.admin.demo@intcloudsysops.com`
- Teacher demo: `peskids.teacher.demo@intcloudsysops.com`
- Parent demo: `familia.restrepo.demo@peskids.co`

Passwords are local-only temp files on this machine and are not part of the checklist.

## Demo Flow

1. Open `https://peskids.op-sly.com/admin/login`.
2. Sign in with the admin demo account.
3. Open the admin dashboard and show leads, students, classes, and follow-ups.
4. Open `https://peskids.op-sly.com/teacher/login`.
5. Sign in with the teacher demo account.
6. Show the teacher dashboard and agenda view.
7. Open `https://peskids.op-sly.com/familias/login`.
8. Sign in with the parent demo account.
9. Show the family portal, submissions, and feedback surfaces.
10. Submit a fresh lead through the public form and show the resulting Twenty person and opportunity IDs.

## Success Criteria

- Login works for admin, teacher, and parent demo accounts.
- Public lead submission creates a new Peskids lead.
- The lead syncs to Twenty as both Person and Opportunity.
- `ghl_contact_id` stays `null`.
- n8n and WACRM health endpoints return `200`.

## Fallbacks

- If Twenty does not respond, keep the demo on Peskids UI and stop before promising CRM-driven workflows.
- If n8n does not respond, keep the demo to lead capture and manual follow-up only.
- If WACRM does not respond, keep WhatsApp as an off-path optional channel and avoid promising live inbox routing.

## Do Not Promise Yet

- Do not promise GHL-based automation.
- Do not promise fully automated WhatsApp delivery unless WACRM is healthy and actively configured.
- Do not promise new CRM migrations.
- Do not promise teacher/family passwordless login unless separately implemented and tested.

## Operator Notes

- Old smoke scripts may still mention redirects; treat `200` shells as valid and use the demo login smoke for real auth.
- The meeting should show runtime evidence, not only screenshots or docs.
