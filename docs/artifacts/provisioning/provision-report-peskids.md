# GHL Provisioning Report — Peskids

- **Tenant slug:** peskids
- **Location ID:** KJ5LawrOOe3hIerqtMRu
- **Mode:** EXECUTE
- **Started:** 2026-06-05T01:08:38.963Z
- **Finished:** 2026-06-05T01:08:41.126Z

## Summary

| Status | Count |
|--------|-------|
| Created | 0 |
| Would create | 0 |
| Already exists | 12 |
| Skipped | 0 |
| Manual required | 4 |
| Blocked | 0 |

## Items

| Type | Name | Status | Notes |
|------|------|--------|-------|
| tag | lead-web | already_exists | 8KcvFYRH27MrNeXvOoPx |
| tag | lead-n8n | already_exists | LJVbq2OtiUEf1yRGwynJ |
| tag | trial-booked | already_exists | 4TyFxkBVlomWtu9H54FJ |
| tag | active-student | already_exists | LhkRi3dwG5JXIYHZvis6 |
| tag | renewal-due | already_exists | j8BFpLZ7s1agR3RvXSv6 |
| custom_field | child_name | already_exists | Mfp5OHVE9ZeTUHDkcu7L |
| custom_field | child_age | already_exists | eTwe7i69DeTghzGmaVBe |
| custom_field | interest_level | already_exists | 06cxG6FTwcR56tTgkrAt |
| custom_field | preferred_schedule | already_exists | 1pkF1oI1IRcExcGnB7Du |
| email_template | Peskids — Welcome Parent | manual_required | Email templates must be created or imported in GHL UI (Claude Chrome / manual). Opsly records spec only. |
| email_template | Peskids — Trial Class Confirmation | manual_required | Email templates must be created or imported in GHL UI (Claude Chrome / manual). Opsly records spec only. |
| sms_template | Peskids — Trial Reminder | manual_required | SMS templates require GHL UI or Conversation AI setup — not exposed for safe automation. |
| form | Peskids Lead Capture | manual_required | This route is not yet supported by the IAM Service. Please update your IAM config. |
| pipeline | Peskids Enrollment | already_exists | Pipeline and stages validated |
| calendar | Trial Class | already_exists | Calendar exists — availability schedule applied |
| calendar | Assessment | already_exists | Calendar validated |
