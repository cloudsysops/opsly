# OWASP Top 10 — 2025 Edition

Reference for classifying and scoring security findings against the OWASP 2025 Top 10.

---

## A01:2025 — Broken Access Control

**Description:** Restrictions on what authenticated users are allowed to do are not properly enforced. Attackers can exploit flaws to access unauthorized functionality or data, modify other users' data, or escalate privileges. This remains the most prevalent web application security risk.

**Common Vulnerability Patterns:**
- Missing or bypassed authorization checks on API endpoints
- IDOR (Insecure Direct Object References) — user-controlled IDs without ownership validation
- Path traversal to access files outside intended directories
- Privilege escalation via role manipulation (e.g., modifying JWT claims, hidden form fields)
- CORS misconfiguration allowing unauthorized cross-origin access
- Accessing admin panels or restricted functions without proper role checks
- Missing function-level access control on sensitive operations

**Severity Scoring Guidance:**
- **Critical:** Admin privilege escalation, access to all users' data, ability to modify system-wide settings
- **High:** Access to other users' sensitive data (PII, financial), horizontal privilege escalation
- **Medium:** Access to non-sensitive data of other users, bypassing UI-level restrictions with server-side checks partially in place
- **Low:** Information disclosure of non-sensitive metadata, minor authorization inconsistencies

**Related CWE IDs:** CWE-200, CWE-201, CWE-284, CWE-285, CWE-352, CWE-425, CWE-639, CWE-862, CWE-863, CWE-913

---

## A02:2025 — Security Misconfiguration

**Description:** Applications are insecure when they are missing appropriate security hardening, have improperly configured permissions, use default credentials, or expose unnecessary features. This includes misconfigured HTTP headers, verbose error messages, and open cloud storage.

**Common Vulnerability Patterns:**
- Default or weak credentials on admin interfaces, databases, or services
- Unnecessary features enabled (directory listing, debug modes, sample apps)
- Missing security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- Overly permissive CORS policies
- Verbose error messages or stack traces exposed to users
- Unpatched software or outdated frameworks with known vulnerabilities
- Open cloud storage buckets (S3, GCS, Azure Blob)
- Unnecessary ports or services exposed
- TLS/SSL misconfigurations (weak ciphers, expired certs)

**Severity Scoring Guidance:**
- **Critical:** Default admin credentials on production systems, debug mode enabled with RCE potential, publicly writable cloud storage
- **High:** Directory listing exposing sensitive files, verbose errors revealing internal architecture, missing HSTS on authentication flows
- **Medium:** Missing non-critical security headers, unnecessary services exposed on internal networks
- **Low:** Missing optional headers on non-sensitive pages, minor configuration deviations from best practice

**Related CWE IDs:** CWE-2, CWE-11, CWE-13, CWE-15, CWE-16, CWE-388, CWE-489, CWE-497, CWE-520, CWE-526, CWE-537, CWE-541, CWE-547, CWE-611, CWE-614, CWE-756, CWE-776, CWE-942, CWE-1004, CWE-1032

---

## A03:2025 — Software Supply Chain Failures (NEW)

**Description:** Failures related to the integrity and security of the software supply chain, including vulnerable or malicious third-party dependencies, compromised build pipelines, and lack of dependency verification. This new category reflects the growing threat of attacks targeting the software development and delivery process.

**Common Vulnerability Patterns:**
- Dependencies with known CVEs (outdated packages with published vulnerabilities)
- Typosquatting or dependency confusion attacks in package manifests
- Missing lock files or unpinned dependency versions
- No integrity verification (missing checksums, unsigned packages)
- Compromised CI/CD pipelines (unprotected build scripts, injected steps)
- Use of unmaintained or abandoned libraries
- Pulling dependencies from untrusted registries
- Missing Software Bill of Materials (SBOM)
- Pre/post-install scripts in packages executing arbitrary code
- Vendored dependencies that are never updated

**Severity Scoring Guidance:**
- **Critical:** Dependencies with actively exploited RCE CVEs, evidence of malicious packages in dependency tree, compromised build pipeline with code injection
- **High:** Dependencies with known high-severity CVEs, dependency confusion vulnerabilities, unsigned artifacts deployed to production
- **Medium:** Outdated dependencies with medium-severity CVEs, unpinned versions allowing supply chain drift, missing lock files
- **Low:** Outdated dependencies with no known CVEs, missing SBOM, minor version pinning issues

**Related CWE IDs:** CWE-426, CWE-427, CWE-494, CWE-502, CWE-506, CWE-507, CWE-508, CWE-509, CWE-510, CWE-511, CWE-829, CWE-830, CWE-915, CWE-1035, CWE-1104

---

## A04:2025 — Cryptographic Failures

**Description:** Failures related to cryptography that often lead to sensitive data exposure. This includes use of weak or deprecated algorithms, improper key management, insufficient entropy, and transmitting data in cleartext. Previously known as "Sensitive Data Exposure," the focus is now on the root cause: cryptographic failures.

**Common Vulnerability Patterns:**
- Data transmitted in cleartext (HTTP, FTP, SMTP without TLS)
- Use of deprecated algorithms (MD5, SHA1 for security, DES, RC4, RSA <2048-bit)
- Hardcoded encryption keys or secrets in source code
- Weak or predictable random number generation for security contexts
- Missing encryption for sensitive data at rest (PII, credentials, financial data)
- Improper certificate validation (disabled checks, self-signed in production)
- ECB mode or other insecure cipher modes
- Missing or improper password hashing (plaintext, unsalted, fast hashes like MD5/SHA)
- Reuse of initialization vectors or nonces

**Severity Scoring Guidance:**
- **Critical:** Passwords stored in plaintext, sensitive data transmitted over HTTP with no TLS, hardcoded production encryption keys
- **High:** Use of broken algorithms (MD5/SHA1) for password hashing, weak TLS configurations (SSLv3, TLS 1.0), predictable session tokens
- **Medium:** Use of SHA1 for non-password integrity checks, missing encryption for moderately sensitive data at rest, self-signed certificates in staging
- **Low:** Use of older but not broken algorithms, minor key management issues in non-production environments

**Related CWE IDs:** CWE-261, CWE-296, CWE-310, CWE-319, CWE-321, CWE-322, CWE-323, CWE-324, CWE-325, CWE-326, CWE-327, CWE-328, CWE-329, CWE-330, CWE-331, CWE-335, CWE-336, CWE-337, CWE-338, CWE-340, CWE-347, CWE-523, CWE-720, CWE-757, CWE-759, CWE-760, CWE-780, CWE-798, CWE-916

---

## A05:2025 — Injection

**Description:** Injection flaws occur when untrusted data is sent to an interpreter as part of a command or query. Hostile data can trick the interpreter into executing unintended commands or accessing data without proper authorization. This includes SQL, NoSQL, OS command, LDAP, XPath, and expression language injection.

**Common Vulnerability Patterns:**
- String concatenation in SQL queries instead of parameterized queries
- User input passed directly to OS command execution (exec, system, popen)
- Template injection (SSTI) in server-side rendering engines
- LDAP injection via unsanitized search filters
- XPath injection in XML query construction
- Expression Language (EL) injection in Java frameworks
- NoSQL injection (MongoDB operator injection via JSON input)
- Header injection (CRLF injection in HTTP responses)
- Cross-site scripting (XSS) — reflected, stored, and DOM-based

**Severity Scoring Guidance:**
- **Critical:** SQL injection with data exfiltration or admin bypass, OS command injection with shell access, SSTI with RCE
- **High:** Blind SQL injection, stored XSS in widely-viewed pages, NoSQL injection affecting authentication
- **Medium:** Reflected XSS requiring user interaction, second-order injection, LDAP injection with limited scope
- **Low:** Self-XSS, injection in low-privilege contexts, injection requiring authenticated access with limited impact

**Related CWE IDs:** CWE-20, CWE-74, CWE-75, CWE-77, CWE-78, CWE-79, CWE-80, CWE-83, CWE-87, CWE-88, CWE-89, CWE-90, CWE-91, CWE-93, CWE-94, CWE-95, CWE-96, CWE-97, CWE-98, CWE-99, CWE-100, CWE-113, CWE-116, CWE-138, CWE-184, CWE-470, CWE-471, CWE-564, CWE-610, CWE-643, CWE-644, CWE-652, CWE-917

---

## A06:2025 — Insecure Design

**Description:** Insecure design is a broad category representing weaknesses in the application's architecture and design that cannot be fixed by a perfect implementation. It focuses on risks related to design and architectural flaws, calling for more use of threat modeling, secure design patterns, and reference architectures.

**Common Vulnerability Patterns:**
- Missing rate limiting on sensitive operations (login, password reset, API calls)
- Lack of multi-factor authentication on critical functions
- Business logic flaws (negative quantities in orders, race conditions in transactions)
- Missing anti-automation controls on enumeration-prone endpoints
- Trust boundary violations (client-side validation only)
- Insufficient separation of concerns (mixing admin and user functionality)
- Missing or weak account lockout mechanisms
- Predictable resource identifiers without access controls
- Lack of input validation at architectural boundaries
- Missing fraud detection or abuse prevention mechanisms

**Severity Scoring Guidance:**
- **Critical:** Fundamental authentication design flaw allowing bypass, business logic flaw enabling financial fraud at scale
- **High:** Missing rate limiting allowing credential stuffing, design flaw enabling mass data enumeration, absent MFA on admin functions
- **Medium:** Weak anti-automation allowing gradual abuse, missing account lockout, trust boundary violations with partial server validation
- **Low:** Missing defense-in-depth layers, minor business logic inconsistencies, sub-optimal security architecture decisions

**Related CWE IDs:** CWE-73, CWE-183, CWE-209, CWE-213, CWE-235, CWE-256, CWE-257, CWE-266, CWE-269, CWE-280, CWE-311, CWE-312, CWE-313, CWE-316, CWE-419, CWE-430, CWE-434, CWE-444, CWE-451, CWE-472, CWE-501, CWE-522, CWE-525, CWE-539, CWE-579, CWE-598, CWE-602, CWE-642, CWE-646, CWE-650, CWE-653, CWE-656, CWE-657, CWE-799, CWE-807, CWE-840, CWE-841, CWE-927, CWE-1021, CWE-1173

---

## A07:2025 — Authentication Failures

**Description:** Confirmation of the user's identity, authentication, and session management is critical to protect against authentication-related attacks. Weaknesses exist when applications allow brute force attacks, use weak credentials, improperly handle sessions, or fail to implement adequate identity verification.

**Common Vulnerability Patterns:**
- Weak password policies (no complexity, short length, no breach-list checks)
- Missing or broken multi-factor authentication
- Session IDs exposed in URLs
- Session fixation vulnerabilities
- Sessions not invalidated on logout or password change
- Credential stuffing due to missing rate limiting or CAPTCHA
- Password recovery flaws (predictable tokens, information leakage)
- Insecure "remember me" functionality
- Default or well-known credentials
- JWT implementation flaws (none algorithm, weak secrets, missing expiration)

**Severity Scoring Guidance:**
- **Critical:** Authentication bypass allowing access without credentials, JWT "none" algorithm accepted, default admin credentials in production
- **High:** Missing MFA on privileged accounts, session fixation, weak session token generation, credential stuffing with no rate limiting
- **Medium:** Sessions not invalidated on logout, weak password policy, insecure password recovery with some mitigations
- **Low:** Session timeout too long, minor session management issues, missing re-authentication for preference changes

**Related CWE IDs:** CWE-255, CWE-259, CWE-287, CWE-288, CWE-290, CWE-294, CWE-295, CWE-297, CWE-300, CWE-302, CWE-304, CWE-306, CWE-307, CWE-346, CWE-384, CWE-521, CWE-613, CWE-620, CWE-640, CWE-798, CWE-940, CWE-1216

---

## A08:2025 — Software or Data Integrity Failures

**Description:** Software and data integrity failures relate to code and infrastructure that does not protect against integrity violations. This includes using software from untrusted sources, insecure CI/CD pipelines, and auto-update mechanisms without integrity verification. Insecure deserialization is a notable sub-category.

**Common Vulnerability Patterns:**
- Insecure deserialization of untrusted data (Java ObjectInputStream, Python pickle, PHP unserialize)
- Missing integrity checks on software updates (no code signing, no checksum verification)
- CI/CD pipeline manipulation (unsigned commits, unprotected deployment triggers)
- Use of CDN resources without Subresource Integrity (SRI) hashes
- Mass assignment or object binding vulnerabilities
- Unsigned or unverified firmware updates
- Insecure data serialization formats used for security decisions
- Missing digital signatures on critical data transfers
- Tamper-evident logging not implemented

**Severity Scoring Guidance:**
- **Critical:** Deserialization leading to RCE, CI/CD pipeline compromise allowing arbitrary code deployment, unsigned updates to production systems
- **High:** Mass assignment enabling privilege escalation, missing SRI on authentication-related scripts, deserialization DoS
- **Medium:** Missing SRI on non-critical CDN resources, unsigned internal artifacts, minor mass assignment without privilege impact
- **Low:** Missing integrity checks on non-sensitive data, informational findings about pipeline hardening

**Related CWE IDs:** CWE-345, CWE-353, CWE-426, CWE-494, CWE-502, CWE-565, CWE-784, CWE-829, CWE-830, CWE-913, CWE-915

---

## A09:2025 — Security Logging and Monitoring Failures

**Description:** Without adequate logging and monitoring, breaches cannot be detected in a timely manner. Insufficient logging, ineffective integration with incident response systems, and lack of real-time alerting allow attackers to persist in systems, pivot to other systems, and tamper with or extract data undetected.

**Common Vulnerability Patterns:**
- Sensitive operations (login, access control failures, input validation failures) not logged
- Log messages that do not include sufficient context (who, what, when, where)
- Logs only stored locally with no centralized aggregation
- No alerting or monitoring for suspicious activity patterns
- Log injection vulnerabilities (unsanitized user input in log messages)
- Sensitive data written to logs (passwords, tokens, PII, credit card numbers)
- Logs not protected against tampering or deletion
- Missing audit trail for administrative actions
- No monitoring of API rate limiting violations or anomalous patterns

**Severity Scoring Guidance:**
- **Critical:** No logging of authentication events, sensitive data (credentials, tokens) written to logs in plaintext, logs publicly accessible
- **High:** Missing logging for access control failures, no alerting on repeated failed logins, log injection enabling log forging
- **Medium:** Insufficient log detail for forensic analysis, logs not centrally aggregated, missing audit trail for some admin actions
- **Low:** Minor logging gaps in non-sensitive operations, log rotation issues, missing structured logging format

**Related CWE IDs:** CWE-117, CWE-223, CWE-532, CWE-778, CWE-779

---

## A10:2025 — Mishandling of Exceptional Conditions (NEW)

**Description:** Applications that fail to properly handle errors, exceptions, and unexpected conditions can expose sensitive information, enter insecure states, or become unavailable. This new category addresses the systemic risk of poor error handling, including unhandled exceptions, fail-open designs, and resource exhaustion from exceptional inputs.

**Common Vulnerability Patterns:**
- Unhandled exceptions exposing stack traces, file paths, or database details
- Fail-open error handling (granting access when an authorization check throws an error)
- Empty catch blocks that silently swallow critical security exceptions
- Missing error handling on cryptographic operations (proceeding when verification fails)
- Resource exhaustion from malformed or exceptional inputs (zip bombs, XML bombs, regex DoS)
- Inconsistent error handling across code paths (some paths validated, others not)
- Race conditions in error recovery leading to inconsistent state
- Application crashes from unexpected null values or type mismatches
- Improper cleanup in error paths (resource leaks, lock retention, temp file persistence)
- Returning different error messages that enable user enumeration

**Severity Scoring Guidance:**
- **Critical:** Fail-open authentication/authorization on error, unhandled exception leading to RCE or data exposure, resource exhaustion causing system-wide DoS
- **High:** Stack traces revealing sensitive internal details in production, error handling bypass of security controls, regex DoS on public endpoints
- **Medium:** User enumeration via error message differences, inconsistent error handling with partial security impact, resource leaks under error conditions
- **Low:** Verbose error messages in internal applications, minor resource cleanup issues, generic error handling improvements

**Related CWE IDs:** CWE-190, CWE-209, CWE-230, CWE-233, CWE-235, CWE-236, CWE-248, CWE-280, CWE-354, CWE-391, CWE-392, CWE-394, CWE-395, CWE-396, CWE-397, CWE-400, CWE-407, CWE-415, CWE-416, CWE-457, CWE-476, CWE-544, CWE-703, CWE-754, CWE-755, CWE-756, CWE-770, CWE-771, CWE-772, CWE-820, CWE-1384

---

## Quick Lookup Table

| ID | Name | Key Risk |
|----|------|----------|
| A01:2025 | Broken Access Control | Unauthorized data access or privilege escalation |
| A02:2025 | Security Misconfiguration | Insecure defaults, missing hardening, exposed debug |
| A03:2025 | Software Supply Chain Failures | Vulnerable dependencies, compromised pipelines |
| A04:2025 | Cryptographic Failures | Weak crypto, cleartext data, poor key management |
| A05:2025 | Injection | Untrusted data executed as code or queries |
| A06:2025 | Insecure Design | Architectural flaws, missing security controls |
| A07:2025 | Authentication Failures | Broken identity verification, weak sessions |
| A08:2025 | Software or Data Integrity Failures | Untrusted deserialization, unsigned updates |
| A09:2025 | Security Logging and Monitoring Failures | Insufficient detection and response capability |
| A10:2025 | Mishandling of Exceptional Conditions | Poor error handling, fail-open, resource exhaustion |
