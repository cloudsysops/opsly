# CWE Top 25 Most Dangerous Software Weaknesses — 2025

Reference for detecting, classifying, and scoring vulnerabilities by CWE during security analysis.

---

## CWE-79: Improper Neutralization of Input During Web Page Generation (XSS)

- **Risk Score:** 56.86
- **Description:** The application does not neutralize or incorrectly neutralizes user-controllable input before it is placed in output that is used as a web page served to other users. Enables reflected, stored, and DOM-based cross-site scripting attacks.
- **Detection Approach:**
  - Pattern: `innerHTML`, `outerHTML`, `document.write(`, `v-html`, `dangerouslySetInnerHTML`
  - Pattern: Template expressions with unescaped output (`<%=`, `{!! !!}`, `| safe`, `| raw`)
  - Pattern: User input reflected in responses without encoding
  - Look for missing output encoding in HTML, JavaScript, URL, and CSS contexts
- **Default Severity:** High
- **Related OWASP 2025:** A05:2025 Injection

---

## CWE-89: Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)

- **Risk Score:** 35.34
- **Description:** The application constructs SQL statements using string concatenation or formatting with user-supplied input, without proper parameterization. Allows attackers to modify query logic, extract data, or execute administrative operations on the database.
- **Detection Approach:**
  - Pattern: String concatenation in SQL — `"SELECT.*" \+`, `"INSERT.*" \+`, `f"SELECT`, `f"INSERT`
  - Pattern: Format strings in queries — `String.format(.*SELECT`, `%s` in SQL strings
  - Pattern: Raw query methods — `.raw(`, `.execute(.*%`, `cursor.execute(.*+`
  - Look for any user input flowing into SQL without parameterized queries or prepared statements
- **Default Severity:** Critical
- **Related OWASP 2025:** A05:2025 Injection

---

## CWE-352: Cross-Site Request Forgery (CSRF)

- **Risk Score:** 30.45
- **Description:** The web application does not sufficiently verify that a well-formed, valid, consistent request was intentionally provided by the authenticated user who submitted the request. Attackers can trick users into making unintended requests.
- **Detection Approach:**
  - Pattern: State-changing operations using GET method
  - Pattern: Forms missing CSRF tokens — `<form` without `csrf`, `_token`, `authenticity_token`
  - Pattern: Missing CSRF middleware — check framework configuration for disabled CSRF protection
  - Pattern: APIs accepting cookies without SameSite attribute or CSRF header checks
  - Look for `@csrf_exempt`, `csrf: false`, disabled CSRF middleware
- **Default Severity:** High
- **Related OWASP 2025:** A01:2025 Broken Access Control

---

## CWE-862: Missing Authorization

- **Risk Score:** 28.18
- **Description:** The application does not perform an authorization check when an actor attempts to access a resource or perform an action. Any authenticated user (or in some cases, unauthenticated users) can access privileged functionality.
- **Detection Approach:**
  - Pattern: API endpoints or route handlers with no authorization decorators or middleware
  - Pattern: Missing `@authorize`, `@login_required`, `@Roles`, `[Authorize]`, access control checks
  - Pattern: Direct object access without ownership verification
  - Look for routes defined without any permission or role checks
- **Default Severity:** High
- **Related OWASP 2025:** A01:2025 Broken Access Control

---

## CWE-787: Out-of-bounds Write

- **Risk Score:** 26.22
- **Description:** The software writes data past the end, or before the beginning, of the intended buffer. Can result in memory corruption, code execution, or crashes. Primarily affects C/C++ and other memory-unsafe languages.
- **Detection Approach:**
  - Pattern: `memcpy(`, `strcpy(`, `strcat(`, `sprintf(` without bounds checking
  - Pattern: Array indexing without bounds validation in C/C++
  - Pattern: Buffer operations using user-controlled size — `malloc(user_input)`
  - Look for missing length checks before buffer writes, use of unsafe string functions
- **Default Severity:** Critical
- **Related OWASP 2025:** A10:2025 Mishandling of Exceptional Conditions

---

## CWE-22: Improper Limitation of a Pathname to a Restricted Directory (Path Traversal)

- **Risk Score:** 24.69
- **Description:** The application uses external input to construct a pathname to a file or directory without properly neutralizing special elements like `../` that can resolve to a location outside the intended restricted directory.
- **Detection Approach:**
  - Pattern: File operations with user input — `open(request.`, `File(params[`, `fs.readFile(req.`
  - Pattern: Path construction via concatenation — `base_dir + user_input`, `path.join(.*req.`
  - Pattern: Missing path canonicalization before access checks
  - Look for `../` traversal not stripped, symlink following, absent `realpath()` or equivalent checks
- **Default Severity:** High
- **Related OWASP 2025:** A01:2025 Broken Access Control

---

## CWE-416: Use After Free

- **Risk Score:** 22.40
- **Description:** The application references memory after it has been freed, which can lead to program crashes, arbitrary code execution, or information disclosure. Common in C/C++ applications.
- **Detection Approach:**
  - Pattern: Pointer use after `free()` or `delete` without nullification
  - Pattern: Return of stack-allocated memory or freed heap memory
  - Pattern: Double-free patterns — `free(ptr)` followed by another `free(ptr)`
  - Use static analysis tools (ASan, Valgrind) for runtime detection
- **Default Severity:** Critical
- **Related OWASP 2025:** A10:2025 Mishandling of Exceptional Conditions

---

## CWE-125: Out-of-bounds Read

- **Risk Score:** 21.56
- **Description:** The software reads data past the end, or before the beginning, of the intended buffer. Can lead to information disclosure, crashes, or further exploitation. Primarily affects C/C++.
- **Detection Approach:**
  - Pattern: Array access without bounds checking in C/C++
  - Pattern: `memcmp(`, `memchr(`, `strncmp(` with user-controlled length
  - Pattern: Buffer reads using indices derived from untrusted input
  - Look for missing length validation before read operations on buffers
- **Default Severity:** High
- **Related OWASP 2025:** A10:2025 Mishandling of Exceptional Conditions

---

## CWE-78: Improper Neutralization of Special Elements used in an OS Command (OS Command Injection)

- **Risk Score:** 21.10
- **Description:** The application constructs an OS command using externally-influenced input without proper neutralization, allowing attackers to execute arbitrary commands on the host operating system.
- **Detection Approach:**
  - Pattern: `os.system(`, `subprocess.call(.*shell=True`, `exec(`, `system(`, `popen(`
  - Pattern: Backtick execution — `` `#{user_input}` ``, `$(user_input)`
  - Pattern: `Runtime.getRuntime().exec(`, `ProcessBuilder` with user input
  - Pattern: `child_process.exec(`, `execSync(` in Node.js with user input
  - Look for any shell invocation where user input is part of the command string
- **Default Severity:** Critical
- **Related OWASP 2025:** A05:2025 Injection

---

## CWE-94: Improper Control of Generation of Code (Code Injection)

- **Risk Score:** 19.85
- **Description:** The application constructs code segments using externally-influenced input without proper neutralization, allowing attacker-controlled code to be executed by the application.
- **Detection Approach:**
  - Pattern: `eval(`, `exec(`, `compile(` with user-controlled input
  - Pattern: `Function(` constructor in JavaScript with dynamic input
  - Pattern: `setInterval(string)`, `setTimeout(string)` with user input
  - Pattern: Server-side template injection — user input in template strings
  - Look for dynamic code generation from untrusted sources
- **Default Severity:** Critical
- **Related OWASP 2025:** A05:2025 Injection

---

## CWE-502: Deserialization of Untrusted Data

- **Risk Score:** 18.71
- **Description:** The application deserializes untrusted data without sufficiently verifying that the resulting data will be valid, allowing attackers to craft serialized objects that execute arbitrary code or manipulate application logic.
- **Detection Approach:**
  - Pattern: `pickle.loads(`, `yaml.load(` (without SafeLoader), `ObjectInputStream`, `unserialize(`
  - Pattern: `Marshal.load(`, `JSON.parse(` with reviver executing code, `readObject(`
  - Pattern: `BinaryFormatter.Deserialize(`, `NetDataContractSerializer`
  - Look for deserialization of data from untrusted sources (HTTP requests, files, message queues)
- **Default Severity:** Critical
- **Related OWASP 2025:** A08:2025 Software or Data Integrity Failures

---

## CWE-434: Unrestricted Upload of File with Dangerous Type

- **Risk Score:** 17.92
- **Description:** The application allows file upload without properly validating the file type, content, or storing it in a safe location. Attackers can upload executable files (web shells, scripts) to gain remote code execution.
- **Detection Approach:**
  - Pattern: File upload handling without content-type or extension validation
  - Pattern: Uploaded files stored in web-accessible directories
  - Pattern: Validation based only on client-provided Content-Type header
  - Pattern: Missing file size limits on upload endpoints
  - Look for upload handlers that rely solely on file extension or MIME type from the client
- **Default Severity:** High
- **Related OWASP 2025:** A06:2025 Insecure Design

---

## CWE-476: NULL Pointer Dereference

- **Risk Score:** 17.12
- **Description:** The application dereferences a pointer that it expects to be valid but is NULL, leading to a crash or exit. In rare cases, attackers can exploit this for code execution.
- **Detection Approach:**
  - Pattern: Pointer use without null check after allocation — `malloc(` followed by dereference without check
  - Pattern: Dereference after a function that may return NULL
  - Pattern: Missing null checks on return values from APIs that can fail
  - Static analysis flags for potential null dereferences
- **Default Severity:** Medium
- **Related OWASP 2025:** A10:2025 Mishandling of Exceptional Conditions

---

## CWE-190: Integer Overflow or Wraparound

- **Risk Score:** 16.88
- **Description:** An integer value is incremented to a value that is too large to store in the associated representation, causing it to wrap around and become a very small or negative number. Can lead to buffer overflows, incorrect calculations, or logic bypasses.
- **Detection Approach:**
  - Pattern: Arithmetic operations on user-controlled integers without overflow checks
  - Pattern: Size calculations — `malloc(count * size)` without overflow check
  - Pattern: Type casting from larger to smaller integer types
  - Look for integer arithmetic used in memory allocation sizes or loop bounds
- **Default Severity:** High
- **Related OWASP 2025:** A10:2025 Mishandling of Exceptional Conditions

---

## CWE-918: Server-Side Request Forgery (SSRF)

- **Risk Score:** 16.42
- **Description:** The application fetches a remote resource using a user-supplied URL without validating that the URL points to an expected, safe destination. Attackers can force the server to make requests to internal services, cloud metadata endpoints, or arbitrary external systems.
- **Detection Approach:**
  - Pattern: `requests.get(user_input)`, `fetch(user_url)`, `urllib.urlopen(user_input)`
  - Pattern: `HttpClient` or `RestTemplate` with user-controlled URLs
  - Pattern: URL parameters named `url=`, `target=`, `dest=`, `redirect=`, `uri=`, `path=`
  - Look for HTTP client calls where the URL is derived from user input without allowlist validation
- **Default Severity:** High
- **Related OWASP 2025:** A05:2025 Injection

---

## CWE-362: Concurrent Execution Using Shared Resource with Improper Synchronization (Race Condition)

- **Risk Score:** 15.61
- **Description:** The application contains a code sequence that can run concurrently with other code, accessing a shared resource without proper synchronization, leading to unexpected behavior including security bypasses, data corruption, or privilege escalation.
- **Detection Approach:**
  - Pattern: TOCTOU (time-of-check-time-of-use) — check followed by action without locking
  - Pattern: File operations — `os.path.exists()` followed by `open()` without atomic operation
  - Pattern: Missing locks on shared state in multithreaded code
  - Pattern: Database operations without transactions where atomicity is required
  - Look for sequences where a security check and the protected action are not atomic
- **Default Severity:** Medium
- **Related OWASP 2025:** A06:2025 Insecure Design

---

## CWE-863: Incorrect Authorization

- **Risk Score:** 15.28
- **Description:** The application performs an authorization check but does so incorrectly, allowing attackers to bypass the intended access restrictions. Unlike CWE-862 (missing authorization), the check exists but contains a logic flaw.
- **Detection Approach:**
  - Pattern: Role checks using `OR` instead of `AND` logic
  - Pattern: Authorization checks that compare against wrong attribute or use wrong operator
  - Pattern: Inconsistent authorization — some code paths enforce, others do not
  - Look for complex authorization logic, especially involving multiple roles or permissions
- **Default Severity:** High
- **Related OWASP 2025:** A01:2025 Broken Access Control

---

## CWE-306: Missing Authentication for Critical Function

- **Risk Score:** 14.95
- **Description:** The application does not authenticate users before allowing access to critical functionality, such as administrative actions, account modification, or sensitive data access.
- **Detection Approach:**
  - Pattern: Admin or management endpoints without authentication middleware
  - Pattern: API routes for sensitive operations with no auth decorators
  - Pattern: Health check or debug endpoints exposing sensitive data without authentication
  - Look for route definitions that handle sensitive operations but lack `@authenticated`, auth middleware, or token checks
- **Default Severity:** Critical
- **Related OWASP 2025:** A07:2025 Authentication Failures

---

## CWE-770: Allocation of Resources Without Limits or Throttling

- **Risk Score:** 14.52
- **Description:** The application allocates a reusable resource or group of resources without imposing limits on how many resources can be allocated, allowing attackers to exhaust available resources and cause denial of service.
- **Detection Approach:**
  - Pattern: Unbounded collection growth — `.append(`, `.push(` in loops without size limits
  - Pattern: Missing pagination on database queries — `SELECT *` without `LIMIT`
  - Pattern: File upload without size limits
  - Pattern: Thread/process creation without pool limits
  - Look for resource allocation driven by user-controlled input without caps
- **Default Severity:** Medium
- **Related OWASP 2025:** A10:2025 Mishandling of Exceptional Conditions

---

## CWE-601: URL Redirection to Untrusted Site (Open Redirect)

- **Risk Score:** 13.89
- **Description:** The application accepts a user-controlled URL and redirects the user to that URL without validating that it points to a trusted destination. Used in phishing attacks and OAuth token theft.
- **Detection Approach:**
  - Pattern: `redirect(request.params[`, `res.redirect(req.query.`, `Location:` header with user input
  - Pattern: URL parameters named `redirect=`, `next=`, `url=`, `return=`, `goto=`, `continue=`
  - Pattern: `302` or `301` responses using user-supplied URL values
  - Look for redirect functions where the target URL comes from request parameters
- **Default Severity:** Medium
- **Related OWASP 2025:** A05:2025 Injection

---

## CWE-798: Use of Hard-coded Credentials

- **Risk Score:** 13.62
- **Description:** The application contains hard-coded credentials such as passwords, API keys, cryptographic keys, or tokens embedded in source code, configuration files, or binaries.
- **Detection Approach:**
  - Pattern: `password\s*=\s*["']`, `api_key\s*=\s*["']`, `secret\s*=\s*["']`, `token\s*=\s*["']`
  - Pattern: `AWS_ACCESS_KEY_ID`, `PRIVATE_KEY`, `-----BEGIN RSA`, `-----BEGIN PRIVATE`
  - Pattern: Connection strings with embedded credentials
  - Pattern: Base64-encoded strings that decode to credentials
  - Look for string literals assigned to variables with names suggesting secrets
- **Default Severity:** High
- **Related OWASP 2025:** A04:2025 Cryptographic Failures

---

## CWE-327: Use of a Broken or Risky Cryptographic Algorithm

- **Risk Score:** 13.15
- **Description:** The application uses a cryptographic algorithm that is known to be weak, broken, or insufficient for the required level of security. This includes algorithms like MD5, SHA1 (for security purposes), DES, RC4, and custom cryptographic implementations.
- **Detection Approach:**
  - Pattern: `MD5(`, `md5(`, `hashlib.md5`, `SHA1(`, `sha1(`, `hashlib.sha1`
  - Pattern: `DES`, `RC4`, `Blowfish` in crypto context
  - Pattern: `Math.random()`, `rand()`, `random()` used for security tokens
  - Pattern: ECB cipher mode — `AES/ECB`, `MODE_ECB`
  - Look for cryptographic operations using deprecated or weak algorithms
- **Default Severity:** High
- **Related OWASP 2025:** A04:2025 Cryptographic Failures

---

## CWE-532: Insertion of Sensitive Information into Log File

- **Risk Score:** 12.78
- **Description:** The application writes sensitive information such as passwords, tokens, session IDs, or PII into log files, potentially exposing this data to unauthorized actors with access to logs.
- **Detection Approach:**
  - Pattern: `log.*(password|token|secret|key|credential|ssn|credit.card|api.key)`
  - Pattern: `logger.info(.*request` logging full request bodies
  - Pattern: `console.log(.*auth`, `print(.*password`
  - Look for logging statements that include variables containing sensitive data
- **Default Severity:** Medium
- **Related OWASP 2025:** A09:2025 Security Logging and Monitoring Failures

---

## CWE-269: Improper Privilege Management

- **Risk Score:** 12.44
- **Description:** The application does not properly manage privileges, allowing attackers to gain elevated access. This includes running with unnecessary privileges, failing to drop privileges after performing privileged operations, and improper privilege assignment.
- **Detection Approach:**
  - Pattern: Running as root/admin — `setuid(0)`, `runAsAdmin`, `sudo` in scripts
  - Pattern: Overly broad permissions — `chmod 777`, `0777`, `*` in IAM policies
  - Pattern: Privilege not dropped after use — missing `setuid(original_user)` after privileged operation
  - Look for services running with more privileges than needed, IAM policies with `Action: *`
- **Default Severity:** High
- **Related OWASP 2025:** A01:2025 Broken Access Control

---

## CWE-400: Uncontrolled Resource Consumption

- **Risk Score:** 12.01
- **Description:** The application does not properly control the amount of resources it allocates or consumes in response to user input, allowing attackers to trigger excessive CPU, memory, disk, or network usage leading to denial of service.
- **Detection Approach:**
  - Pattern: Regex with catastrophic backtracking — nested quantifiers `(a+)+`, `(a|a)*`
  - Pattern: XML parsing without entity limits — `DocumentBuilder` without `FEATURE_SECURE_PROCESSING`
  - Pattern: Recursive operations on user input without depth limits
  - Pattern: Missing request size limits — no `maxBodySize`, `client_max_body_size`
  - Look for operations whose cost scales with user-controlled input without bounds
- **Default Severity:** Medium
- **Related OWASP 2025:** A10:2025 Mishandling of Exceptional Conditions

---

## Quick Lookup Table

| CWE | Name | Severity | OWASP 2025 |
|-----|------|----------|------------|
| CWE-79 | XSS | High | A05 Injection |
| CWE-89 | SQL Injection | Critical | A05 Injection |
| CWE-352 | CSRF | High | A01 Broken Access Control |
| CWE-862 | Missing Authorization | High | A01 Broken Access Control |
| CWE-787 | Out-of-bounds Write | Critical | A10 Mishandling of Exceptional Conditions |
| CWE-22 | Path Traversal | High | A01 Broken Access Control |
| CWE-416 | Use After Free | Critical | A10 Mishandling of Exceptional Conditions |
| CWE-125 | Out-of-bounds Read | High | A10 Mishandling of Exceptional Conditions |
| CWE-78 | OS Command Injection | Critical | A05 Injection |
| CWE-94 | Code Injection | Critical | A05 Injection |
| CWE-502 | Deserialization | Critical | A08 Integrity Failures |
| CWE-434 | Unrestricted Upload | High | A06 Insecure Design |
| CWE-476 | NULL Pointer Dereference | Medium | A10 Mishandling of Exceptional Conditions |
| CWE-190 | Integer Overflow | High | A10 Mishandling of Exceptional Conditions |
| CWE-918 | SSRF | High | A05 Injection |
| CWE-362 | Race Condition | Medium | A06 Insecure Design |
| CWE-863 | Incorrect Authorization | High | A01 Broken Access Control |
| CWE-306 | Missing Authentication | Critical | A07 Authentication Failures |
| CWE-770 | Resource Allocation | Medium | A10 Mishandling of Exceptional Conditions |
| CWE-601 | Open Redirect | Medium | A05 Injection |
| CWE-798 | Hardcoded Credentials | High | A04 Cryptographic Failures |
| CWE-327 | Broken Crypto | High | A04 Cryptographic Failures |
| CWE-532 | Info Exposure via Logs | Medium | A09 Logging Failures |
| CWE-269 | Improper Privilege | High | A01 Broken Access Control |
| CWE-400 | Resource Consumption | Medium | A10 Mishandling of Exceptional Conditions |

---

## Severity Mapping Summary

**Critical:** CWE-89, CWE-787, CWE-416, CWE-78, CWE-94, CWE-502, CWE-306
**High:** CWE-79, CWE-352, CWE-862, CWE-22, CWE-125, CWE-434, CWE-190, CWE-918, CWE-863, CWE-798, CWE-327, CWE-269
**Medium:** CWE-476, CWE-362, CWE-770, CWE-601, CWE-532, CWE-400
