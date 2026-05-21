# Python Security Patterns

Reference knowledge base for Cyber Neo Python application security analysis.

---

## FRAMEWORK DETECTION

### Grep Patterns

```
# Django
from\s+django
import\s+django
INSTALLED_APPS
MIDDLEWARE
urlpatterns

# Flask
from\s+flask\s+import
Flask\(__name__\)
@app\.route

# FastAPI
from\s+fastapi\s+import
FastAPI\(\)
@app\.(get|post|put|delete|patch)\(

# Tornado
import\s+tornado
tornado\.web\.Application

# Pyramid
from\s+pyramid
config\.add_route

# aiohttp
from\s+aiohttp\s+import\s+web
aiohttp\.web\.Application

# Starlette
from\s+starlette
Starlette\(

# Sanic
from\s+sanic\s+import
Sanic\(
```

---

## 1. SQL Injection

**CWE**: CWE-89 (SQL Injection)
**OWASP**: A05:2025 - Injection
**Severity**: Critical

### Grep Patterns

```
# f-string / format in SQL
cursor\.execute\(f"
cursor\.execute\(f'
cursor\.execute\(".*%s.*"\s*%
cursor\.execute\(".*\.format\(
\.execute\(f"
\.execute\(f'
\.execute\(".*"\s*\+

# Django ORM bypasses
\.raw\(
\.extra\(
RawSQL\(
connection\.cursor\(\)

# SQLAlchemy
text\(f"
text\(f'
text\(".*\.format\(
engine\.execute\(f"
session\.execute\(f"
db\.session\.execute\(f"

# psycopg2 / pymysql
cursor\.execute\(".*%\(
cursor\.execute\(".*" %
```

### Vulnerable

```python
# f-string injection
user_id = request.args.get('id')
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# Django raw()
User.objects.raw(f"SELECT * FROM auth_user WHERE username = '{name}'")

# Django extra()
queryset.extra(where=[f"name = '{user_input}'"])

# SQLAlchemy text() with formatting
from sqlalchemy import text
db.session.execute(text(f"SELECT * FROM users WHERE email = '{email}'"))

# psycopg2 % formatting
cursor.execute("SELECT * FROM users WHERE id = %s" % user_id)
```

### Secure

```python
# Parameterized query
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# Django ORM
User.objects.filter(username=name)

# Django raw() with params
User.objects.raw("SELECT * FROM auth_user WHERE username = %s", [name])

# SQLAlchemy with bound parameters
from sqlalchemy import text
db.session.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email})

# psycopg2 parameterized
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

---

## 2. Cross-Site Scripting (XSS)

**CWE**: CWE-79 (Cross-site Scripting)
**OWASP**: A05:2025 - Injection
**Severity**: High

### Grep Patterns

```
# Django
mark_safe\(
\|safe
\{%\s*autoescape\s+off\s*%\}
SafeData
format_html\(          # check if user input passed unsanitized

# Flask / Jinja2
Markup\(
\|safe
from\s+markupsafe\s+import\s+Markup

# Mako templates (no auto-escape)
from\s+mako
MakoTemplate\(
Template\(.*\$\{

# Direct HTML response
return\s+HttpResponse\(.*<
return\s+f"<
```

### Vulnerable

```python
# Django mark_safe with user input
from django.utils.safestring import mark_safe
return mark_safe(f"<div>{user_input}</div>")

# Django template: |safe on user data
# {{ user_comment|safe }}

# Flask Markup with user input
from markupsafe import Markup
return Markup(f"<p>{request.args.get('msg')}</p>")

# Mako template (no auto-escaping)
from mako.template import Template
tmpl = Template("<p>${user_input}</p>")
```

### Secure

```python
# Django: use format_html for safe interpolation
from django.utils.html import format_html
return format_html("<div>{}</div>", user_input)

# Django template: auto-escaping is on by default, just use {{ var }}

# Flask: Jinja2 auto-escapes by default, avoid |safe on user data
return render_template("page.html", message=user_input)

# Mako with default_filters
from mako.template import Template
tmpl = Template("<p>${user_input}</p>", default_filters=['h'])
```

---

## 3. Command Injection

**CWE**: CWE-78 (OS Command Injection)
**OWASP**: A05:2025 - Injection
**Severity**: Critical

### Grep Patterns

```
os\.system\(
os\.popen\(
subprocess\.call\(.*shell\s*=\s*True
subprocess\.run\(.*shell\s*=\s*True
subprocess\.Popen\(.*shell\s*=\s*True
subprocess\.check_output\(.*shell\s*=\s*True
commands\.getoutput\(
commands\.getstatusoutput\(
```

### Vulnerable

```python
import os, subprocess

# os.system with user input
os.system(f"ping {user_input}")

# os.popen with user input
os.popen(f"ls {directory}")

# subprocess with shell=True and user input
subprocess.call(f"grep {pattern} /var/log/syslog", shell=True)
subprocess.run(f"convert {filename} output.png", shell=True)
```

### Secure

```python
import subprocess, shlex

# subprocess without shell=True, pass args as list
subprocess.run(["ping", "-c", "4", user_input], shell=False)

# shlex.quote for cases where shell=True is unavoidable
subprocess.run(f"grep {shlex.quote(pattern)} /var/log/syslog", shell=True)

# Best: avoid shell entirely
subprocess.run(["grep", pattern, "/var/log/syslog"])
```

---

## 4. Code Injection

**CWE**: CWE-94 (Code Injection)
**OWASP**: A05:2025 - Injection
**Severity**: Critical

### Grep Patterns

```
eval\(
exec\(
compile\(
__import__\(
importlib\.import_module\(
```

### Vulnerable

```python
# eval with user input
result = eval(request.args.get('expression'))

# exec with user input
exec(request.data.decode())

# __import__ with user input
module = __import__(request.args.get('module'))
```

### Secure

```python
# Use ast.literal_eval for safe evaluation of literals
import ast
result = ast.literal_eval(expression)

# Use allowlists for dynamic imports
ALLOWED_MODULES = {"math", "statistics"}
module_name = request.args.get('module')
if module_name in ALLOWED_MODULES:
    module = importlib.import_module(module_name)

# Use a parser for expressions instead of eval
# e.g., simpleeval, asteval
from simpleeval import simple_eval
result = simple_eval(expression)
```

---

## 5. Insecure Deserialization

**CWE**: CWE-502 (Deserialization of Untrusted Data)
**OWASP**: A08:2025 - Software or Data Integrity Failures
**Severity**: Critical

### Grep Patterns

```
pickle\.loads?\(
pickle\.Unpickler\(
_pickle\.loads\(
cPickle\.loads?\(
yaml\.load\(                  # without Loader=SafeLoader
yaml\.unsafe_load\(
yaml\.full_load\(
marshal\.loads\(
shelve\.open\(
jsonpickle\.decode\(
dill\.loads?\(
```

### Vulnerable

```python
import pickle, yaml

# pickle on untrusted data (arbitrary code execution)
data = pickle.loads(request.data)

# yaml.load without SafeLoader (code execution via !!python/object)
config = yaml.load(request.data)

# yaml.unsafe_load
config = yaml.unsafe_load(user_file.read())

# jsonpickle on untrusted data
import jsonpickle
obj = jsonpickle.decode(request.json['payload'])
```

### Secure

```python
import json, yaml

# Use JSON for untrusted data
data = json.loads(request.data)

# yaml with SafeLoader
config = yaml.load(file_data, Loader=yaml.SafeLoader)
# or even better:
config = yaml.safe_load(file_data)

# For complex objects, use schema validation (marshmallow, pydantic)
from pydantic import BaseModel
class UserData(BaseModel):
    name: str
    age: int
data = UserData.model_validate_json(request.data)
```

---

## 6. Path Traversal

**CWE**: CWE-22 (Path Traversal)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: High

### Grep Patterns

```
open\(.*request
open\(.*user
os\.path\.join\(.*request
os\.path\.join\(.*user
send_file\(
send_from_directory\(
shutil\.(copy|move|rmtree)\(
pathlib.*\/           # user-controlled path segments
```

### Vulnerable

```python
# open() with user input
filename = request.args.get('file')
with open(f"/uploads/{filename}") as f:   # ../../../etc/passwd
    return f.read()

# os.path.join does NOT prevent traversal
path = os.path.join("/uploads", user_filename)  # user_filename = "../../etc/passwd"

# Flask send_file
return send_file(os.path.join(UPLOAD_DIR, request.args['name']))
```

### Secure

```python
from pathlib import Path

# pathlib resolve + is_relative_to
base = Path("/uploads").resolve()
target = (base / user_filename).resolve()
if not target.is_relative_to(base):
    abort(403)
with open(target) as f:
    return f.read()

# Flask send_from_directory (validates internally)
return send_from_directory(UPLOAD_DIR, filename, as_attachment=True)

# os.path.realpath check
real_path = os.path.realpath(os.path.join(BASE_DIR, user_input))
if not real_path.startswith(os.path.realpath(BASE_DIR)):
    abort(403)
```

---

## 7. Server-Side Request Forgery (SSRF)

**CWE**: CWE-918 (Server-Side Request Forgery)
**OWASP**: A05:2025 - Injection
**Severity**: High

### Grep Patterns

```
requests\.(get|post|put|delete|patch|head)\(
urllib\.request\.urlopen\(
urllib\.request\.Request\(
httpx\.(get|post|put|delete|AsyncClient)
aiohttp\.ClientSession\(\)\.get\(
http\.client\.HTTPConnection\(
```

### Vulnerable

```python
import requests

# Direct use of user-supplied URL
url = request.args.get('url')
resp = requests.get(url)  # attacker can reach internal services

# urllib
import urllib.request
urllib.request.urlopen(user_url)

# httpx
import httpx
httpx.get(user_provided_url)
```

### Secure

```python
from urllib.parse import urlparse
import ipaddress, requests

ALLOWED_HOSTS = {"api.example.com", "cdn.example.com"}
BLOCKED_SCHEMES = {"file", "ftp", "gopher"}

def safe_request(url: str):
    parsed = urlparse(url)
    if parsed.scheme in BLOCKED_SCHEMES:
        raise ValueError("Blocked scheme")
    if parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("Host not in allowlist")
    # Block internal IPs
    ip = ipaddress.ip_address(socket.gethostbyname(parsed.hostname))
    if ip.is_private or ip.is_loopback:
        raise ValueError("Internal IP blocked")
    return requests.get(url, timeout=5)
```

---

## 8. Django-Specific Security

**CWE**: Various
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: Medium-Critical (varies)

### Grep Patterns

```
# Production misconfig (Critical)
DEBUG\s*=\s*True
SECRET_KEY\s*=\s*['"]
ALLOWED_HOSTS\s*=\s*\[\s*['"]\*['"]\s*\]
ALLOWED_HOSTS\s*=\s*\[\s*\]

# CSRF (High)
csrf_exempt
CsrfViewMiddleware              # check if REMOVED from MIDDLEWARE

# CORS (Medium)
CORS_ALLOW_ALL_ORIGINS\s*=\s*True
CORS_ORIGIN_ALLOW_ALL\s*=\s*True

# SSL/HSTS (Medium)
SECURE_SSL_REDIRECT\s*=\s*False
SECURE_HSTS_SECONDS\s*=\s*0
SESSION_COOKIE_SECURE\s*=\s*False
SESSION_COOKIE_HTTPONLY\s*=\s*False
CSRF_COOKIE_SECURE\s*=\s*False
SECURE_BROWSER_XSS_FILTER
X_FRAME_OPTIONS

# Admin exposure (Medium)
url.*admin\.site\.urls
path.*admin\.site\.urls
```

### Vulnerable

```python
# settings.py
DEBUG = True
SECRET_KEY = 'my-super-secret-key-12345'
ALLOWED_HOSTS = ['*']
CORS_ALLOW_ALL_ORIGINS = True

# Missing security middleware
MIDDLEWARE = [
    # 'django.middleware.csrf.CsrfViewMiddleware',  # REMOVED!
    'django.middleware.common.CommonMiddleware',
]

# No SSL settings
# SECURE_SSL_REDIRECT missing
# SECURE_HSTS_SECONDS missing
# SESSION_COOKIE_SECURE missing

# views.py
from django.views.decorators.csrf import csrf_exempt
@csrf_exempt
def payment_endpoint(request):
    ...
```

### Secure

```python
# settings.py
import os
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
SECRET_KEY = os.environ['DJANGO_SECRET_KEY']
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True

CORS_ALLOWED_ORIGINS = [
    "https://app.example.com",
]

# CSRF middleware present
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'csp.middleware.CSPMiddleware',
    ...
]
```

---

## 9. Flask-Specific Security

**CWE**: Various
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: Medium-High (varies)

### Grep Patterns

```
app\.run\(.*debug\s*=\s*True
app\.secret_key\s*=\s*['"]
secret_key\s*=\s*['"]
Access-Control-Allow-Origin.*\*
Template\(.*request           # Jinja2 SSTI
render_template_string\(      # SSTI risk
```

### Vulnerable

```python
from flask import Flask, request, render_template_string
app = Flask(__name__)
app.secret_key = 'hardcoded-secret'

# Server-Side Template Injection (SSTI) - Critical
@app.route('/greet')
def greet():
    template = f"Hello {request.args.get('name')}!"
    return render_template_string(template)  # {{7*7}} -> 49

# Debug mode in production
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
```

### Secure

```python
from flask import Flask, render_template
from flask_talisman import Talisman
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter

app = Flask(__name__)
app.secret_key = os.environ['FLASK_SECRET_KEY']

Talisman(app)          # Security headers
CSRFProtect(app)       # CSRF protection
limiter = Limiter(app) # Rate limiting

@app.route('/greet')
def greet():
    name = request.args.get('name')
    return render_template("greet.html", name=name)  # auto-escaped

if __name__ == '__main__':
    app.run(debug=False, host='127.0.0.1')
```

---

## 10. FastAPI-Specific Security

**CWE**: Various
**OWASP**: A01:2025 - Broken Access Control, A02:2025 - Security Misconfiguration
**Severity**: Medium-High

### Grep Patterns

```
@app\.(get|post|put|delete)\(.*\)$   # routes without Depends()
CORSMiddleware.*allow_origins.*\*
allow_origins=\["\*"\]
allow_methods=\["\*"\]
```

### Vulnerable

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])

# No auth dependency on sensitive route
@app.get("/admin/users")
async def list_users():
    return db.get_all_users()

# No input validation
@app.get("/files/{path}")
async def read_file(path: str):
    return open(f"/data/{path}").read()
```

### Secure

```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["https://app.example.com"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_admin(token: str = Depends(oauth2_scheme)):
    user = verify_token(token)
    if not user.is_admin:
        raise HTTPException(status_code=403)
    return user

@app.get("/admin/users")
async def list_users(admin = Depends(get_current_admin)):
    return db.get_all_users()
```

---

## 11. Authentication and Session Security

**CWE**: CWE-916 (Weak Password Hash), CWE-287 (Improper Authentication)
**OWASP**: A07:2025 - Authentication Failures
**Severity**: Critical (passwords), High (JWT/sessions)

### Grep Patterns

```
# Plaintext / weak hashing
hashlib\.md5\(.*password
hashlib\.sha1\(.*password
hashlib\.sha256\(.*password    # unsalted SHA-256 is also weak for passwords
\.hexdigest\(\).*password

# JWT issues
verify\s*=\s*False
algorithms\s*=\s*\[           # check if HS256 with public key (confusion)
jwt\.decode\(.*verify\s*=\s*False
options=\{.*"verify_signature"\s*:\s*False

# Session
session.*url
token.*url
```

### Vulnerable

```python
import hashlib, jwt

# MD5 password hash
hashed = hashlib.md5(password.encode()).hexdigest()

# SHA-256 without salt (rainbow table vulnerable)
hashed = hashlib.sha256(password.encode()).hexdigest()

# JWT without verification
payload = jwt.decode(token, options={"verify_signature": False})

# JWT algorithm confusion
payload = jwt.decode(token, public_key, algorithms=["HS256", "RS256"])
```

### Secure

```python
import bcrypt, jwt

# bcrypt for password hashing
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
if bcrypt.checkpw(password.encode(), stored_hash):
    grant_access()

# argon2 (preferred)
from argon2 import PasswordHasher
ph = PasswordHasher()
hashed = ph.hash(password)
ph.verify(hashed, password)

# JWT with proper verification
payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
# RS256 with public key
payload = jwt.decode(token, public_key, algorithms=["RS256"])
```

---

## 12. Cryptographic Issues

**CWE**: CWE-327 (Broken Crypto), CWE-330 (Insufficient Randomness)
**OWASP**: A04:2025 - Cryptographic Failures
**Severity**: High-Critical

### Grep Patterns

```
# Weak random
import\s+random
random\.(choice|randint|random)\(
# Only flagged if used for tokens/keys/secrets — not for non-security use

# TLS/certificate bypass
_create_unverified_context
verify\s*=\s*False
CERT_NONE
disable_warnings
urllib3\.disable_warnings

# Weak ciphers
DES\.new\(
Blowfish\.new\(
ARC4\.new\(
RC4

# Hardcoded keys
(key|KEY|secret|SECRET|password|PASSWORD)\s*=\s*['"b]
```

### Vulnerable

```python
import random, ssl, requests

# random module for security tokens
token = ''.join(random.choice('abcdef0123456789') for _ in range(32))

# Disable TLS verification
requests.get(url, verify=False)
ctx = ssl._create_unverified_context()

# Hardcoded key
ENCRYPTION_KEY = b'my-secret-key-1234567890123456'
```

### Secure

```python
import secrets, ssl

# secrets module for tokens
token = secrets.token_hex(32)
otp = secrets.token_urlsafe(16)

# Proper TLS
requests.get(url, verify=True)  # default, explicit for clarity
ctx = ssl.create_default_context()

# Key from environment
ENCRYPTION_KEY = os.environ['ENCRYPTION_KEY'].encode()
```

---

## 13. Environment and Configuration

**CWE**: CWE-798 (Hardcoded Credentials), CWE-209 (Error Information Exposure)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: High

### Grep Patterns

```
# Hardcoded secrets
(password|passwd|pwd)\s*=\s*['"]
(api_key|apikey|api_secret)\s*=\s*['"]
(secret_key|SECRET_KEY)\s*=\s*['"]
(database_url|DATABASE_URL)\s*=\s*['"].*:\/\/
(aws_access_key|AWS_ACCESS_KEY)\s*=\s*['"]
(token|TOKEN)\s*=\s*['"][A-Za-z0-9]

# Debug mode
DEBUG\s*=\s*True
debug\s*=\s*True
app\.debug\s*=\s*True

# .env in repo
\.env$              # check .gitignore for .env
```

### Vulnerable

```python
DATABASE_URL = "postgresql://admin:password123@db.example.com:5432/prod"
AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"
API_KEY = "sk-abc123def456"
DEBUG = True
```

### Secure

```python
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
AWS_ACCESS_KEY = os.environ["AWS_ACCESS_KEY_ID"]
API_KEY = os.environ["API_KEY"]
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"
```

---

## 14. Logging Issues

**CWE**: CWE-532 (Information Exposure Through Log Files)
**OWASP**: A09:2025 - Security Logging and Monitoring Failures
**Severity**: Medium

### Grep Patterns

```
log(ging)?\..*password
log(ging)?\..*token
log(ging)?\..*secret
log(ging)?\..*key
log(ging)?\..*credential
print\(.*password
print\(.*token
print\(.*secret
print\(.*api_key
logger\..*(password|token|secret|key|credential)
```

### Vulnerable

```python
import logging
logger = logging.getLogger(__name__)

# Logging credentials
logger.info(f"User login: {username}, password: {password}")
logger.debug(f"API call with token: {api_token}")
print(f"DB connection: {database_url}")  # includes credentials
```

### Secure

```python
import logging
logger = logging.getLogger(__name__)

# Log events, not credentials
logger.info("User login successful", extra={"username": username})
logger.debug("API call initiated", extra={"endpoint": endpoint})

# Mask sensitive data if logging is necessary
def mask(value: str) -> str:
    return value[:4] + "****" if len(value) > 4 else "****"

logger.info(f"Token used: {mask(api_token)}")
```
