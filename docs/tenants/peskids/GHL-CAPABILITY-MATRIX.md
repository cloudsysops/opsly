# GHL Capability Matrix

Scope: ICSO / Peskids integration.

## Matrix

| Feature | Implemented | Available In API | Blocked By GHL |
|---|---|---|---|
| Contacts | `searchContacts()` now uses `POST /contacts/search`; `getContacts()` aliases to it | Yes | None once the token has `contacts.readonly` and is bound to the sub-account context |
| Tags | `listTags()`, `createTag()`, `updateTag()`, `deleteTag()` | Yes | None for standard sub-account tag APIs |
| Custom Fields | `listCustomFields()`, `createCustomField()` | Yes | None for contact/opportunity custom field APIs |
| Opportunities | `getOpportunity()`, `createOpportunity()`, `updateOpportunity()`, `deleteOpportunity()`, `searchOpportunities()` | Yes | None for opportunity CRUD/search; pipeline authoring is intentionally out of scope |
| Calendars | `getCalendars()`, `createCalendar()` | Yes | None for calendar read/create APIs |

## Final Status

`FULL`

Why:
- The requested scope now has implemented support for contacts search, tags, custom fields, opportunities, and calendars.
- The 401 path now retries with a derived location access token when the active credential is an agency token.
- Workflows authoring is intentionally out of scope for this slice.
- Pipeline creation is intentionally out of scope for this slice.
- Snapshot creation is intentionally out of scope for this slice.
