# Web Security Patterns

Reference knowledge base for Cyber Neo web application security analysis.

---

## SECURITY HEADERS

### 1. Missing Content-Security-Policy (CSP)

**CWE**: CWE-693 (Protection Mechanism Failure)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: High

#### Grep Patterns

```
# Check for CSP header being set
(?i)content-security-policy
(?i)contentSecurityPolicy
(?i)csp

# Dangerous CSP directives
unsafe-inline
unsafe-eval
data:               # in script-src
\*                  # wildcard in script-src

# Framework-specific
helmet\(            # Check if helmet is imported but CSP not configured
```

#### Vulnerable (Express)

```javascript
// No CSP at all
app.use(express.static('public'));

// Overly permissive CSP
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'");
  next();
});
```

#### Secure (Express)

```javascript
const helmet = require('helmet');
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],  // unsafe-inline for styles is lower risk
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: [],
  }
}));
```

#### Secure (Django)

```python
# settings.py
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_IMG_SRC = ("'self'", "data:", "https:")
```

#### Secure (Next.js)

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  }
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

---

### 2. Permissive CORS

**CWE**: CWE-942 (Overly Permissive Cross-domain Whitelist)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: High

#### Grep Patterns

```
# Wildcard origin
Access-Control-Allow-Origin:\s*\*
(?i)origin:\s*['"]?\*['"]?
(?i)allowedOrigins.*\*
(?i)cors\(\)                # cors() with no options = allow all

# Reflecting origin without validation
req\.headers\.origin
request\.headers\['origin'\]
Access-Control-Allow-Credentials.*true   # combined with * origin is rejected by browsers but indicates misconfiguration intent

# Framework-specific
cors\(\{                    # Check origin config
CORS_ALLOW_ALL_ORIGINS\s*=\s*True
CORS_ORIGIN_ALLOW_ALL\s*=\s*True
```

#### Vulnerable (Express)

```javascript
// Allow all origins
const cors = require('cors');
app.use(cors());

// Reflect any origin with credentials
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});
```

#### Secure (Express)

```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

#### Vulnerable (Django)

```python
# settings.py
CORS_ALLOW_ALL_ORIGINS = True
```

#### Secure (Django)

```python
CORS_ALLOWED_ORIGINS = [
    "https://app.example.com",
    "https://admin.example.com",
]
CORS_ALLOW_CREDENTIALS = True
```

#### Secure (FastAPI)

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.example.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

### 3. Missing HSTS

**CWE**: CWE-319 (Cleartext Transmission of Sensitive Information)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: High

#### Grep Patterns

```
(?i)strict-transport-security
(?i)hsts
helmet\.hsts
SECURE_HSTS_SECONDS
```

#### Secure (Express)

```javascript
app.use(helmet.hsts({
  maxAge: 31536000,       // 1 year
  includeSubDomains: true,
  preload: true
}));
```

#### Secure (Django)

```python
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

---

### 4. Missing X-Frame-Options

**CWE**: CWE-1021 (Improper Restriction of Rendered UI Layers)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: Medium

#### Grep Patterns

```
(?i)x-frame-options
(?i)frameguard
(?i)X_FRAME_OPTIONS
(?i)frame-ancestors     # CSP alternative
```

#### Secure

```javascript
// Express
app.use(helmet.frameguard({ action: 'deny' }));
// Or via CSP: frame-ancestors 'none'
```

```python
# Django (enabled by default via XFrameOptionsMiddleware)
X_FRAME_OPTIONS = 'DENY'
```

---

### 5. Missing X-Content-Type-Options

**CWE**: CWE-693 (Protection Mechanism Failure)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: Medium

#### Grep Patterns

```
(?i)x-content-type-options
(?i)noSniff
```

#### Secure

```javascript
app.use(helmet.noSniff());
// Sets: X-Content-Type-Options: nosniff
```

---

### 6. Missing Referrer-Policy

**CWE**: CWE-200 (Exposure of Sensitive Information)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: Medium

#### Grep Patterns

```
(?i)referrer-policy
(?i)referrerPolicy
```

#### Secure

```javascript
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
```

---

### 7. Missing Permissions-Policy

**CWE**: CWE-693 (Protection Mechanism Failure)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: Low

#### Grep Patterns

```
(?i)permissions-policy
(?i)feature-policy        # deprecated predecessor
```

#### Secure

```javascript
app.use(helmet.permittedCrossDomainPolicies());
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
```

---

### 8. Helmet.js Not Used (Express)

**CWE**: CWE-693 (Protection Mechanism Failure)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: High

#### Grep Patterns

```
# Check for helmet import/usage in Express apps
require\(['"]helmet['"]\)
import\s+helmet
app\.use\(helmet

# If Express is used but helmet is not found, flag it
require\(['"]express['"]\)
```

#### Secure

```javascript
const helmet = require('helmet');
app.use(helmet());  // Sets 11+ security headers with sensible defaults
```

---

## CSRF

### 9. Missing CSRF Protection

**CWE**: CWE-352 (Cross-Site Request Forgery)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: High

#### Grep Patterns

```
# Express - check for CSRF middleware
(?i)csurf
(?i)csrf
(?i)csrfProtection

# Django - check for CSRF middleware presence
CsrfViewMiddleware
csrf_protect

# Flask
FlaskForm          # WTForms includes CSRF by default
CSRFProtect

# FastAPI
# FastAPI does not include CSRF by default for APIs (relies on token auth)
# But form-based endpoints need protection

# Forms without CSRF token
<form(?!.*csrf).*method=['"]post['"]
```

#### Vulnerable (Express)

```javascript
// No CSRF protection on state-changing routes
app.post('/api/transfer', authenticate, async (req, res) => {
  await transferFunds(req.user.id, req.body.to, req.body.amount);
  res.json({ success: true });
});
```

#### Secure (Express)

```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: { httpOnly: true, secure: true, sameSite: 'strict' } });

app.post('/api/transfer', authenticate, csrfProtection, async (req, res) => {
  await transferFunds(req.user.id, req.body.to, req.body.amount);
  res.json({ success: true });
});
```

---

### 10. @csrf_exempt Decorators (Django)

**CWE**: CWE-352 (Cross-Site Request Forgery)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: High

#### Grep Patterns

```
@csrf_exempt
csrf_exempt\(
```

#### Vulnerable (Django)

```python
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt  # Disables CSRF protection entirely
def transfer_funds(request):
    if request.method == 'POST':
        # Process transfer
        pass
```

#### Secure (Django)

```python
# Remove @csrf_exempt, ensure CsrfViewMiddleware is in MIDDLEWARE
def transfer_funds(request):
    if request.method == 'POST':
        # CSRF token automatically validated by middleware
        pass
```

---

### 11. SameSite Cookie Attribute

**CWE**: CWE-352 (Cross-Site Request Forgery)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: Medium

#### Grep Patterns

```
(?i)samesite
(?i)same_site
Set-Cookie(?!.*SameSite)
cookie\((?!.*sameSite)
SESSION_COOKIE_SAMESITE
```

#### Secure

```javascript
// Express
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'  // or 'lax' for less restrictive
});
```

```python
# Django
SESSION_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_SAMESITE = 'Strict'
```

---

## SSRF (Server-Side Request Forgery)

### 12. User Input in URL Requests

**CWE**: CWE-918 (Server-Side Request Forgery)
**OWASP**: A05:2025 - Injection
**Severity**: Critical

#### Grep Patterns

```
# JavaScript/Node.js
fetch\(.*req\.(query|body|params)
axios\.\w+\(.*req\.(query|body|params)
http\.get\(.*req\.(query|body|params)
request\(.*req\.(query|body|params)
got\(.*req\.(query|body|params)

# Python
requests\.\w+\(.*request\.(GET|POST|data|args|json)
urllib\.request\.urlopen\(.*request
aiohttp.*\.get\(.*request
httpx\.\w+\(.*request

# URL construction from user input
(?i)url\s*=\s*.*req\.(query|body|params)
(?i)url\s*=\s*.*request\.(GET|POST|data|args)
(?i)url\s*=\s*f['"].*\{.*request
(?i)url\s*=\s*.*\+.*req\.
```

#### Vulnerable (Express)

```javascript
// User controls the URL entirely
app.get('/proxy', async (req, res) => {
  const response = await fetch(req.query.url);
  const data = await response.text();
  res.send(data);
});

// URL constructed from user input
app.post('/fetch-avatar', async (req, res) => {
  const url = `http://${req.body.host}/avatar/${req.body.userId}`;
  const response = await fetch(url);
  res.send(await response.buffer());
});
```

#### Secure (Express)

```javascript
const { URL } = require('url');

const ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com'];
const BLOCKED_RANGES = ['127.0.0.1', '0.0.0.0', '169.254.169.254', '10.', '172.16.', '192.168.'];

app.get('/proxy', async (req, res) => {
  try {
    const parsed = new URL(req.query.url);

    // Validate protocol
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid protocol' });
    }

    // Validate host against allowlist
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return res.status(400).json({ error: 'Host not allowed' });
    }

    // Block internal/metadata IPs
    if (BLOCKED_RANGES.some(range => parsed.hostname.startsWith(range))) {
      return res.status(400).json({ error: 'Internal addresses blocked' });
    }

    const response = await fetch(parsed.toString());
    const data = await response.text();
    res.send(data);
  } catch (err) {
    res.status(400).json({ error: 'Invalid URL' });
  }
});
```

#### Vulnerable (Python/Flask)

```python
@app.route('/fetch')
def fetch_url():
    url = request.args.get('url')
    response = requests.get(url)
    return response.text
```

#### Secure (Python/Flask)

```python
from urllib.parse import urlparse

ALLOWED_HOSTS = {'api.example.com', 'cdn.example.com'}

@app.route('/fetch')
def fetch_url():
    url = request.args.get('url')
    parsed = urlparse(url)

    if parsed.scheme not in ('http', 'https'):
        abort(400, 'Invalid protocol')
    if parsed.hostname not in ALLOWED_HOSTS:
        abort(400, 'Host not allowed')

    # Resolve DNS and check against internal ranges
    import ipaddress, socket
    ip = socket.gethostbyname(parsed.hostname)
    if ipaddress.ip_address(ip).is_private:
        abort(400, 'Internal addresses blocked')

    response = requests.get(url, timeout=5)
    return response.text
```

---

### 13. Cloud Metadata Endpoint Access

**CWE**: CWE-918 (Server-Side Request Forgery)
**OWASP**: A05:2025 - Injection
**Severity**: Critical

#### Grep Patterns

```
169\.254\.169\.254        # AWS/GCP/Azure metadata IP
metadata\.google\.internal
metadata\.azure\.com
100\.100\.100\.200         # Alibaba Cloud metadata
```

#### Notes

Any SSRF vulnerability that can reach `169.254.169.254` can steal cloud instance credentials. Always block this IP range in SSRF protections. AWS IMDSv2 mitigates this by requiring a PUT request with a hop-count header, but IMDSv1 is still the default on many instances.

---

## FILE UPLOAD

### 14. Missing File Type Validation

**CWE**: CWE-434 (Unrestricted Upload of File with Dangerous Type)
**OWASP**: A06:2025 - Insecure Design
**Severity**: Critical

#### Grep Patterns

```
# Multer without file filter
multer\(\{(?!.*fileFilter)
multer\.single\(
multer\.array\(
multer\.fields\(

# No extension/MIME check
req\.file(?!.*mimetype)
req\.files(?!.*mimetype)

# Django/Flask upload handling
request\.FILES
request\.files
save\(.*filename       # Check if filename is sanitized
```

#### Vulnerable (Express)

```javascript
const multer = require('multer');
// No file filter - accepts any file type including .exe, .php, .html
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ path: req.file.path });
});
```

#### Secure (Express)

```javascript
const multer = require('multer');
const path = require('path');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      // Generate random filename, never use original
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

---

### 15. Missing File Size Limits

**CWE**: CWE-770 (Allocation of Resources Without Limits)
**OWASP**: A06:2025 - Insecure Design
**Severity**: Medium

#### Grep Patterns

```
# Multer without limits
multer\(\{(?!.*limits)
# Express body parser without limits
express\.json\(\)           # No size limit
bodyParser\.json\(\)        # No size limit
express\.urlencoded\(\)

# Django
FILE_UPLOAD_MAX_MEMORY_SIZE
DATA_UPLOAD_MAX_MEMORY_SIZE
```

#### Secure

```javascript
// Express
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

---

### 16. Original Filename Used (Path Traversal)

**CWE**: CWE-22 (Path Traversal)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: High

#### Grep Patterns

```
# Using original filename directly
(?i)originalname
(?i)file\.name
(?i)filename.*=.*req\.file
(?i)original_filename

# Path join with user input
path\.join\(.*req\.file\.originalname
os\.path\.join\(.*filename
```

#### Vulnerable

```javascript
// Attacker sends filename: "../../../etc/cron.d/malicious"
app.post('/upload', upload.single('file'), (req, res) => {
  const dest = path.join('uploads', req.file.originalname);
  fs.renameSync(req.file.path, dest);
});
```

#### Secure

```javascript
app.post('/upload', upload.single('file'), (req, res) => {
  const ext = path.extname(req.file.originalname).toLowerCase();
  const safeName = `${crypto.randomUUID()}${ext}`;
  const dest = path.join('uploads', safeName);

  // Verify the resolved path is within uploads directory
  const resolved = path.resolve(dest);
  if (!resolved.startsWith(path.resolve('uploads'))) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  fs.renameSync(req.file.path, dest);
  res.json({ filename: safeName });
});
```

---

### 17. Uploads in Web-Accessible Directory

**CWE**: CWE-434 (Unrestricted Upload)
**OWASP**: A06:2025 - Insecure Design
**Severity**: High

#### Grep Patterns

```
# Files served from upload directory
express\.static.*upload
app\.use.*\/uploads
sendFile.*upload
MEDIA_ROOT.*=.*static     # Django uploads in static dir
```

#### Secure

```javascript
// Serve uploads through a controller that validates access, not as static files
app.get('/files/:id', authenticate, async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, userId: req.user.id });
  if (!file) return res.status(404).send('Not found');
  res.sendFile(file.path, { root: UPLOADS_DIR });
});
```

---

## OPEN REDIRECT

### 18. User Input in Redirect URLs

**CWE**: CWE-601 (URL Redirection to Untrusted Site)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: Medium

#### Grep Patterns

```
# Express
res\.redirect\(.*req\.(query|body|params)
res\.redirect\(.*req\.query\.url
res\.redirect\(.*req\.query\.next
res\.redirect\(.*req\.query\.redirect
res\.redirect\(.*req\.query\.return

# Django
redirect\(.*request\.GET
redirect\(.*request\.POST
HttpResponseRedirect\(.*request\.GET
return_url.*=.*request\.GET

# Flask
redirect\(.*request\.args
redirect\(.*url_for.*request\.args

# FastAPI
RedirectResponse\(.*request\.query_params

# Next.js
router\.push\(.*query
router\.replace\(.*query
```

#### Vulnerable (Express)

```javascript
app.get('/login', (req, res) => {
  // After login, redirect to wherever the user wants - phishing risk
  const returnUrl = req.query.next || '/';
  // Attacker: /login?next=https://evil.com/fake-login
  res.redirect(returnUrl);
});
```

#### Secure (Express)

```javascript
const ALLOWED_REDIRECT_HOSTS = ['app.example.com'];

app.get('/login', (req, res) => {
  const returnUrl = req.query.next || '/';

  // Only allow relative paths or allowlisted hosts
  try {
    const parsed = new URL(returnUrl, `https://${req.headers.host}`);
    if (parsed.host !== req.headers.host && !ALLOWED_REDIRECT_HOSTS.includes(parsed.host)) {
      return res.redirect('/');
    }
    res.redirect(parsed.pathname + parsed.search);
  } catch {
    res.redirect('/');
  }
});
```

#### Vulnerable (Django)

```python
def login_view(request):
    # ...authenticate...
    next_url = request.GET.get('next', '/')
    return redirect(next_url)
```

#### Secure (Django)

```python
from django.utils.http import url_has_allowed_host_and_scheme

def login_view(request):
    # ...authenticate...
    next_url = request.GET.get('next', '/')
    if not url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}):
        next_url = '/'
    return redirect(next_url)
```

---

## COOKIE SECURITY

### 19. Missing Secure Flag

**CWE**: CWE-614 (Sensitive Cookie in HTTPS Session Without Secure Attribute)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: High

#### Grep Patterns

```
# Cookies set without Secure flag
res\.cookie\((?!.*secure\s*:\s*true)
Set-Cookie(?!.*Secure)
SESSION_COOKIE_SECURE\s*=\s*False
CSRF_COOKIE_SECURE\s*=\s*False
```

#### Secure

```javascript
res.cookie('session', value, {
  secure: true,       // Only sent over HTTPS
  httpOnly: true,     // Not accessible via JavaScript
  sameSite: 'strict', // Not sent on cross-site requests
  maxAge: 3600000,    // 1 hour expiry
  path: '/',
  domain: '.example.com'
});
```

---

### 20. Missing HttpOnly Flag

**CWE**: CWE-1004 (Sensitive Cookie Without HttpOnly Flag)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: High

#### Grep Patterns

```
res\.cookie\((?!.*httpOnly\s*:\s*true)
Set-Cookie(?!.*HttpOnly)
SESSION_COOKIE_HTTPONLY\s*=\s*False
document\.cookie       # Client-side cookie access (check if reading session cookies)
```

#### Notes

Without `HttpOnly`, JavaScript can read cookie values via `document.cookie`. This means any XSS vulnerability can steal session tokens. Always set `httpOnly: true` on session cookies and authentication tokens.

---

### 21. Missing SameSite Attribute

**CWE**: CWE-352 (Cross-Site Request Forgery)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: Medium

#### Grep Patterns

```
res\.cookie\((?!.*sameSite)
Set-Cookie(?!.*SameSite)
SESSION_COOKIE_SAMESITE
```

#### Notes

- `SameSite=Strict`: Cookie never sent on cross-site requests. Best for session cookies.
- `SameSite=Lax`: Cookie sent on top-level navigations (GET only). Good default.
- `SameSite=None`: Cookie sent on all cross-site requests. Requires `Secure` flag. Only for legitimate cross-site use cases (e.g., embedded iframes, third-party integrations).

---

## ADDITIONAL WEB PATTERNS

### 22. SQL Injection

**CWE**: CWE-89 (SQL Injection)
**OWASP**: A05:2025 - Injection
**Severity**: Critical

#### Grep Patterns

```
# String concatenation in SQL queries
(?i)query\s*\(\s*['"`].*\+.*req\.(body|query|params)
(?i)query\s*\(\s*f['"].*SELECT
(?i)execute\s*\(\s*f['"].*SELECT
(?i)execute\s*\(\s*['"].*%s.*%.*req
(?i)\.raw\(.*\+
(?i)\.raw\(.*\$\{
(?i)format\(.*SELECT.*request
```

#### Vulnerable

```javascript
// String concatenation
const result = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);

// Template literal
const result = await db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);
```

#### Secure

```javascript
// Parameterized query
const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);

// ORM
const user = await User.findOne({ where: { email: req.body.email } });
```

---

### 23. XSS (Cross-Site Scripting)

**CWE**: CWE-79 (Cross-Site Scripting)
**OWASP**: A05:2025 - Injection
**Severity**: High

#### Grep Patterns

```
# Direct output of user input (reflected XSS)
res\.send\(.*req\.(query|body|params)
innerHTML\s*=
document\.write\(
\.html\(.*req\.
\$\{.*req\.(query|body)     # template literal in HTML response

# React dangerouslySetInnerHTML
dangerouslySetInnerHTML

# Vue v-html
v-html

# Django |safe filter or mark_safe
\|safe\b
mark_safe\(
```

#### Vulnerable

```javascript
// Reflected XSS
app.get('/search', (req, res) => {
  res.send(`<h1>Results for: ${req.query.q}</h1>`);
});

// DOM-based XSS
element.innerHTML = userInput;
```

#### Secure

```javascript
// Use a templating engine with auto-escaping
app.get('/search', (req, res) => {
  res.render('search', { query: req.query.q });  // Auto-escaped by template engine
});

// Use textContent instead of innerHTML
element.textContent = userInput;

// React: avoid dangerouslySetInnerHTML; use DOMPurify if needed
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userHtml) }} />
```

---

### 24. Command Injection

**CWE**: CWE-78 (OS Command Injection)
**OWASP**: A05:2025 - Injection
**Severity**: Critical

#### Grep Patterns

```
# Node.js
child_process\.exec\(.*req
child_process\.execSync\(.*req
exec\(.*\+.*req\.(query|body|params)
exec\(`.*\$\{.*req

# Python
os\.system\(.*request
subprocess\.call\(.*request.*shell\s*=\s*True
subprocess\.Popen\(.*request.*shell\s*=\s*True
os\.popen\(
```

#### Vulnerable

```javascript
const { exec } = require('child_process');
app.get('/ping', (req, res) => {
  // Attacker: ?host=127.0.0.1;cat /etc/passwd
  exec(`ping -c 4 ${req.query.host}`, (err, stdout) => {
    res.send(stdout);
  });
});
```

#### Secure

```javascript
const { execFile } = require('child_process');
app.get('/ping', (req, res) => {
  const host = req.query.host;
  // Validate input
  if (!/^[a-zA-Z0-9.\-]+$/.test(host)) {
    return res.status(400).send('Invalid host');
  }
  // execFile does not spawn a shell
  execFile('ping', ['-c', '4', host], (err, stdout) => {
    res.send(stdout);
  });
});
```

---

### 25. Directory Traversal

**CWE**: CWE-22 (Path Traversal)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: High

#### Grep Patterns

```
# User input in file paths
path\.join\(.*req\.(query|body|params)
fs\.readFile\(.*req\.(query|body|params)
sendFile\(.*req\.(query|body|params)
open\(.*request\.(GET|POST|data|args)
os\.path\.join\(.*request
```

#### Vulnerable

```javascript
app.get('/files', (req, res) => {
  // Attacker: ?name=../../../etc/passwd
  const filePath = path.join(__dirname, 'files', req.query.name);
  res.sendFile(filePath);
});
```

#### Secure

```javascript
app.get('/files', (req, res) => {
  const basePath = path.resolve(__dirname, 'files');
  const filePath = path.resolve(basePath, req.query.name);

  // Ensure resolved path is within the base directory
  if (!filePath.startsWith(basePath + path.sep)) {
    return res.status(400).send('Invalid path');
  }

  res.sendFile(filePath);
});
```

---

## QUICK REFERENCE TABLE

| Pattern | CWE | OWASP 2025 | Severity |
|---------|-----|------------|----------|
| Missing CSP | CWE-693 | A02 | High |
| Permissive CORS | CWE-942 | A02 | High |
| Missing HSTS | CWE-319 | A02 | High |
| Missing X-Frame-Options | CWE-1021 | A02 | Medium |
| Missing X-Content-Type-Options | CWE-693 | A02 | Medium |
| Missing Referrer-Policy | CWE-200 | A02 | Medium |
| Missing Permissions-Policy | CWE-693 | A02 | Low |
| Helmet.js not used | CWE-693 | A02 | High |
| Missing CSRF middleware | CWE-352 | A01 | High |
| @csrf_exempt | CWE-352 | A01 | High |
| Missing SameSite cookie | CWE-352 | A01 | Medium |
| SSRF via user input | CWE-918 | A05 | Critical |
| Cloud metadata access | CWE-918 | A05 | Critical |
| Unrestricted file upload | CWE-434 | A06 | Critical |
| Missing file size limits | CWE-770 | A06 | Medium |
| Filename path traversal | CWE-22 | A01 | High |
| Uploads in web directory | CWE-434 | A06 | High |
| Open redirect | CWE-601 | A01 | Medium |
| Missing Secure cookie flag | CWE-614 | A02 | High |
| Missing HttpOnly flag | CWE-1004 | A02 | High |
| Missing SameSite attribute | CWE-352 | A01 | Medium |
| SQL Injection | CWE-89 | A05 | Critical |
| XSS | CWE-79 | A05 | High |
| Command Injection | CWE-78 | A05 | Critical |
| Directory Traversal | CWE-22 | A01 | High |
