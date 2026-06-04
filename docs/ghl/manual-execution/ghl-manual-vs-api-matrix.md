---
status: draft
owner: operations
last_review: 2026-06-04
type: tool-doc
tags:
  - opsly/tool
---

# GHL Manual vs API Matrix

| Item | Can API/MCP do it? | Manual required? | Who executes? | Risk level | Validation method |
|---|---|---|---|---|---|
| Agency Profile | Partial | Yes | Human operator or Claude Chrome | Medium | Profile screen and saved values |
| Brand Board | Partial | Yes | Claude Chrome with human supervision | High | Board list, active board, logo/color/font preview |
| Logo | Partial | Yes | Claude Chrome | Medium | Logo preview in board and login/email preview |
| Domains | Partial | Yes | Human operator | High | DNS status and domain status screen |
| Roles | No / partial | Yes | Human operator | Medium | Role list and permission matrix |
| Pipelines | Yes for read/update; create may vary | Yes for initial build | Claude Chrome | Medium | Pipeline list and stage order |
| Tags | Yes | Sometimes | API for supported ops, Claude Chrome for cleanup | Low | Tag list and contact assignment |
| Custom Fields | Yes | Sometimes | API for supported ops, Claude Chrome for validation | Low | Field list and form mapping |
| Forms | Partial | Yes | Claude Chrome | Medium | Form preview and submission test |
| Calendars | Yes | Sometimes | API for basic ops, Claude Chrome for UI checks | Low | Calendar list and booking test |
| Workflows | Partial / not reliable for authoring | Yes | Claude Chrome | High | Workflow canvas and trigger/action review |
| Snapshots | Partial / not reliable for authoring | Yes | Human operator | High | Snapshot checklist and export verification |
| Email Templates | Partial | Yes | Claude Chrome | Medium | Template preview and send test |
| SMS Templates | Partial | Yes | Claude Chrome | Medium | Template list and message preview |

