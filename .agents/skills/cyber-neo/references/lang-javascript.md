# JavaScript / Node.js Security Patterns

Reference knowledge base for Cyber Neo security analysis of JavaScript and Node.js projects.

---

## FRAMEWORK DETECTION

### Grep Patterns

```
# Express
"express":\s*"         # package.json
require\(['"]express['"]\)
from\s+['"]express['"]

# Next.js
"next":\s*"            # package.json
next\.config\.(js|mjs|ts)
getServerSideProps|getStaticProps

# React
"react":\s*"
from\s+['"]react['"]
ReactDOM\.render|createRoot

# Vue
"vue":\s*"
from\s+['"]vue['"]
createApp|new Vue

# Angular
"@angular/core"
@Component|@NgModule|@Injectable

# Fastify
"fastify":\s*"
require\(['"]fastify['"]\)

# Koa
"koa":\s*"
require\(['"]koa['"]\)

# NestJS
"@nestjs/core"
@Controller|@Module|@Injectable

# Hapi
"@hapi/hapi"
Hapi\.server|new Hapi\.Server

# Meteor
"meteor"               # .meteor directory
Meteor\.(publish|methods|call)

# Electron
"electron":\s*"
require\(['"]electron['"]\)
BrowserWindow|ipcMain|ipcRenderer
```

---

## SQL INJECTION (CWE-89)

**CWE**: CWE-89 (Improper Neutralization of Special Elements in SQL)
**OWASP**: A05:2025 - Injection
**Severity**: Critical

### Grep Patterns

```
# Raw string concatenation in SQL
(query|execute)\s*\(\s*['"`].*\+\s*
(query|execute)\s*\(\s*`.*\$\{

# Sequelize
sequelize\.query\(
Sequelize\.literal\(
\.query\(.*\$\{

# Knex
\.raw\(.*\$\{
knex\.raw\(

# TypeORM
\.query\(.*\$\{
createQueryBuilder.*\.where\(.*\$\{
getRepository.*\.query\(

# Prisma
\$queryRaw\s*`
\$executeRaw\s*`
Prisma\.sql

# Generic
mysql\.query\(
pool\.query\(
connection\.query\(
```

### Vulnerable

```javascript
// String concatenation
const result = await db.query("SELECT * FROM users WHERE id = " + req.params.id);

// Template literal
const result = await db.query(`SELECT * FROM users WHERE name = '${req.body.name}'`);

// Sequelize raw
const users = await sequelize.query(`SELECT * FROM users WHERE email = '${email}'`);

// Knex raw
const rows = await knex.raw(`SELECT * FROM orders WHERE status = '${status}'`);

// TypeORM
const users = await getRepository(User).query(`SELECT * FROM users WHERE id = ${id}`);

// Prisma
const result = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;
```

### Secure

```javascript
// Parameterized query (mysql2)
const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [req.params.id]);

// Sequelize with bind parameters
const users = await sequelize.query("SELECT * FROM users WHERE email = ?", {
  replacements: [email], type: QueryTypes.SELECT
});

// Knex parameterized
const rows = await knex.raw("SELECT * FROM orders WHERE status = ?", [status]);

// TypeORM parameterized
const users = await getRepository(User).query("SELECT * FROM users WHERE id = $1", [id]);

// Prisma safe tagged template (Prisma.sql)
const result = await prisma.$queryRaw(Prisma.sql`SELECT * FROM users WHERE id = ${id}`);
```

---

## NOSQL INJECTION (CWE-943)

**CWE**: CWE-943 (Improper Neutralization of Special Elements in Data Query Logic)
**OWASP**: A05:2025 - Injection
**Severity**: Critical

### Grep Patterns

```
# MongoDB operator injection
\$gt|\$ne|\$regex|\$where|\$in|\$nin
req\.(body|query|params).*\.(find|findOne|update|delete|aggregate)
\.find\(\s*req\.(body|query)
\.findOne\(\s*\{.*req\.
```

### Vulnerable

```javascript
// Direct user input as query - allows {$gt: ""} to bypass
app.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username, password: req.body.password });
});
// Attacker sends: {"username": "admin", "password": {"$ne": ""}}
```

### Secure

```javascript
app.post('/login', async (req, res) => {
  const username = String(req.body.username); // Force string type
  const password = String(req.body.password);
  const user = await User.findOne({ username, password });
});
// Or use mongo-sanitize
const sanitize = require('mongo-sanitize');
const user = await User.findOne({ username: sanitize(req.body.username) });
```

---

## XSS (CWE-79)

**CWE**: CWE-79 (Improper Neutralization of Input During Web Page Generation)
**OWASP**: A05:2025 - Injection
**Severity**: High

### Grep Patterns

```
# React
dangerouslySetInnerHTML
# DOM manipulation
\.innerHTML\s*=
document\.write\s*\(
# jQuery
\.(html|append|prepend|after|before)\s*\(
# EJS unescaped
<%-
# Handlebars unescaped
\{\{\{
# Vue
v-html
# Server-side rendering
__NEXT_DATA__
res\.(send|write)\(.*req\.(body|query|params)
```

### Vulnerable

```javascript
// React
function Comment({ text }) {
  return <div dangerouslySetInnerHTML={{ __html: text }} />;
}

// DOM
document.getElementById('output').innerHTML = userInput;

// jQuery
$('#content').html(userInput);

// Express template (EJS)
<p>Welcome, <%- username %></p>

// Handlebars
<p>Welcome, {{{username}}}</p>

// Vue
<div v-html="userContent"></div>

// Express response
app.get('/search', (req, res) => {
  res.send(`<p>Results for: ${req.query.q}</p>`);
});
```

### Secure

```javascript
// React - use textContent or sanitize
import DOMPurify from 'dompurify';
function Comment({ text }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text) }} />;
}
// Or simply: <div>{text}</div>  (React auto-escapes)

// EJS escaped output
<p>Welcome, <%= username %></p>

// Handlebars escaped
<p>Welcome, {{username}}</p>

// Express - escape before sending
const escapeHtml = require('escape-html');
app.get('/search', (req, res) => {
  res.send(`<p>Results for: ${escapeHtml(req.query.q)}</p>`);
});
```

---

## COMMAND INJECTION (CWE-78)

**CWE**: CWE-78 (OS Command Injection)
**OWASP**: A05:2025 - Injection
**Severity**: Critical

### Grep Patterns

```
child_process
\.exec\s*\(
\.execSync\s*\(
\.execFile\s*\(
\.spawn\s*\(
shell:\s*true
require\(['"]child_process['"]\)
```

### Vulnerable

```javascript
const { exec } = require('child_process');
app.get('/lookup', (req, res) => {
  exec(`nslookup ${req.query.domain}`, (err, stdout) => res.send(stdout));
});
// Attacker: ?domain=example.com;cat /etc/passwd

const { spawn } = require('child_process');
spawn('cmd', ['/c', userInput], { shell: true }); // shell: true re-enables injection
```

### Secure

```javascript
const { execFile } = require('child_process');
app.get('/lookup', (req, res) => {
  // execFile does not invoke a shell; arguments are passed as array
  execFile('nslookup', [req.query.domain], (err, stdout) => res.send(stdout));
});

// spawn without shell
const { spawn } = require('child_process');
spawn('nslookup', [userInput]); // no shell: true
```

---

## CODE INJECTION (CWE-94)

**CWE**: CWE-94 (Code Injection)
**OWASP**: A05:2025 - Injection
**Severity**: Critical

### Grep Patterns

```
eval\s*\(
new\s+Function\s*\(
setTimeout\s*\(\s*['"`]
setInterval\s*\(\s*['"`]
vm\.runInNewContext
vm\.runInThisContext
vm\.createScript
vm2|isolated-vm
```

### Vulnerable

```javascript
eval(req.body.expression);
const fn = new Function('return ' + req.query.code);
setTimeout("alert(" + userInput + ")", 1000);
vm.runInNewContext(userCode, sandbox);
```

### Secure

```javascript
// Use a safe expression parser instead of eval
const mathjs = require('mathjs');
const result = mathjs.evaluate(req.body.expression);

// Use function references, not strings
setTimeout(() => alert(sanitizedInput), 1000);

// Use vm2 or isolated-vm with strict sandboxing
const { VM } = require('vm2');
const vm = new VM({ timeout: 1000, sandbox: {} });
const result = vm.run(userCode);
```

---

## PATH TRAVERSAL (CWE-22)

**CWE**: CWE-22 (Path Traversal)
**OWASP**: A01:2025 - Broken Access Control
**Severity**: High

### Grep Patterns

```
fs\.(readFile|writeFile|readdir|unlink|stat|access|mkdir|rename)
fs\.promises\.(readFile|writeFile)
path\.join\(.*req\.(body|query|params)
path\.resolve\(.*req\.
express\.static\(
res\.(sendFile|download)\(
createReadStream\(.*req\.
```

### Vulnerable

```javascript
app.get('/file', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.query.name);
  res.sendFile(filePath);
});
// Attacker: ?name=../../../etc/passwd
```

### Secure

```javascript
app.get('/file', (req, res) => {
  const baseDir = path.resolve(__dirname, 'uploads');
  const filePath = path.resolve(baseDir, req.query.name);
  // Ensure resolved path stays within base directory
  if (!filePath.startsWith(baseDir + path.sep)) {
    return res.status(403).send('Forbidden');
  }
  res.sendFile(filePath);
});
```

---

## DESERIALIZATION (CWE-502)

**CWE**: CWE-502 (Deserialization of Untrusted Data)
**OWASP**: A08:2025 - Software or Data Integrity Failures
**Severity**: Critical

### Grep Patterns

```
node-serialize
serialize\(\)|unserialize\(
js-yaml
yaml\.load\(           # unsafe by default in older versions
yaml\.safeLoad\(       # deprecated alias for safe loading
JSON\.parse\(.*req\.
```

### Vulnerable

```javascript
// node-serialize RCE
const serialize = require('node-serialize');
const obj = serialize.unserialize(req.cookies.profile); // allows code execution via IIFE

// js-yaml unsafe load (pre-4.x)
const yaml = require('js-yaml');
const config = yaml.load(userInput); // can instantiate JS objects
```

### Secure

```javascript
// Avoid node-serialize entirely - use JSON

// js-yaml safe schema
const yaml = require('js-yaml');
const config = yaml.load(userInput, { schema: yaml.JSON_SCHEMA });

// JSON.parse with validation
const data = JSON.parse(rawInput);
if (!isValidSchema(data)) throw new Error('Invalid input');
```

---

## SSRF (CWE-918)

**CWE**: CWE-918 (Server-Side Request Forgery)
**OWASP**: A05:2025 - Injection
**Severity**: High

### Grep Patterns

```
fetch\(.*req\.(body|query|params)
axios\.\w+\(.*req\.
http\.get\(.*req\.
http\.request\(.*req\.
got\(.*req\.
request\(.*req\.
new\s+URL\(.*req\.
urllib|node-fetch|axios|got|superagent
```

### Vulnerable

```javascript
app.get('/proxy', async (req, res) => {
  const response = await fetch(req.query.url);
  const data = await response.text();
  res.send(data);
});
// Attacker: ?url=http://169.254.169.254/latest/meta-data/
```

### Secure

```javascript
const { URL } = require('url');
const ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com'];

app.get('/proxy', async (req, res) => {
  const parsed = new URL(req.query.url);
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return res.status(403).send('Host not allowed');
  }
  if (parsed.protocol !== 'https:') {
    return res.status(403).send('HTTPS required');
  }
  // Block private IPs (169.254.x.x, 10.x.x.x, 127.x.x.x, 192.168.x.x)
  const response = await fetch(parsed.toString());
  res.send(await response.text());
});
```

---

## PROTOTYPE POLLUTION

**CWE**: CWE-1321 (Improperly Controlled Modification of Object Prototype Attributes)
**OWASP**: A05:2025 - Injection
**Severity**: High

### Grep Patterns

```
Object\.assign\s*\(\s*\{\}
_\.merge\s*\(
_\.defaultsDeep\s*\(
_\.set\s*\(
deep[-_]?extend
deepmerge
__proto__
constructor\.prototype
\[['"]__proto__['"]\]
\[['"]constructor['"]\]
```

### Vulnerable

```javascript
// Lodash merge with user input
const _ = require('lodash');
const config = {};
_.merge(config, JSON.parse(req.body.settings));
// Attacker sends: {"__proto__": {"isAdmin": true}}

// Object.assign
const defaults = {};
Object.assign(defaults, userInput);
```

### Secure

```javascript
// Use Object.create(null) as base (no prototype chain)
const config = Object.create(null);
Object.assign(config, sanitizedInput);

// Filter dangerous keys
function safeMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    target[key] = source[key];
  }
  return target;
}

// Use Map instead of plain objects for user-controlled keys
const settings = new Map(Object.entries(JSON.parse(req.body.settings)));
```

---

## EXPRESS-SPECIFIC SECURITY

**Severity**: Medium-High (varies by pattern)

### Grep Patterns

```
# Missing security middleware
require\(['"]helmet['"]\)       # should be present
require\(['"]cors['"]\)
require\(['"]express-rate-limit['"]\)
require\(['"]csurf['"]\)

# Dangerous configurations
cors\(\s*\)                     # default = allow all origins
origin:\s*['"]?\*['"]?         # wildcard CORS
express\.static\(.*['"]\.['"]   # serving project root
express\.static\(.*['"]\/['"]
trust\s*proxy.*true            # blindly trusting all proxies

# Missing size limits
express\.json\(\s*\)           # no size limit
express\.urlencoded\(\s*\)     # no size limit

# Session issues
secret:\s*['"][^'"]{1,8}['"]   # short/weak session secret
cookie:.*secure:\s*false
cookie:.*httpOnly:\s*false
```

### Vulnerable

```javascript
const app = express();
app.use(cors());                           // allows all origins
app.use(express.json());                   // no body size limit (DoS risk)
app.use(express.static('.'));              // serves project root including .env
app.set('trust proxy', true);             // trusts any X-Forwarded-For
app.use(session({ secret: 'secret' }));   // weak secret, insecure defaults
```

### Secure

```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

app.use(helmet());
app.use(cors({ origin: ['https://myapp.com'], credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.static(path.join(__dirname, 'public'))); // specific directory
app.set('trust proxy', 'loopback');       // trust only loopback
app.use(session({
  secret: process.env.SESSION_SECRET,     // strong secret from env
  cookie: { secure: true, httpOnly: true, sameSite: 'strict', maxAge: 3600000 },
  resave: false, saveUninitialized: false
}));
```

---

## NEXT.JS-SPECIFIC SECURITY

**Severity**: Medium-High

### Grep Patterns

```
# API routes
pages/api/|app/api/
export\s+(default\s+)?function\s+handler
NextApiRequest|NextApiResponse
# Auth checks missing in API routes
export\s+default\s+(async\s+)?function\s+handler(?!.*getSession)(?!.*getToken)
# Data leaks
getServerSideProps.*return.*props
NEXT_PUBLIC_
# Server Actions
"use server"
# Config
next\.config
```

### Vulnerable

```javascript
// API route without auth
export default async function handler(req, res) {
  const users = await db.query('SELECT * FROM users');
  res.json(users); // no authentication check
}

// Leaking server data via getServerSideProps
export async function getServerSideProps() {
  const user = await getUser();
  return { props: { user } }; // may include sensitive fields like password hash
}

// Environment variable misuse
// .env.local: NEXT_PUBLIC_API_SECRET=sk-xxxxx  (exposed to client)
```

### Secure

```javascript
// API route with auth
import { getServerSession } from 'next-auth';
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const users = await db.query('SELECT id, name, email FROM users');
  res.json(users);
}

// Selective props serialization
export async function getServerSideProps() {
  const user = await getUser();
  return { props: { user: { id: user.id, name: user.name } } }; // pick only safe fields
}

// Keep secrets server-only (no NEXT_PUBLIC_ prefix)
// .env.local: API_SECRET=sk-xxxxx
```

---

## REACT-SPECIFIC SECURITY

**Severity**: Medium-High

### Grep Patterns

```
dangerouslySetInnerHTML
href\s*=.*javascript:
src\s*=\s*\{.*user
window\.location\s*=
```

### Vulnerable

```javascript
// XSS via dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// javascript: protocol in links
<a href={userUrl}>Click here</a>
// Attacker: userUrl = "javascript:alert(document.cookie)"

// Unvalidated image source
<img src={userInput} />  // can trigger requests to attacker-controlled servers
```

### Secure

```javascript
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userComment) }} />

// Validate URL protocol
function SafeLink({ url, children }) {
  const safe = /^https?:\/\//.test(url) ? url : '#';
  return <a href={safe}>{children}</a>;
}
```

---

## AUTHENTICATION AND SESSION (CWE-287, CWE-384)

**CWE**: CWE-287 (Improper Authentication), CWE-384 (Session Fixation)
**OWASP**: A07:2025 - Authentication Failures
**Severity**: High

### Grep Patterns

```
localStorage\.setItem\(.*token
localStorage\.setItem\(.*jwt
localStorage\.getItem\(.*token
jsonwebtoken
jwt\.sign\(
jwt\.verify\(
algorithms:\s*\[
session\.regenerate
express-session
cookie-session
```

### Vulnerable

```javascript
// JWT in localStorage (accessible via XSS)
localStorage.setItem('token', jwt);

// JWT without algorithm pinning
const decoded = jwt.verify(token, secret); // accepts any algorithm including 'none'

// express-session with weak defaults
app.use(session({ secret: 'keyboard cat' }));
```

### Secure

```javascript
// JWT in httpOnly cookie
res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'strict' });

// JWT with pinned algorithm
const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

// express-session hardened
app.use(session({
  secret: process.env.SESSION_SECRET,
  name: '__session',
  cookie: { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 3600000 },
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({ client: redisClient })
}));
// Regenerate session on login
req.session.regenerate((err) => { /* set user data */ });
```

---

## ENVIRONMENT AND CONFIG

**CWE**: CWE-215 (Insertion of Sensitive Information Into Debugging Code)
**OWASP**: A02:2025 - Security Misconfiguration
**Severity**: Medium

### Grep Patterns

```
NODE_ENV
process\.env\.NODE_ENV
DEBUG\s*=
console\.(log|error|warn)\(.*password
console\.(log|error|warn)\(.*secret
console\.(log|error|warn)\(.*token
stack.*trace|err\.stack
sourceMap|devtool.*source-map
productionSourceMap
```

### Vulnerable

```javascript
// Verbose errors in production
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

// Debug mode left on
// DEBUG=* node app.js

// Source maps exposed
// webpack.config.js
module.exports = { devtool: 'source-map' }; // generates .map files in production
```

### Secure

```javascript
// Environment-aware error handler
app.use((err, req, res, next) => {
  console.error(err); // log full error server-side
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// webpack production config
module.exports = { devtool: false }; // no source maps in production

// Disable debug in production
// NODE_ENV=production node app.js
```

---

## DEPENDENCY RISKS

**OWASP**: A03:2025 - Software Supply Chain Failures
**Severity**: High

### Known Risky / Deprecated Packages

```
# Historical supply chain attacks
event-stream               # Compromised in 2018 (cryptocurrency theft)
ua-parser-js               # Compromised in 2021 (cryptominer)
node-ipc                   # Protestware in 2022 (peacenotwar)
colors                     # Sabotaged in 2022 (infinite loop)
faker                      # Sabotaged in 2022 (infinite loop)
coa                        # Compromised in 2021
rc                         # Compromised in 2021

# Deprecated security-relevant packages
request                    # Deprecated, no security patches
csurf                      # Deprecated, BREACH attack concerns
express-validator <6        # Old API, inconsistent validation
```

### Grep Patterns

```
# Check for audit issues
npm audit
yarn audit
# Lock file inspection
package-lock\.json
yarn\.lock
pnpm-lock\.yaml
# Pinning
"dependencies".*"[~^]     # unpinned ranges (^ or ~ prefix)
```

---

## ELECTRON-SPECIFIC SECURITY

**CWE**: CWE-94 (Code Injection)
**Severity**: Critical

### Grep Patterns

```
nodeIntegration:\s*true
contextIsolation:\s*false
webSecurity:\s*false
allowRunningInsecureContent
shell\.openExternal\(
```

### Vulnerable

```javascript
const win = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,     // allows renderer to use Node.js APIs
    contextIsolation: false,   // no boundary between page and Electron
  }
});
win.loadURL(userProvidedUrl); // RCE if URL is attacker-controlled
```

### Secure

```javascript
const win = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js'),
    sandbox: true,
  }
});
// Use contextBridge in preload.js to expose only needed APIs
```
