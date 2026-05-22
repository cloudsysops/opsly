# Authentication and Authorization Security Patterns

Reference knowledge base for Cyber Neo authentication/authorization analysis.

---

## AUTHENTICATION PATTERNS

### 1. Missing Auth Middleware on Routes

**CWE**: CWE-306 (Missing Authentication for Critical Function)
**OWASP**: A07:2025 - Identification and Authentication Failures
**Severity**: Critical

#### What to grep for

```
# Express.js - routes without auth middleware
app\.(get|post|put|patch|delete)\s*\(\s*['"`][^'"`]+['"`]\s*,\s*(async\s+)?\(?.*\)?\s*=>
router\.(get|post|put|patch|delete)\s*\(\s*['"`][^'"`]+['"`]\s*,\s*(async\s+)?\(?.*\)?\s*=>

# FastAPI - endpoints without Depends(auth)
@app\.(get|post|put|patch|delete)\s*\(
def\s+\w+\((?!.*Depends)

# Django - views without @login_required or permission decorators
def\s+\w+\(request        # (without @login_required above)
class\s+\w+View\(          # (without LoginRequiredMixin)
```

#### Vulnerable (Express.js)

```javascript
// No auth middleware - anyone can access
app.get('/api/admin/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});
```

#### Secure (Express.js)

```javascript
// Auth middleware applied
app.get('/api/admin/users', authenticate, authorize('admin'), async (req, res) => {
  const users = await User.find();
  res.json(users);
});
```

#### Vulnerable (FastAPI)

```python
@app.get("/admin/users")
async def list_users():
    return await User.all()
```

#### Secure (FastAPI)

```python
@app.get("/admin/users")
async def list_users(current_user: User = Depends(get_current_admin_user)):
    return await User.all()
```

#### Vulnerable (Django)

```python
def admin_dashboard(request):
    return render(request, 'admin/dashboard.html')
```

#### Secure (Django)

```python
@login_required
@user_passes_test(lambda u: u.is_staff)
def admin_dashboard(request):
    return render(request, 'admin/dashboard.html')
```

---

### 2. JWT Misconfigurations

**CWE**: CWE-347 (Improper Verification of Cryptographic Signature)
**OWASP**: A07:2025 - Identification and Authentication Failures
**Severity**: Critical

#### What to grep for

```
# Algorithm not pinned (allows "none" algorithm attack)
jwt\.decode\(.*algorithms?\s*=       # Check if algorithms param is present
jwt\.verify\(.*algorithms?\s*:       # Check if algorithms option is set
algorithm.*none
algorithms.*\[.*none

# Missing expiry
jwt\.sign\((?!.*expiresIn)
jwt\.encode\((?!.*exp)

# Token stored in localStorage
localStorage\.setItem.*token
localStorage\.getItem.*token

# Secret too short / hardcoded
jwt\.sign\(.*['"][^'"]{1,20}['"]     # Short hardcoded secrets
```

#### Vulnerable

```javascript
// Algorithm not pinned - attacker can use "none"
const decoded = jwt.verify(token, secret);

// Token in localStorage (XSS can steal it)
localStorage.setItem('token', response.data.token);

// No expiry set
const token = jwt.sign({ userId: user.id }, secret);

// Hardcoded weak secret
const token = jwt.sign(payload, 'mysecret');
```

#### Secure

```javascript
// Algorithm explicitly pinned
const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

// Token in httpOnly cookie
res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });

// Expiry set
const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '1h' });

// Strong secret from environment
const token = jwt.sign(payload, process.env.JWT_SECRET);
```

---

### 3. Session Management Issues

**CWE**: CWE-384 (Session Fixation), CWE-614 (Sensitive Cookie Without Secure Flag)
**OWASP**: A07:2025 - Identification and Authentication Failures
**Severity**: High

#### What to grep for

```
# Missing secure cookie flags
cookie\((?!.*secure)
session\((?!.*secure)
Set-Cookie(?!.*Secure)
Set-Cookie(?!.*HttpOnly)

# Missing session regeneration on login
# Look for login handlers that do NOT call req.session.regenerate or session.cycle_key
def\s+login\(            # then check body for session regeneration

# Express session config
session\(\{               # check for secure, httpOnly, sameSite options

# Django session settings
SESSION_COOKIE_SECURE
SESSION_COOKIE_HTTPONLY
SESSION_COOKIE_SAMESITE
```

#### Vulnerable

```javascript
// Express - insecure session config
app.use(session({
  secret: 'keyboard cat',
  cookie: {}  // No flags set
}));

// No session regeneration after login
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  req.session.userId = user.id;  // Session fixation risk
  res.redirect('/dashboard');
});
```

#### Secure

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 3600000
  },
  resave: false,
  saveUninitialized: false
}));

app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  req.session.regenerate((err) => {
    req.session.userId = user.id;
    res.redirect('/dashboard');
  });
});
```

---

### 4. Password Security

**CWE**: CWE-256 (Plaintext Storage of Password), CWE-328 (Use of Weak Hash)
**OWASP**: A07:2025 - Identification and Authentication Failures
**Severity**: Critical

#### What to grep for

```
# Plaintext password storage
password\s*=\s*req\.body\.password
password\s*=\s*request\.(POST|data)

# Weak hashing algorithms
(?i)(md5|sha1|sha256)\s*\(.*password
hashlib\.(md5|sha1)\(
createHash\(['"]md5['"]|['"]sha1['"]\)

# Missing salt
(?i)hash\(.*password\)    # without salt parameter

# Checking for proper password hashing libraries
bcrypt\.hash
argon2\.hash
pbkdf2
scrypt
```

#### Vulnerable

```python
# Plaintext storage
user.password = request.data['password']
user.save()

# Weak hash (MD5)
import hashlib
hashed = hashlib.md5(password.encode()).hexdigest()

# SHA256 without salt
hashed = hashlib.sha256(password.encode()).hexdigest()
```

#### Secure

```python
# bcrypt
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))

# argon2
from argon2 import PasswordHasher
ph = PasswordHasher()
hashed = ph.hash(password)

# Django built-in (uses PBKDF2 by default)
from django.contrib.auth.hashers import make_password
hashed = make_password(password)
```

---

### 5. OAuth/OIDC Misconfigurations

**CWE**: CWE-287 (Improper Authentication)
**OWASP**: A07:2025 - Identification and Authentication Failures
**Severity**: High

#### What to grep for

```
# Missing state parameter (CSRF in OAuth flow)
authorize_url(?!.*state)
/authorize\?(?!.*state=)

# Redirect URI not validated
redirect_uri\s*=\s*req\.(query|body|params)
callback.*=.*req\.(query|body|params)

# Token endpoint without PKCE
/token(?!.*code_verifier)

# Client secret in frontend code (SPA)
client_secret.*=.*['"]   # in .js/.ts files
```

#### Vulnerable

```javascript
// No state parameter - CSRF vulnerable
const authUrl = `https://auth.example.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;

// Redirect URI from user input
app.get('/callback', (req, res) => {
  const redirectTo = req.query.redirect_uri;
  // ... exchange code, then redirect to unvalidated URL
  res.redirect(redirectTo);
});
```

#### Secure

```javascript
// State parameter for CSRF protection
const state = crypto.randomBytes(32).toString('hex');
req.session.oauthState = state;
const authUrl = `https://auth.example.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${state}`;

// Validate state on callback
app.get('/callback', (req, res) => {
  if (req.query.state !== req.session.oauthState) {
    return res.status(403).send('Invalid state');
  }
  // ... exchange code with PKCE
});
```

---

### 6. MFA Bypass Patterns

**CWE**: CWE-308 (Use of Single-factor Authentication)
**OWASP**: A07:2025 - Identification and Authentication Failures
**Severity**: High

#### What to grep for

```
# MFA check that can be skipped
if.*mfa_enabled.*==.*false.*return
skip.*mfa
bypass.*mfa
mfa.*=.*false

# MFA verification in client-side only
# Look for MFA state managed only in frontend (localStorage, cookies set by JS)

# Missing MFA on sensitive operations
# Look for password change, email change, admin actions without re-authentication
/change-password(?!.*verify-mfa)
/change-email(?!.*verify-mfa)
```

#### Vulnerable

```javascript
// MFA bypass via parameter manipulation
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  if (req.body.skip_mfa || !user.mfaEnabled) {
    return issueToken(user);
  }
  // ... MFA flow
});
```

#### Secure

```javascript
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  if (user.mfaEnabled) {
    // Server-side MFA enforcement, not skippable
    req.session.pendingMFA = user.id;
    return res.json({ requiresMFA: true });
  }
  return issueToken(user);
});
```

---

### 7. Rate Limiting on Auth Endpoints

**CWE**: CWE-307 (Improper Restriction of Excessive Authentication Attempts)
**OWASP**: A07:2025 - Identification and Authentication Failures
**Severity**: High

#### What to grep for

```
# Check for rate limiting middleware on auth routes
/login
/signin
/authenticate
/register
/forgot-password
/reset-password
/verify-otp
/verify-mfa

# Look for rate limiter imports/usage
rateLimit
rate_limit
RateLimiter
slowDown
express-rate-limit
django-ratelimit
flask-limiter
```

#### Vulnerable

```javascript
// No rate limiting on login
app.post('/api/auth/login', async (req, res) => {
  // Brute force possible
  const user = await User.findOne({ email: req.body.email });
  const valid = await bcrypt.compare(req.body.password, user.password);
  // ...
});
```

#### Secure

```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts per window
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  // ...
});
```

---

## AUTHORIZATION PATTERNS

### 8. Missing Authorization Checks on Admin Routes

**CWE**: CWE-862 (Missing Authorization)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: Critical

#### What to grep for

```
# Admin routes without authorization middleware
/admin/
/api/admin/
/management/
/internal/

# Express - check for authorize/isAdmin middleware
router\.(get|post|put|delete)\s*\(\s*['"`]/admin

# Django - admin views without permissions
class\s+\w+Admin\(          # without PermissionRequiredMixin
@permission_required

# FastAPI - admin endpoints without role check
@app\.(get|post)\s*\(\s*['"`]/admin
```

#### Vulnerable

```javascript
// Any authenticated user can access admin endpoint
router.get('/admin/users', authenticate, async (req, res) => {
  const users = await User.find();
  res.json(users);
});
```

#### Secure

```javascript
router.get('/admin/users', authenticate, authorize(['admin']), async (req, res) => {
  const users = await User.find();
  res.json(users);
});

function authorize(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

---

### 9. IDOR (Insecure Direct Object Reference)

**CWE**: CWE-639 (Authorization Bypass Through User-Controlled Key)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: Critical

#### What to grep for

```
# Direct use of user-supplied ID without ownership check
req\.params\.id
req\.params\.userId
req\.query\.id
request\.GET\['id'\]
request\.data\['id'\]

# Database lookups using user-supplied ID without owner filter
\.findById\(req\.params
\.findByPk\(req\.params
\.objects\.get\(id=
SELECT.*WHERE\s+id\s*=
```

#### Vulnerable

```javascript
// User can access any order by changing the ID
app.get('/api/orders/:id', authenticate, async (req, res) => {
  const order = await Order.findById(req.params.id);
  res.json(order);
});
```

```python
# User can view any profile
@app.get("/users/{user_id}")
async def get_user(user_id: int, current_user = Depends(get_current_user)):
    return await User.get(id=user_id)
```

#### Secure

```javascript
// Ownership check: only return order if it belongs to the user
app.get('/api/orders/:id', authenticate, async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.id  // Ownership filter
  });
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});
```

```python
@app.get("/users/{user_id}")
async def get_user(user_id: int, current_user = Depends(get_current_user)):
    if user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden")
    return await User.get(id=user_id)
```

---

### 10. Horizontal Privilege Escalation

**CWE**: CWE-639 (Authorization Bypass Through User-Controlled Key)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: Critical

#### What to grep for

```
# Update/delete operations without ownership verification
\.findByIdAndUpdate\(req\.params
\.findByIdAndDelete\(req\.params
\.update\(.*where.*id.*req\.params
\.destroy\(.*where.*id.*req\.params

# PUT/PATCH/DELETE with ID from URL params
app\.(put|patch|delete)\(.*:id
router\.(put|patch|delete)\(.*:id
```

#### Vulnerable

```javascript
// User A can update User B's profile
app.put('/api/users/:id', authenticate, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, req.body);
  res.json({ message: 'Updated' });
});
```

#### Secure

```javascript
// Only allow users to update their own profile
app.put('/api/users/:id', authenticate, async (req, res) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await User.findByIdAndUpdate(req.params.id, sanitize(req.body));
  res.json({ message: 'Updated' });
});
```

---

### 11. Vertical Privilege Escalation

**CWE**: CWE-269 (Improper Privilege Management)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: Critical

#### What to grep for

```
# User-controlled role assignment
role\s*=\s*req\.body\.role
role.*=.*request\.data
isAdmin.*=.*req\.body
is_staff.*=.*request\.data

# Registration endpoints that accept role parameter
/register.*role
/signup.*role

# Self-service role modification
PUT.*profile.*role
PATCH.*user.*role
```

#### Vulnerable

```javascript
// User can set their own role to admin during registration
app.post('/api/register', async (req, res) => {
  const user = await User.create({
    email: req.body.email,
    password: await bcrypt.hash(req.body.password, 10),
    role: req.body.role  // Attacker sends role: "admin"
  });
  res.json(user);
});

// User can elevate their own role
app.put('/api/users/:id', authenticate, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, req.body);  // req.body includes role
  res.json({ message: 'Updated' });
});
```

#### Secure

```javascript
app.post('/api/register', async (req, res) => {
  const user = await User.create({
    email: req.body.email,
    password: await bcrypt.hash(req.body.password, 10),
    role: 'user'  // Hardcoded default role
  });
  res.json(user);
});

app.put('/api/users/:id', authenticate, async (req, res) => {
  const { email, name } = req.body;  // Allowlist fields, exclude role
  await User.findByIdAndUpdate(req.params.id, { email, name });
  res.json({ message: 'Updated' });
});
```

---

### 12. Missing RBAC Enforcement

**CWE**: CWE-285 (Improper Authorization)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: High

#### What to grep for

```
# Check for authorization middleware presence
authorize
checkPermission
hasPermission
requireRole
isAdmin
isAuthorized
permission_required
has_perm

# Look for routes/endpoints that lack these guards
# Compare route definitions with middleware application

# Django
@permission_required
PermissionRequiredMixin
has_perm\(

# Express
authorize\(
checkRole\(
requirePermission\(
```

#### Vulnerable (Django)

```python
# No permission check
class UserListView(LoginRequiredMixin, ListView):
    model = User
    template_name = 'users/list.html'
```

#### Secure (Django)

```python
class UserListView(LoginRequiredMixin, PermissionRequiredMixin, ListView):
    model = User
    template_name = 'users/list.html'
    permission_required = 'users.view_user'
```

---

### 13. Broken Function-Level Authorization

**CWE**: CWE-285 (Improper Authorization)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: High

#### What to grep for

```
# API endpoints that differ only by HTTP method without separate auth
# GET (read) may be protected but PUT/DELETE (write) is not

# Hidden/undocumented API endpoints
/api/internal/
/api/debug/
/api/test/
/_admin/
/graphql     # Check resolver-level auth

# GraphQL resolvers without auth checks
resolve\w+\(.*context     # Check if context.user is verified
```

#### Vulnerable

```javascript
// GET is protected, but DELETE is not
router.get('/api/documents/:id', authenticate, authorize('reader'), getDocument);
router.delete('/api/documents/:id', authenticate, deleteDocument);  // Missing authorize

// Debug endpoint left exposed
router.get('/api/debug/users', async (req, res) => {
  const users = await User.find().select('+password');
  res.json(users);
});
```

#### Secure

```javascript
router.get('/api/documents/:id', authenticate, authorize('reader'), getDocument);
router.delete('/api/documents/:id', authenticate, authorize('admin'), deleteDocument);

// Remove debug endpoints or protect them
if (process.env.NODE_ENV === 'development') {
  router.get('/api/debug/users', authenticate, authorize('admin'), debugUsers);
}
```

---

## QUICK REFERENCE: CWE/OWASP MAPPING

| Pattern | CWE | OWASP 2025 | Severity |
|---------|-----|------------|----------|
| Missing Auth Middleware | CWE-306 | A07 | Critical |
| JWT Misconfiguration | CWE-347 | A07 | Critical |
| Session Management | CWE-384, CWE-614 | A07 | High |
| Password Security | CWE-256, CWE-328 | A07 | Critical |
| OAuth Misconfiguration | CWE-287 | A07 | High |
| MFA Bypass | CWE-308 | A07 | High |
| Rate Limiting | CWE-307 | A07 | High |
| Missing Admin Auth | CWE-862 | A01 | Critical |
| IDOR | CWE-639 | A01 | Critical |
| Horizontal Escalation | CWE-639 | A01 | Critical |
| Vertical Escalation | CWE-269 | A01 | Critical |
| Missing RBAC | CWE-285 | A01 | High |
| Broken Function Auth | CWE-285 | A01 | High |
