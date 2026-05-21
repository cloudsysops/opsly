# Error Handling and Exception Management Patterns

OWASP A10:2025 — Mishandling of Exceptional Conditions, A02:2025 — Security Misconfiguration
Primary focus: preventing information disclosure through error handling and ensuring robust exception management.

---

## 1. Stack Trace Exposure

**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
**OWASP:** A10:2025, A02:2025 (Security Misconfiguration)
**Severity:** HIGH

Exposing stack traces to end users reveals internal paths, library versions, database schemas, and application architecture — all useful for crafting targeted attacks.

### Grep Patterns

```
# Express / Node.js
err\.stack
res\.send\(.*err
res\.json\(.*error:.*err
res\.status\(\d+\)\.send\(.*err

# Django
DEBUG\s*=\s*True
TEMPLATE_DEBUG\s*=\s*True

# Flask
app\.run\(.*debug\s*=\s*True
app\.debug\s*=\s*True

# FastAPI
debug\s*=\s*True

# Spring Boot
server\.error\.include-stacktrace\s*=\s*always
server\.error\.include-message\s*=\s*always

# General
stackTrace|stack_trace|stacktrace
traceback\.format_exc\(\)
traceback\.print_exc\(\)
```

### Vulnerable Code

**Express (Node.js):**
```javascript
// VULNERABLE: Stack trace sent directly to client
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,       // Exposes internal paths, line numbers
    details: err.toString() // May contain sensitive context
  });
});
```

**Django (Python):**
```python
# settings.py — VULNERABLE in production
DEBUG = True                # Full debug page with traceback, local vars, settings
TEMPLATE_DEBUG = True       # Detailed template error pages
```

**Flask (Python):**
```python
# VULNERABLE: Debug mode in production
app = Flask(__name__)
app.run(debug=True)   # Interactive debugger accessible remotely
app.debug = True       # Same effect
```

**FastAPI (Python):**
```python
# VULNERABLE: Debug mode exposes tracebacks
app = FastAPI(debug=True)
```

### Secure Code

**Express (Node.js):**
```javascript
// SECURE: Generic error response, detailed logging server-side
app.use((err, req, res, next) => {
  const errorId = crypto.randomUUID();
  logger.error({ errorId, err: err.message, stack: err.stack, url: req.url });

  res.status(500).json({
    error: 'An internal error occurred.',
    errorId: errorId  // Reference ID for support, not internals
  });
});
```

**Django (Python):**
```python
# settings.py — SECURE for production
DEBUG = False
TEMPLATE_DEBUG = False
ALLOWED_HOSTS = ['yourdomain.com']

# Custom error views
handler500 = 'myapp.views.custom_500'
handler404 = 'myapp.views.custom_404'
```

**Flask (Python):**
```python
# SECURE: Debug off, custom error handlers
app = Flask(__name__)
app.debug = False

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f"Internal error: {error}")
    return render_template('500.html'), 500
```

---

## 2. Empty / Silent Catches

**CWE:** CWE-390 (Detection of Error Condition Without Action), CWE-391 (Unchecked Error Condition)
**OWASP:** A10:2025
**Severity:** MEDIUM-HIGH

Silent catch blocks mask security-relevant errors — failed authentication checks, authorization bypasses, data corruption, and injection attempts can all go unnoticed.

### Grep Patterns

```
# JavaScript / TypeScript
catch\s*\(\s*\w*\s*\)\s*\{\s*\}
catch\s*\(\s*\w+\s*\)\s*\{\s*\/\/
\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)
\.catch\(\s*\(\)\s*=>\s*null\s*\)
\.catch\(\s*\(\)\s*=>\s*undefined\s*\)

# Python
except\s*:\s*pass
except\s+\w+\s*:\s*pass
except\s+Exception\s*(as\s+\w+)?\s*:\s*pass

# Java
catch\s*\(\s*\w+\s+\w+\s*\)\s*\{\s*\}
catch\s*\(\s*Exception\s+\w+\s*\)\s*\{\s*\}

# Go (ignoring errors)
_\s*,?\s*:?=\s*\w+\(
```

### Vulnerable Code

**JavaScript:**
```javascript
// VULNERABLE: Security error silently swallowed
try {
  await verifyAuthToken(token);
} catch (e) {}  // Authentication failure goes unnoticed

// VULNERABLE: Promise rejection silently consumed
fetchUserPermissions(userId).catch(() => {});

// VULNERABLE: Generic catch hiding real issues
try {
  const data = JSON.parse(userInput);
  await processData(data);
} catch (e) {
  // Silently ignoring could hide injection or data corruption
}
```

**Python:**
```python
# VULNERABLE: Broad exception silently swallowed
try:
    user = authenticate(username, password)
except:
    pass  # Failed auth attempt invisible to monitoring

# VULNERABLE: Specific but still silent
try:
    validate_csrf_token(request)
except InvalidTokenError:
    pass  # CSRF bypass undetected
```

### Secure Code

**JavaScript:**
```javascript
// SECURE: Log, handle, and propagate appropriately
try {
  await verifyAuthToken(token);
} catch (error) {
  logger.warn('Authentication token verification failed', {
    error: error.message,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  throw new AuthenticationError('Invalid or expired token');
}
```

**Python:**
```python
# SECURE: Specific exception, logged, handled
try:
    user = authenticate(username, password)
except AuthenticationError as e:
    logger.warning("Authentication failed for user %s from IP %s: %s",
                   username, request.remote_addr, str(e))
    security_monitor.record_failed_login(username, request.remote_addr)
    raise
```

---

## 3. Debug Mode in Production

**CWE:** CWE-489 (Active Debug Code), CWE-215 (Insertion of Sensitive Information Into Debug Code)
**OWASP:** A02:2025 (Security Misconfiguration)
**Severity:** CRITICAL

Debug modes in production expose interactive debuggers (RCE in Flask), detailed tracebacks, environment variables, database queries, source code, and internal API endpoints.

### Grep Patterns

```
# Django
DEBUG\s*=\s*True
TEMPLATE_DEBUG\s*=\s*True
INTERNAL_IPS\s*=.*\*

# Flask
app\.run\(.*debug\s*=\s*True
app\.debug\s*=\s*True
FLASK_DEBUG\s*=\s*1
FLASK_ENV\s*=\s*development

# Node.js
NODE_ENV\s*(!==|!=)\s*['"]production['"]
NODE_ENV\s*=\s*['"]development['"]

# React / Vue / frontend
process\.env\.NODE_ENV\s*!==\s*['"]production['"]
__VUE_PROD_DEVTOOLS__\s*=\s*true

# Source maps
devtool:\s*['"]source-map['"]
devtool:\s*['"]eval-source-map['"]
devtool:\s*['"]cheap-module-source-map['"]
\.map$

# Spring Boot
management\.endpoints\.web\.exposure\.include\s*=\s*\*
management\.endpoint\.env\.enabled\s*=\s*true
spring\.devtools\.restart\.enabled\s*=\s*true

# General
VERBOSE_ERROR\s*=\s*true
SHOW_DEBUG\s*=\s*true
```

### Vulnerable Code

**Django:**
```python
# settings.py — VULNERABLE
DEBUG = True
TEMPLATE_DEBUG = True
# Exposes: full traceback, local variables, SQL queries, settings
```

**Flask:**
```python
# VULNERABLE: Werkzeug debugger = Remote Code Execution
app.run(host='0.0.0.0', debug=True)
# The interactive debugger allows arbitrary Python execution
# Even with PIN protection, it can be brute-forced
```

**Node.js:**
```javascript
// VULNERABLE: Conditional that never triggers in practice
if (process.env.NODE_ENV !== 'production') {
  app.use(errorHandler({ dumpExceptions: true, showStack: true }));
}
// If NODE_ENV is never explicitly set, this runs in production
```

**Webpack (React/Vue):**
```javascript
// webpack.config.js — VULNERABLE in production
module.exports = {
  mode: 'development',  // Unminified, readable source
  devtool: 'source-map' // Full source maps shipped to browser
};
```

**Spring Boot:**
```yaml
# application.yml — VULNERABLE
management:
  endpoints:
    web:
      exposure:
        include: "*"  # Exposes /actuator/env, /actuator/heapdump, etc.
  endpoint:
    env:
      enabled: true   # Environment variables including secrets
```

### Secure Code

**Django:**
```python
# settings.py — SECURE
DEBUG = False
TEMPLATE_DEBUG = False
ALLOWED_HOSTS = ['app.example.com']
```

**Flask:**
```python
# SECURE: Debug off, proper WSGI server
app = Flask(__name__)
app.debug = False
# Run with: gunicorn -w 4 app:app
```

**Webpack:**
```javascript
// webpack.config.js — SECURE for production
module.exports = {
  mode: 'production',
  devtool: false,  // No source maps in production
  // Or: devtool: 'hidden-source-map' if you need maps for error tracking only
};
```

**Spring Boot:**
```yaml
# application.yml — SECURE
management:
  endpoints:
    web:
      exposure:
        include: "health,info"  # Only safe endpoints
  endpoint:
    env:
      enabled: false
    heapdump:
      enabled: false
```

---

## 4. Missing Error Boundaries

**CWE:** CWE-755 (Improper Handling of Exceptional Conditions), CWE-248 (Uncaught Exception)
**OWASP:** A10:2025
**Severity:** MEDIUM

Unhandled exceptions can crash the process, cause denial of service, leak information via default error pages, or leave the application in an inconsistent security state.

### Grep Patterns

```
# React — missing ErrorBoundary
# Look for: components that render children but no componentDidCatch
componentDidCatch
getDerivedStateFromError
ErrorBoundary
react-error-boundary

# Node.js — missing global handlers
process\.on\(\s*['"]uncaughtException['"]
process\.on\(\s*['"]unhandledRejection['"]

# Browser — unhandled promise rejections
window\.addEventListener\(\s*['"]unhandledrejection['"]

# Python — missing global exception handler
sys\.excepthook
atexit\.register

# General — unhandled async errors
await\s+\w+\(  # (check if wrapped in try/catch)
\.then\(        # (check if .catch() follows)
```

### Vulnerable Code

**React:**
```jsx
// VULNERABLE: No error boundary — unhandled render error crashes entire app
function App() {
  return (
    <div>
      <Header />
      <UserProfile />   {/* If this throws, entire app unmounts */}
      <Dashboard />
    </div>
  );
}
```

**Node.js:**
```javascript
// VULNERABLE: No global handlers — process crashes on unhandled errors
const app = express();
app.listen(3000);
// An unhandled promise rejection will crash the process in Node 15+
// An uncaught exception always crashes the process
```

**Unhandled Promise Rejections:**
```javascript
// VULNERABLE: No .catch(), no try/catch around await
async function handleRequest(req, res) {
  const data = await fetchExternalAPI(req.params.id);  // If this rejects?
  const processed = await transformData(data);          // Unhandled
  res.json(processed);
}
```

### Secure Code

**React:**
```jsx
// SECURE: Error boundary catches render errors
class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    errorReporter.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return <FallbackUI />;
    }
    return this.props.children;
  }
}

function App() {
  return (
    <AppErrorBoundary>
      <Header />
      <ErrorBoundary fallback={<ProfileError />}>
        <UserProfile />
      </ErrorBoundary>
      <ErrorBoundary fallback={<DashboardError />}>
        <Dashboard />
      </ErrorBoundary>
    </AppErrorBoundary>
  );
}
```

**Node.js:**
```javascript
// SECURE: Global handlers prevent silent crashes
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception — shutting down', { error: error.message, stack: error.stack });
  // Perform graceful shutdown
  server.close(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
  // In production, treat as fatal
  throw reason;
});
```

**Express with async error handling:**
```javascript
// SECURE: Async errors caught and forwarded to error middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/api/data/:id', asyncHandler(async (req, res) => {
  const data = await fetchExternalAPI(req.params.id);
  const processed = await transformData(data);
  res.json(processed);
}));

// Centralized error handler
app.use((err, req, res, next) => {
  const errorId = crypto.randomUUID();
  logger.error({ errorId, err });
  res.status(500).json({ error: 'Internal error', errorId });
});
```

---

## Summary Table

| Pattern | CWE | OWASP | Severity | Key Risk |
|---------|-----|-------|----------|----------|
| Stack Trace Exposure | CWE-209 | A02, A10 | HIGH | Info disclosure enabling targeted attacks |
| Empty/Silent Catches | CWE-390, CWE-391 | A10 | MEDIUM-HIGH | Security failures go undetected |
| Debug Mode in Production | CWE-489, CWE-215 | A02 | CRITICAL | RCE (Flask), full source/config disclosure |
| Missing Error Boundaries | CWE-755, CWE-248 | A10 | MEDIUM | DoS, inconsistent security state |
