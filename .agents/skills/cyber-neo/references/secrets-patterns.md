# Secret Detection Patterns

Reference knowledge base for Cyber Neo secret scanning. Each pattern includes provider, type, regex, severity, and false-positive guidance.

---

## AWS

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 1 | AWS | Access Key ID | `AKIA[0-9A-Z]{16}` | Critical | Starts with `AKIA`, exactly 20 chars. Test keys from AWS docs (`AKIAIOSFODNN7EXAMPLE`) are false positives. |
| 2 | AWS | Secret Access Key | `(?i)aws_?secret_?access_?key[\s]*[=:]\s*[A-Za-z0-9/+=]{40}` | Critical | 40-char base64 string. Placeholder values like `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` are false positives. |
| 3 | AWS | Session Token | `(?i)aws_?session_?token[\s]*[=:]\s*[A-Za-z0-9/+=]{100,}` | Critical | Very long base64 string. Temporary credentials but still sensitive. |
| 4 | AWS | MWS Auth Token | `amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}` | Critical | Amazon Marketplace Web Service token. |
| 5 | AWS | ARN with Account ID | `arn:aws:[a-zA-Z0-9\-]+:[a-z0-9\-]*:\d{12}:` | Medium | Not a secret itself but reveals account ID. Low risk alone. |

## GCP

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 6 | GCP | API Key | `AIza[0-9A-Za-z\-_]{35}` | High | Starts with `AIza`, 39 chars total. Can be restricted by HTTP referrer/IP. |
| 7 | GCP | Service Account JSON | `"type"\s*:\s*"service_account"` | Critical | Look for full JSON block with `private_key`, `client_email`. Skeleton templates are false positives. |
| 8 | GCP | Service Account Private Key | `-----BEGIN RSA PRIVATE KEY-----` (inside JSON `private_key` field) | Critical | The private key within a service account JSON file. |
| 9 | GCP | OAuth Client Secret | `(?i)client_secret["'\s]*[=:]["'\s]*[A-Za-z0-9\-_]{24}` | High | Often paired with `client_id`. |

## Azure

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 10 | Azure | Storage Connection String | `DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{88};` | Critical | 88-char base64 account key. Development storage emulator uses well-known key. |
| 11 | Azure | SAS Token | `[?&]sig=[A-Za-z0-9%+/=]{43,}` | High | URL-encoded signature. Expiry (`se=`) should be checked; expired tokens are low risk. |
| 12 | Azure | AD Client Secret | `(?i)azure[_\-]?client[_\-]?secret[\s]*[=:]\s*[A-Za-z0-9\-_.~]{34,}` | Critical | Application/service principal secret. |
| 13 | Azure | SQL Connection String | `Server=tcp:[^;]+;.*Password=[^;]+` | Critical | Look for `User ID` and `Password` together. |
| 14 | Azure | Cosmos DB Key | `AccountEndpoint=https://[^;]+;AccountKey=[A-Za-z0-9+/=]{88};` | Critical | Same 88-char base64 format as storage keys. |

## GitHub

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 15 | GitHub | Personal Access Token (classic) | `ghp_[A-Za-z0-9]{36}` | Critical | Prefix `ghp_`, 40 chars total. |
| 16 | GitHub | OAuth Access Token | `gho_[A-Za-z0-9]{36}` | Critical | Prefix `gho_`. |
| 17 | GitHub | App Installation Token | `ghs_[A-Za-z0-9]{36}` | High | Prefix `ghs_`, short-lived (1 hour). |
| 18 | GitHub | User-to-Server Token | `ghu_[A-Za-z0-9]{36}` | Critical | Prefix `ghu_`. |
| 19 | GitHub | Refresh Token | `ghr_[A-Za-z0-9]{36}` | Critical | Prefix `ghr_`. |
| 20 | GitHub | Fine-Grained PAT | `github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}` | Critical | New format with two segments. |

## GitLab

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 21 | GitLab | Personal Access Token | `glpat-[A-Za-z0-9\-]{20,}` | Critical | Prefix `glpat-`. |
| 22 | GitLab | Pipeline Trigger Token | `glptt-[A-Za-z0-9\-]{20,}` | High | Prefix `glptt-`. |
| 23 | GitLab | Runner Registration Token | `GR1348941[A-Za-z0-9\-_]{20,}` | High | Starts with `GR1348941`. |

## Slack

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 24 | Slack | Bot Token | `xoxb-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}` | Critical | Prefix `xoxb-`, three segments. |
| 25 | Slack | User Token | `xoxp-[0-9]{10,13}-[0-9]{10,13}-[0-9]{10,13}-[a-f0-9]{32}` | Critical | Prefix `xoxp-`, four segments. |
| 26 | Slack | App-Level Token | `xapp-[0-9]-[A-Z0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{64}` | Critical | Prefix `xapp-`. |
| 27 | Slack | Legacy Token | `xoxa-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}` | Critical | Prefix `xoxa-`, deprecated but still valid. |
| 28 | Slack | Legacy Workspace Token | `xoxo-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}` | High | Prefix `xoxo-`, very old format. |
| 29 | Slack | Webhook URL | `https://hooks\.slack\.com/services/T[A-Z0-9]{8,}/B[A-Z0-9]{8,}/[A-Za-z0-9]{24}` | High | Incoming webhook. Can only post messages but can leak info. |

## Stripe

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 30 | Stripe | Secret Key (Live) | `sk_live_[A-Za-z0-9]{24,}` | Critical | Live secret key grants full API access. |
| 31 | Stripe | Restricted Key (Live) | `rk_live_[A-Za-z0-9]{24,}` | High | Limited permissions but still sensitive. |
| 32 | Stripe | Publishable Key (Live) | `pk_live_[A-Za-z0-9]{24,}` | Medium | Intended to be public in frontend code, but confirms live mode. |
| 33 | Stripe | Secret Key (Test) | `sk_test_[A-Za-z0-9]{24,}` | Medium | Test mode key. No financial risk but reveals Stripe integration. |
| 34 | Stripe | Webhook Signing Secret | `whsec_[A-Za-z0-9]{32,}` | High | Used to verify webhook signatures. |

## Twilio

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 35 | Twilio | API Key | `SK[0-9a-fA-F]{32}` | Critical | 34-char hex string prefixed with `SK`. May collide with other `SK` prefixes; verify context. |
| 36 | Twilio | Account SID | `AC[0-9a-fA-F]{32}` | Medium | Not a secret alone but used with Auth Token. |
| 37 | Twilio | Auth Token | `(?i)twilio[_\-]?auth[_\-]?token[\s]*[=:]\s*[0-9a-f]{32}` | Critical | 32-char hex string. Needs context to distinguish from other hex values. |

## SendGrid

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 38 | SendGrid | API Key | `SG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}` | Critical | Two base64url segments separated by dots. |

## Mailgun

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 39 | Mailgun | API Key | `key-[0-9a-f]{32}` | Critical | Prefix `key-` followed by 32 hex chars. |
| 40 | Mailgun | Domain Sending Key | `(?i)mailgun[_\-]?api[_\-]?key[\s]*[=:]\s*key-[0-9a-f]{32}` | Critical | Same as above but with explicit variable name context. |

## Mailchimp

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 41 | Mailchimp | API Key | `[0-9a-f]{32}-us[0-9]{1,2}` | High | 32 hex chars followed by datacenter suffix like `-us12`. |

## Database Connection Strings

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 42 | PostgreSQL | Connection String | `postgres(?:ql)?://[^:]+:[^@]+@[^/]+/\S+` | Critical | Contains username:password. `localhost` with no real password may be dev. |
| 43 | MySQL | Connection String | `mysql://[^:]+:[^@]+@[^/]+/\S+` | Critical | Same format as Postgres. |
| 44 | MongoDB | Connection String | `mongodb(?:\+srv)?://[^:]+:[^@]+@[^/]+` | Critical | May include replica set params. Atlas URLs with `mongodb+srv://` common. |
| 45 | Redis | Connection String | `redis://:[^@]+@[^/]+` | High | Password after `redis://:`. |
| 46 | MSSQL | Connection String | `Server=[^;]+;.*Password=[^;]+` | Critical | Semicolon-delimited key=value pairs. |

## JWT Tokens

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 47 | Generic | JWT Token | `eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/=]*` | High | Three base64url segments. Decode header/payload to assess risk. Test JWTs with `sub: test` are false positives. |

## Private Keys

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 48 | Generic | RSA Private Key | `-----BEGIN RSA PRIVATE KEY-----` | Critical | PKCS#1 format. May appear in test fixtures; check file path context. |
| 49 | Generic | EC Private Key | `-----BEGIN EC PRIVATE KEY-----` | Critical | Elliptic curve private key. |
| 50 | Generic | DSA Private Key | `-----BEGIN DSA PRIVATE KEY-----` | Critical | Rarely used in modern systems. |
| 51 | Generic | PGP Private Key | `-----BEGIN PGP PRIVATE KEY BLOCK-----` | Critical | OpenPGP private key. |
| 52 | Generic | OpenSSH Private Key | `-----BEGIN OPENSSH PRIVATE KEY-----` | Critical | New OpenSSH format (since OpenSSH 6.5). |
| 53 | Generic | PKCS8 Private Key | `-----BEGIN PRIVATE KEY-----` | Critical | Generic PKCS#8 wrapper, could be RSA/EC/DSA. |
| 54 | Generic | Encrypted Private Key | `-----BEGIN ENCRYPTED PRIVATE KEY-----` | Medium | Password-protected; lower risk but key material present. |

## Generic Credential Patterns

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 55 | Generic | Password Assignment | `(?i)(password\|passwd\|pwd)[\s]*[=:]\s*['"][^'"]{8,}['"]` | High | Skip values like `password`, `changeme`, `example`, `placeholder`, `your_password_here`. |
| 56 | Generic | API Key Assignment | `(?i)(api_?key\|apikey)[\s]*[=:]\s*['"][A-Za-z0-9\-_]{16,}['"]` | High | Check for placeholder indicators (`xxx`, `your-api-key`, `INSERT`). |
| 57 | Generic | Secret Assignment | `(?i)(secret\|secret_?key)[\s]*[=:]\s*['"][A-Za-z0-9\-_]{16,}['"]` | High | Variable name containing `secret` with a substantial value. |
| 58 | Generic | Token Assignment | `(?i)(auth_?token\|access_?token\|token)[\s]*[=:]\s*['"][A-Za-z0-9\-_.]{16,}['"]` | High | Generic token pattern. Many false positives from config templates. |
| 59 | Generic | Bearer Token in Code | `(?i)bearer\s+[A-Za-z0-9\-_.~+/=]{20,}` | High | Hardcoded bearer tokens in source. Headers in docs are false positives. |
| 60 | Generic | Basic Auth Header | `(?i)basic\s+[A-Za-z0-9+/=]{20,}` | High | Base64-encoded `user:password`. Decode to verify it's real credentials. |
| 61 | Generic | Authorization Header | `(?i)(authorization\|x-api-key)[\s]*[=:]\s*['"][^'"]{20,}['"]` | High | Hardcoded auth headers. |

## OAuth

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 62 | Generic | OAuth Client Secret | `(?i)client_?secret[\s]*[=:]\s*['"][A-Za-z0-9\-_]{20,}['"]` | Critical | OAuth client secrets grant token exchange capability. |
| 63 | Generic | OAuth Refresh Token | `(?i)refresh_?token[\s]*[=:]\s*['"][A-Za-z0-9\-_.]{20,}['"]` | Critical | Long-lived tokens that can mint new access tokens. |

## npm / PyPI / Docker

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 64 | npm | Access Token | `npm_[A-Za-z0-9]{36}` | Critical | New format npm token (granular). |
| 65 | npm | Legacy Token | `(?i)//registry\.npmjs\.org/:_authToken=[A-Za-z0-9\-]{36}` | Critical | Found in `.npmrc` files. |
| 66 | PyPI | API Token | `pypi-[A-Za-z0-9\-_]{50,}` | Critical | Prefix `pypi-`, long base64url string. |
| 67 | Docker | Registry Auth | `(?i)"auth"\s*:\s*"[A-Za-z0-9+/=]{20,}"` (in `config.json`) | High | Base64 of `user:password` in `~/.docker/config.json`. |

## Firebase

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 68 | Firebase | Config Object | `(?i)firebase[A-Za-z]*\s*=\s*\{[^}]*apiKey\s*:\s*['"][^'"]+['"]` | High | Firebase config with API key. API key alone has limited risk if security rules are set, but reveals project. |
| 69 | Firebase | Server Key | `AAAA[A-Za-z0-9\-_]{100,}` | Critical | FCM server key for push notifications. Can send arbitrary notifications. |

## Telegram

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 70 | Telegram | Bot Token | `[0-9]{8,10}:[A-Za-z0-9_-]{35}` | Critical | Numeric bot ID followed by colon and 35-char alphanumeric string. May match other colon-separated tokens; verify with Telegram API context. |

## Miscellaneous

| # | Provider | Type | Regex | Severity | False-Positive Notes |
|---|----------|------|-------|----------|---------------------|
| 71 | Heroku | API Key | `[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}` | High | UUID format. Very common false positives; look for `HEROKU_API_KEY` context. |
| 72 | Shopify | Access Token | `shpat_[A-Fa-f0-9]{32}` | Critical | Prefix `shpat_`. |
| 73 | Shopify | Shared Secret | `shpss_[A-Fa-f0-9]{32}` | Critical | Prefix `shpss_`. |
| 74 | Shopify | Custom App Token | `shpca_[A-Fa-f0-9]{32}` | Critical | Prefix `shpca_`. |
| 75 | Shopify | Private App Password | `shppa_[A-Fa-f0-9]{32}` | Critical | Prefix `shppa_`. |
| 76 | Datadog | API Key | `(?i)datadog[_\-]?api[_\-]?key[\s]*[=:]\s*[a-f0-9]{32}` | High | 32-char hex string. |
| 77 | Hashicorp Vault | Token | `hvs\.[A-Za-z0-9]{24,}` | Critical | Vault service token prefix `hvs.`. |
| 78 | Hashicorp Terraform | Cloud Token | `(?i)credentials\s+"app\.terraform\.io"\s+\{[^}]*token\s*=\s*"[A-Za-z0-9.]+"` | Critical | In `.terraformrc` or `terraform.rc`. |
| 79 | Doppler | Token | `dp\.pt\.[A-Za-z0-9]{40,}` | Critical | Prefix `dp.pt.`. |
| 80 | Discord | Bot Token | `[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,}` | Critical | Three dot-separated segments. First segment decodes to a Snowflake ID. |
| 81 | Discord | Webhook URL | `https://discord(?:app)?\.com/api/webhooks/\d+/[A-Za-z0-9\-_]+` | High | Can post messages to channels. |

---

## Scanning Guidance

### Severity Levels
- **Critical**: Direct access to production systems, financial data, or infrastructure. Rotate immediately.
- **High**: Access to significant resources or data. Rotate within 24 hours.
- **Medium**: Limited scope tokens, test keys, or public-facing keys. Assess and rotate as needed.

### Reducing False Positives
1. Ignore files in `node_modules/`, `vendor/`, `.git/`, `__pycache__/`, and dependency directories.
2. Ignore common test/example values: `EXAMPLE`, `changeme`, `your-api-key`, `placeholder`, `xxx`, `TODO`.
3. Check file extensions: `.env.example`, `.sample`, `.template` files often contain placeholders.
4. For private keys: check if the file is in a test fixtures directory (`test/`, `spec/`, `fixtures/`).
5. For connection strings: `localhost`/`127.0.0.1` with common default passwords (`postgres`, `root`, `admin`) may be development-only.
6. Check `.gitignore` to see if the file should have been excluded from version control.
