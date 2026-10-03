# Stream Safe Policy — Mission Control / Ops After Dark

Status: required for all public/live surfaces.

## Rule

No raw internal payload may be rendered directly into OBS, Twitch, clips or other public content.

Canonical flow:

```
internal data
  ↓
stream-safe projection
  ↓
public aliases + redaction
  ↓
Mission Control Live
  ↓
OBS / Twitch
```

## Must never be public

- API keys, tokens, JWTs, cookies or Authorization headers
- passwords or secret values
- emails, phone numbers or direct customer identifiers
- tenant/customer names unless explicitly approved for publication
- URLs containing credentials, query tokens or secret fragments
- raw environment variables
- raw logs that have not passed through stream-safe projection

## Tenant aliases

Tenant identifiers shown in live/public surfaces use deterministic aliases such as:

`ORBIT-0421`

The alias is stable enough for viewers to follow one tenant during a stream without exposing the real tenant identity.

## Fail-closed behavior

If a value cannot be confidently classified as safe, the public projection must redact or omit it.

Unknown data is not permission to display it.

## UI requirement

Mission Control Live must visibly indicate:

`STREAM SAFE ON`

This badge is only valid while the live board renders the stream-safe projection rather than raw execution payloads.

## Engineering invariant

The stream/public presentation layer must use:

`buildStreamSafeMissionControlProjection(...)`

before rendering execution activities.

Do not create an alternate public endpoint or UI that bypasses this contract.

## Tests

The Mission Control test suite must cover:

- token redaction
- Authorization/Bearer redaction
- email redaction
- phone redaction
- tenant aliasing
- URL credential/query stripping
- whole-projection sanitization

A regression that exposes unsafe material is a release blocker for live/public surfaces.

## Autopilot

The same policy applies when the operator is away.

Autopilot may display governed system state but must not expose additional internal context simply because no human operator is present.

## Production boundaries

Stream-safe mode does not authorize:
- production deployment
- secret access
- production mutation
- Peskids production changes
- DNS/routing changes
- bypassing review/security gates
