# Logging Security Patterns

OWASP A09:2025 — Security Logging and Monitoring Failures
Covers sensitive data leakage in logs, log injection, missing security event logging, and logging configuration.

---

## 1. Sensitive Data in Logs

**CWE:** CWE-532 (Insertion of Sensitive Information into Log File), CWE-312 (Cleartext Storage of Sensitive Information)
**OWASP:** A09:2025 (Security Logging and Monitoring Failures)
**Severity:** HIGH

Logged credentials, tokens, and PII persist in log files, log aggregators, SIEM systems, and backups — often with weaker access controls than the application itself.

### Grep Patterns

```
# Passwords
log.*password
logger.*password
console\.log.*password
print.*password
logging\..*password
System\.out\.print.*password
Log\.(info|debug|warn|error).*password

# Tokens / API Keys
log.*token
logger.*token
console\.log.*token
log.*api[_-]?key
logger.*api[_-]?key
console\.log.*api[_-]?key
log.*secret
logger.*secret
console\.log.*secret
log.*bearer
console\.log.*auth

# Session / JWT
log.*session[_-]?id
logger.*session[_-]?id
console\.log.*jwt
log.*cookie
logger.*set-cookie

# PII
log.*ssn
log.*social.security
log.*credit.card
log.*card.number
logger.*email.*@
console\.log.*email

# Request body logging (often contains credentials)
log.*req\.body
logger.*request\.body
console\.log.*req\.body
logging\.debug.*request\.data
logger\.info.*request\.json

# Python f-strings and format strings
logger\.\w+\(f['""].*(?:password|token|secret|key|ssn|credit)
logging\.\w+\(.*\.format\(.*(?:password|token|secret|key)
```

### Vulnerable Code

**JavaScript / Node.js:**
```javascript
// VULNERABLE: Password logged in plain text
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt: user=${username}, pass=${password}`);
  // ...
});

// VULNERABLE: Full request body may contain credentials
app.use((req, res, next) => {
  logger.info('Incoming request', { body: req.body });
  next();
});

// VULNERABLE: Auth header with Bearer token logged
app.use((req, res, next) => {
  logger.debug(`Headers: ${JSON.stringify(req.headers)}`);
  next();
});

// VULNERABLE: JWT logged
const token = jwt.sign(payload, secret);
console.log(`Generated token: ${token}`);
```

**Python:**
```python
# VULNERABLE: Password in log
logger.info(f"User login: {username}, password: {password}")

# VULNERABLE: Token logged
logger.debug(f"API response with token: {api_token}")

# VULNERABLE: Full request logged
logging.debug(f"Request data: {request.data}")

# VULNERABLE: Credit card in log
logger.info(f"Processing payment for card: {card_number}")
```

**Java:**
```java
// VULNERABLE: Credentials in log
logger.info("Authentication attempt with password: " + password);

// VULNERABLE: Session ID logged
logger.debug("Session created: " + session.getId());
```

### Secure Code

**JavaScript / Node.js:**
```javascript
// SECURE: Sensitive fields redacted
const sanitizeBody = (body) => {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'ssn',
                           'creditCard', 'cardNumber', 'cvv', 'authorization'];
  const sanitized = { ...body };
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
};

app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    body: sanitizeBody(req.body)
  });
  next();
});

// SECURE: Only log non-sensitive identifiers
app.post('/login', (req, res) => {
  const { username } = req.body;
  logger.info(`Login attempt for user: ${username}`);
});
```

**Python:**
```python
# SECURE: Structured logging with sensitive field filtering
import logging

class SensitiveFilter(logging.Filter):
    SENSITIVE_PATTERNS = ['password', 'token', 'secret', 'api_key', 'ssn',
                          'credit_card', 'authorization']

    def filter(self, record):
        msg = record.getMessage()
        for pattern in self.SENSITIVE_PATTERNS:
            if pattern.lower() in msg.lower():
                record.msg = "[SENSITIVE DATA REDACTED FROM LOG]"
                record.args = ()
        return True

logger.addFilter(SensitiveFilter())
```

---

## 2. Log Injection

**CWE:** CWE-117 (Improper Output Neutralization for Logs)
**OWASP:** A09:2025, A05:2025 (Injection)
**Severity:** MEDIUM-HIGH

Attackers inject newlines to forge log entries (hiding intrusions, framing users), inject ANSI escape codes to exploit log viewers, or inject format strings to crash log parsers.

### Grep Patterns

```
# User input directly in log messages
logger\.\w+\(.*req\.(params|query|body|headers)\[
console\.log\(.*req\.(params|query|body)
logging\.\w+\(.*request\.(args|form|data|headers)
logger\.\w+\(.*request\.getParameter\(

# String concatenation in logs (format string risk)
logger\.\w+\(.*\+\s*\w+
System\.out\.print.*\+.*getParameter

# f-strings / format strings with user input
logger\.\w+\(f['""].*\{.*request
logging\.\w+\(.*%s.*%\s*\(.*request
```

### Vulnerable Code

**JavaScript:**
```javascript
// VULNERABLE: Newline injection forges log entries
app.get('/search', (req, res) => {
  const query = req.query.q;
  logger.info(`Search query: ${query}`);
  // Attacker sends: q=innocent%0a[2025-04-11] INFO: Admin login successful from 10.0.0.1
  // Log shows two separate entries — second one is forged
});

// VULNERABLE: ANSI escape injection
console.log(`User input: ${userInput}`);
// Attacker sends ANSI codes that manipulate terminal display
// e.g., \x1b[2J clears screen, \x1b[1A moves cursor up
```

**Python:**
```python
# VULNERABLE: Log injection via newlines
username = request.form.get('username')
logger.info(f"Login attempt for: {username}")
# Attacker sends: username=admin\n[2025-04-11] INFO Login successful for admin

# VULNERABLE: format string attack
logging.info("User action: %s" % user_input)
# If user_input contains %s, %d, %x — can crash or leak memory
```

**Java:**
```java
// VULNERABLE: Direct user input in log
String username = request.getParameter("username");
logger.info("Login attempt for: " + username);
```

### Secure Code

**JavaScript:**
```javascript
// SECURE: Sanitize before logging — remove control characters
function sanitizeLogInput(input) {
  if (typeof input !== 'string') return String(input);
  return input
    .replace(/[\r\n]/g, ' ')           // Remove newlines
    .replace(/[\x00-\x1f\x7f]/g, '')   // Remove control characters
    .substring(0, 1000);                // Limit length
}

app.get('/search', (req, res) => {
  logger.info('Search query', { query: sanitizeLogInput(req.query.q) });
});

// SECURE: Structured logging (JSON) inherently prevents injection
// because values are JSON-encoded, newlines become \n literal
const winston = require('winston');
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'app.log' })]
});
```

**Python:**
```python
# SECURE: Parameterized logging (no format string risk)
logger.info("Login attempt for user: %s from IP: %s",
            sanitize(username), request.remote_addr)

# SECURE: Structured logging
import structlog
logger = structlog.get_logger()
logger.info("login_attempt", username=sanitize(username), ip=request.remote_addr)
```

---

## 3. Missing Security Logging

**CWE:** CWE-778 (Insufficient Logging), CWE-223 (Omission of Security-relevant Information)
**OWASP:** A09:2025
**Severity:** HIGH

Without security event logging, breaches go undetected. OWASP requires logging of all authentication, access control, input validation failures, and administrative actions.

### What to Check For (Absence Of)

```
# Authentication events — look for ABSENCE of logging near these patterns
login|authenticate|sign.?in
logout|sign.?out
password.*(change|reset|forgot)
mfa|two.?factor|2fa|otp
failed.*login|login.*fail|invalid.*credentials

# Authorization events
forbidden|unauthorized|403
access.denied|permission.denied
role.*(change|assign|revoke)
privilege.*(escalat|elevat)

# Input validation
validation.*fail|invalid.*input
sanitiz|xss|sqli|inject

# Admin actions
admin|sudo|superuser
user.*(create|delete|modify|update)
config.*(change|update|modify)
```

### Vulnerable Code

**Express (Node.js):**
```javascript
// VULNERABLE: No logging on authentication failure
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await authenticate(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
    // No log entry — brute force attack invisible
  }
  // ...
});

// VULNERABLE: No logging on authorization failure
app.get('/admin/users', requireRole('admin'), (req, res) => {
  // If requireRole silently returns 403, no audit trail
});

// VULNERABLE: No request logging middleware
app.listen(3000);
// No morgan, no custom request logger — zero visibility into traffic
```

**Django (Python):**
```python
# VULNERABLE: No logging on failed login
def login_view(request):
    form = AuthenticationForm(request, data=request.POST)
    if form.is_valid():
        login(request, form.get_user())
        return redirect('/dashboard')
    else:
        return render(request, 'login.html', {'form': form})
        # Silent failure — no log, no alert
```

### Secure Code

**Express (Node.js):**
```javascript
// SECURE: Comprehensive security event logging
app.post('/login', async (req, res) => {
  const { username } = req.body;
  const user = await authenticate(username, req.body.password);

  if (!user) {
    securityLogger.warn('authentication_failed', {
      username,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    rateLimiter.recordFailedAttempt(username, req.ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  securityLogger.info('authentication_success', {
    userId: user.id,
    username,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  // ...
});

// SECURE: Authorization failure logging
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles.includes(role)) {
      securityLogger.warn('authorization_failed', {
        userId: req.user?.id,
        requiredRole: role,
        path: req.path,
        ip: req.ip
      });
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// SECURE: Request logging middleware
app.use(morgan('combined'));  // At minimum
```

**Django (Python):**
```python
# SECURE: Security event logging with django signals
from django.contrib.auth.signals import user_login_failed, user_logged_in

@receiver(user_login_failed)
def log_failed_login(sender, credentials, request, **kwargs):
    security_logger.warning(
        "authentication_failed",
        extra={
            'username': credentials.get('username'),
            'ip': get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT')
        }
    )

@receiver(user_logged_in)
def log_successful_login(sender, user, request, **kwargs):
    security_logger.info(
        "authentication_success",
        extra={'user_id': user.id, 'ip': get_client_ip(request)}
    )
```

### Minimum Security Events to Log

| Event Category | Events | Priority |
|---------------|--------|----------|
| Authentication | Login success/failure, logout, password change/reset, MFA events | CRITICAL |
| Authorization | Access denied, privilege escalation attempts, role changes | CRITICAL |
| Input Validation | Rejected inputs, detected attack patterns (SQLi, XSS) | HIGH |
| Admin Actions | User CRUD, config changes, permission grants | HIGH |
| Data Access | Sensitive data reads, bulk exports, API key generation | HIGH |
| System | Startup/shutdown, dependency failures, rate limit triggers | MEDIUM |

---

## 4. Logging Configuration

**CWE:** CWE-532 (Insertion of Sensitive Information into Log File), CWE-779 (Logging of Excessive Data)
**OWASP:** A09:2025, A05:2025
**Severity:** MEDIUM

Misconfigured logging creates secondary vulnerabilities: world-readable log files expose credentials, unrotated logs cause disk exhaustion (DoS), plaintext transmission exposes log data in transit.

### Grep Patterns

```
# File permissions (check actual file permissions)
chmod\s+[0-7]*[4-7][4-7][4-7]\s+.*\.log
chmod\s+666\s+
chmod\s+777\s+

# Log rotation configuration
logrotate
maxsize|maxFiles|maxSize
rotating|RotatingFileHandler|TimedRotatingFileHandler

# Unencrypted log transport
syslog:\/\/(?!.*tls)
http:\/\/.*log
udp:\/\/.*log

# Console-only logging in production (logs lost on restart)
console\.log
console\.error
console\.warn
```

### Vulnerable Configurations

**Log files world-readable:**
```bash
# VULNERABLE: Anyone on the system can read logs containing secrets
-rw-rw-rw- 1 app app 1.2G /var/log/app/application.log
```

**No log rotation (Node.js):**
```javascript
// VULNERABLE: Log file grows forever — disk exhaustion DoS
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'app.log' })
    // No maxsize, no maxFiles — unbounded growth
  ]
});
```

**No log rotation (Python):**
```python
# VULNERABLE: Single file, no rotation
logging.basicConfig(filename='app.log', level=logging.DEBUG)
# Grows indefinitely, DEBUG level captures everything
```

**Unencrypted log transport:**
```javascript
// VULNERABLE: Logs sent over UDP/HTTP in plaintext
const transport = new winston.transports.Syslog({
  host: 'logserver.internal',
  port: 514,
  protocol: 'udp4'  // Unencrypted, spoofable
});
```

### Secure Configurations

**File permissions:**
```bash
# SECURE: Only the app user and log group can read
-rw-r----- 1 app loggroup 50M /var/log/app/application.log
chmod 640 /var/log/app/*.log
```

**Log rotation (Node.js with winston):**
```javascript
// SECURE: Rotated, size-limited, structured
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '30d',     // Retain 30 days
      zippedArchive: true
    })
  ]
});
```

**Log rotation (Python):**
```python
# SECURE: Rotating handler with size limits
import logging
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler(
    'app.log',
    maxBytes=50_000_000,   # 50MB per file
    backupCount=10         # Keep 10 rotated files
)
handler.setLevel(logging.INFO)  # Not DEBUG in production
formatter = logging.Formatter(
    '%(asctime)s %(levelname)s %(name)s %(message)s'
)
handler.setFormatter(formatter)
```

**Encrypted log transport:**
```javascript
// SECURE: TLS-encrypted syslog
const transport = new winston.transports.Syslog({
  host: 'logserver.internal',
  port: 6514,
  protocol: 'tcp4',
  secureProtocol: 'TLSv1_2_method'
});
```

**Structured logging (recommended):**
```javascript
// SECURE: JSON structured logging — parseable, searchable, injection-resistant
logger.info({
  event: 'user_action',
  userId: user.id,
  action: 'update_profile',
  ip: req.ip,
  timestamp: new Date().toISOString(),
  duration_ms: endTime - startTime
});
```

---

## Summary Table

| Pattern | CWE | OWASP | Severity | Key Risk |
|---------|-----|-------|----------|----------|
| Sensitive Data in Logs | CWE-532, CWE-312 | A09, A02 | HIGH | Credentials/PII leaked to log consumers |
| Log Injection | CWE-117 | A09, A05 | MEDIUM-HIGH | Log forging, evidence tampering, terminal exploits |
| Missing Security Logging | CWE-778, CWE-223 | A09 | HIGH | Breaches go undetected, no forensic evidence |
| Logging Configuration | CWE-532, CWE-779 | A09, A05 | MEDIUM | File exposure, DoS via disk exhaustion |
