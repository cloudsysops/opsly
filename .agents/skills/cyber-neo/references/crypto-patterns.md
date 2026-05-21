# Cryptographic Security Patterns

Reference knowledge base for Cyber Neo cryptographic analysis.

---

## 1. Weak Hash Algorithms

**CWE**: CWE-328 (Use of Weak Hash), CWE-916 (Use of Password Hash With Insufficient Computational Effort)
**OWASP**: A04:2025 - Cryptographic Failures
**Severity**: Critical (for passwords), High (for integrity)

### Grep Patterns

```
# JavaScript/Node.js
createHash\(['"]md5['"]\)
createHash\(['"]sha1['"]\)
crypto\.createHash\(['"]md5
crypto\.createHash\(['"]sha1

# Python
hashlib\.md5\(
hashlib\.sha1\(
md5\.new\(
import\s+md5
from\s+hashlib\s+import\s+md5
from\s+hashlib\s+import\s+sha1

# General
(?i)\.md5\(
(?i)\.sha1\(
(?i)MD5\.Create
(?i)SHA1\.Create
(?i)DigestUtils\.md5
(?i)DigestUtils\.sha1
```

### Vulnerable (JavaScript)

```javascript
const crypto = require('crypto');
// MD5 for password hashing - broken
const hash = crypto.createHash('md5').update(password).digest('hex');

// SHA1 for signatures - collision-prone
const signature = crypto.createHash('sha1').update(data).digest('hex');
```

### Secure (JavaScript)

```javascript
// For passwords: use bcrypt or argon2
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 12);

// For integrity: use SHA-256 or SHA-3
const hash = crypto.createHash('sha256').update(data).digest('hex');

// For HMAC signatures
const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex');
```

### Vulnerable (Python)

```python
import hashlib
# MD5 for password - trivially crackable
hashed = hashlib.md5(password.encode()).hexdigest()

# SHA1 for file integrity - collision attacks known since 2017
file_hash = hashlib.sha1(file_data).hexdigest()
```

### Secure (Python)

```python
# For passwords
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))

# or argon2 (recommended)
from argon2 import PasswordHasher
ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
hashed = ph.hash(password)

# For integrity
import hashlib
file_hash = hashlib.sha256(file_data).hexdigest()
```

---

## 2. Weak Encryption Algorithms and Modes

**CWE**: CWE-327 (Use of Broken or Risky Cryptographic Algorithm)
**OWASP**: A04:2025 - Cryptographic Failures
**Severity**: Critical

### Grep Patterns

```
# DES
(?i)DES(?!ede|3)          # DES but not 3DES/DESede
(?i)createCipher.*des\b
(?i)DES\.new\(
(?i)algorithm.*=.*['"]des['"]

# RC4
(?i)RC4
(?i)ARC4
(?i)arcfour

# 3DES (Triple DES) - deprecated
(?i)3?DES-?EDE
(?i)triple.?des
(?i)des-ede3

# ECB mode (no diffusion, patterns visible in ciphertext)
(?i)ECB
(?i)AES.*ECB
(?i)mode.*=.*ECB
(?i)createCipher\(          # Node.js createCipher uses ECB-like behavior
(?i)AES/ECB

# Blowfish with small key
(?i)blowfish
(?i)BF-ECB
```

### Vulnerable (JavaScript)

```javascript
// DES encryption - 56-bit key, trivially breakable
const cipher = crypto.createCipheriv('des-ecb', key, '');

// RC4 - biased output, broken for TLS
const cipher = crypto.createCipheriv('rc4', key, '');

// AES in ECB mode - patterns in plaintext visible in ciphertext
const cipher = crypto.createCipheriv('aes-128-ecb', key, '');

// Deprecated createCipher (uses MD5-derived key, no IV)
const cipher = crypto.createCipher('aes-256-cbc', password);
```

### Secure (JavaScript)

```javascript
// AES-256-GCM (authenticated encryption)
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
const tag = cipher.getAuthTag();
// Store: iv + tag + encrypted

// ChaCha20-Poly1305 (authenticated encryption, constant-time)
const cipher = crypto.createCipheriv('chacha20-poly1305', key, nonce, {
  authTagLength: 16
});
```

### Vulnerable (Python)

```python
from Crypto.Cipher import DES, ARC4, AES

# DES
cipher = DES.new(key, DES.MODE_ECB)

# RC4
cipher = ARC4.new(key)

# AES-ECB
cipher = AES.new(key, AES.MODE_ECB)
```

### Secure (Python)

```python
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes

# AES-GCM
key = get_random_bytes(32)  # 256-bit key
nonce = get_random_bytes(12)
cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
ciphertext, tag = cipher.encrypt_and_digest(data)
```

---

## 3. Hardcoded Encryption Keys and IVs

**CWE**: CWE-321 (Use of Hard-coded Cryptographic Key)
**OWASP**: A04:2025 - Cryptographic Failures
**Severity**: Critical

### Grep Patterns

```
# Hardcoded keys (hex or base64 strings assigned to key variables)
(?i)(encryption_?key|secret_?key|aes_?key|crypto_?key)\s*=\s*['"][A-Za-z0-9+/=]{16,}['"]
(?i)(encryption_?key|secret_?key|aes_?key|crypto_?key)\s*=\s*Buffer\.from\(
(?i)(encryption_?key|secret_?key|aes_?key|crypto_?key)\s*=\s*b['"]

# Hardcoded IVs (initialization vectors)
(?i)(iv|nonce|initialization.?vector)\s*=\s*['"][A-Fa-f0-9]{16,}['"]
(?i)(iv|nonce)\s*=\s*Buffer\.from\(
(?i)(iv|nonce)\s*=\s*b['"]

# Zero IV / null IV
(?i)iv\s*=\s*['"]0{16,}['"]
(?i)iv\s*=\s*Buffer\.alloc\(
(?i)iv\s*=\s*b'\\x00
(?i)\x00{8,}
```

### Vulnerable

```javascript
// Hardcoded key
const ENCRYPTION_KEY = 'mySecretKey12345mySecretKey12345';
const IV = '1234567890123456';

const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
```

### Secure

```javascript
// Key from environment or key management service
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

// Random IV for each encryption operation
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
// Prepend IV to ciphertext for decryption
```

---

## 4. Insecure Random Number Generation

**CWE**: CWE-338 (Use of Cryptographically Weak PRNG)
**OWASP**: A04:2025 - Cryptographic Failures
**Severity**: High

### Grep Patterns

```
# JavaScript
Math\.random\(
# Check context: Math.random for token generation, passwords, crypto is insecure

# Python
(?i)import\s+random\b           # stdlib random (not for security)
random\.random\(
random\.randint\(
random\.choice\(
random\.sample\(
# Check context: used for tokens, passwords, session IDs, nonces

# General
(?i)rand\(\)
(?i)srand\(
```

### Vulnerable (JavaScript)

```javascript
// Math.random for token generation - predictable
function generateToken() {
  return Math.random().toString(36).substring(2);
}

// Math.random for session ID
const sessionId = Math.random().toString(16).slice(2);
```

### Secure (JavaScript)

```javascript
const crypto = require('crypto');

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// For UUIDs
const { randomUUID } = require('crypto');
const id = randomUUID();
```

### Vulnerable (Python)

```python
import random
# stdlib random is Mersenne Twister - predictable after 624 observations
token = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=32))
otp = random.randint(100000, 999999)
```

### Secure (Python)

```python
import secrets
token = secrets.token_hex(32)
otp = secrets.randbelow(900000) + 100000

# Or for URL-safe tokens
url_token = secrets.token_urlsafe(32)
```

---

## 5. Missing or Improper TLS Verification

**CWE**: CWE-295 (Improper Certificate Validation)
**OWASP**: A04:2025 - Cryptographic Failures
**Severity**: Critical

### Grep Patterns

```
# Python requests
verify\s*=\s*False
VERIFY_SSL\s*=\s*False

# Python urllib3
urllib3\.disable_warnings
InsecureRequestWarning

# Node.js
rejectUnauthorized\s*:\s*false
NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]
process\.env\.NODE_TLS_REJECT_UNAUTHORIZED
agent.*rejectUnauthorized

# General
(?i)ssl_?verify\s*=\s*(false|0|no)
(?i)insecure
(?i)verify_?ssl\s*=\s*False
(?i)check_?hostname\s*=\s*False
(?i)CERT_NONE
```

### Vulnerable (Python)

```python
import requests

# Disables all certificate verification - MITM possible
response = requests.get('https://api.example.com', verify=False)

# Suppressing the warning makes it worse
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
```

### Secure (Python)

```python
import requests

# Default behavior verifies certificates
response = requests.get('https://api.example.com')

# Custom CA bundle if needed
response = requests.get('https://api.example.com', verify='/path/to/ca-bundle.crt')
```

### Vulnerable (JavaScript)

```javascript
// Disables TLS verification for ALL connections in the process
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Per-request disable
const agent = new https.Agent({ rejectUnauthorized: false });
axios.get('https://api.example.com', { httpsAgent: agent });
```

### Secure (JavaScript)

```javascript
// Default behavior verifies certificates
axios.get('https://api.example.com');

// Custom CA if needed
const agent = new https.Agent({
  ca: fs.readFileSync('/path/to/ca.pem')
});
axios.get('https://api.example.com', { httpsAgent: agent });
```

---

## 6. Weak TLS Versions

**CWE**: CWE-326 (Inadequate Encryption Strength)
**OWASP**: A04:2025 - Cryptographic Failures
**Severity**: High

### Grep Patterns

```
# Explicit weak TLS versions
(?i)SSLv2
(?i)SSLv3
(?i)TLSv1\b           # TLS 1.0
(?i)TLSv1\.0
(?i)TLSv1\.1
(?i)TLS_1_0
(?i)TLS_1_1

# Protocol configuration
(?i)ssl_version\s*=
(?i)PROTOCOL_TLSv1\b
(?i)PROTOCOL_TLSv1_1
(?i)PROTOCOL_SSLv23     # Allows downgrade
(?i)secureProtocol.*TLSv1_method
(?i)minVersion.*TLSv1\b
(?i)min_tls_version.*1\.0
```

### Vulnerable (Python)

```python
import ssl
# SSLv3 - POODLE attack
context = ssl.SSLContext(ssl.PROTOCOL_SSLv23)

# TLS 1.0 - BEAST attack, deprecated
context = ssl.SSLContext(ssl.PROTOCOL_TLSv1)
```

### Secure (Python)

```python
import ssl
context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
context.minimum_version = ssl.TLSVersion.TLSv1_2
# Or for maximum security:
context.minimum_version = ssl.TLSVersion.TLSv1_3
```

### Vulnerable (JavaScript)

```javascript
const tls = require('tls');
// Allows TLS 1.0
const server = tls.createServer({
  minVersion: 'TLSv1',
  // ...
});
```

### Secure (JavaScript)

```javascript
const tls = require('tls');
const server = tls.createServer({
  minVersion: 'TLSv1.2',
  // ...
});
```

---

## 7. Missing Certificate Pinning

**CWE**: CWE-295 (Improper Certificate Validation)
**OWASP**: A04:2025 - Cryptographic Failures
**Severity**: Medium

### Grep Patterns

```
# Look for absence of pinning in mobile/API clients
# React Native / mobile apps
fetch\(.*https://
axios\.\w+\(.*https://
# If no certificate pinning config found in mobile app, flag it

# Check for pinning libraries
(?i)ssl.?pin
(?i)cert.?pin
(?i)TrustKit
(?i)public.?key.?pin
```

### Notes

Certificate pinning is primarily important for mobile applications and high-security API clients. For server-to-server communication, standard TLS verification with a trusted CA is typically sufficient. Pinning prevents MITM attacks even when a rogue CA certificate is trusted by the device.

---

## 8. Improper Key Storage

**CWE**: CWE-321 (Use of Hard-coded Cryptographic Key), CWE-522 (Insufficiently Protected Credentials)
**OWASP**: A04:2025 - Cryptographic Failures
**Severity**: Critical

### Grep Patterns

```
# Keys in source code
(?i)(private_?key|secret_?key|encryption_?key|signing_?key)\s*=\s*['"]
(?i)BEGIN\s+(RSA\s+)?PRIVATE\s+KEY

# Keys in config files committed to repo
# Check .gitignore for: *.pem, *.key, *.p12, *.pfx, *.jks

# Unprotected key files
\.pem$
\.key$
\.p12$
\.pfx$
\.jks$

# Key material in environment files committed to repo
\.env$              # Should be in .gitignore
\.env\.local$
\.env\.production$
```

### Vulnerable

```javascript
// Private key hardcoded in source
const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds...
-----END RSA PRIVATE KEY-----`;

// Key read from unprotected file in repo
const key = fs.readFileSync('./keys/private.pem');
```

### Secure

```javascript
// Key from environment variable
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Key from a secrets manager
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();
const [version] = await client.accessSecretVersion({ name: 'projects/my-project/secrets/private-key/versions/latest' });
const privateKey = version.payload.data.toString();

// Key from vault
const vault = require('node-vault')();
const { data } = await vault.read('secret/data/myapp/keys');
const privateKey = data.data.privateKey;
```

---

## 9. Weak Key Lengths

**CWE**: CWE-326 (Inadequate Encryption Strength)
**OWASP**: A04:2025 - Cryptographic Failures
**Severity**: High

### Grep Patterns

```
# RSA key generation with small key size
(?i)generateKeyPair.*rsa.*modulusLength.*(?:512|768|1024)\b
(?i)RSA\.generate\(\s*(?:512|768|1024)\s*\)
(?i)rsa_key_size.*=\s*(?:512|768|1024)
(?i)genrsa\s+(?:512|768|1024)

# AES with weak key size (< 128 bit)
(?i)aes-(?:64|96)\b

# Diffie-Hellman with small prime
(?i)createDiffieHellman\(\s*(?:512|768|1024)\s*\)
(?i)DH.*key.*(?:512|768|1024)

# HMAC with short key
(?i)createHmac.*['"][^'"]+['"],\s*['"][^'"]{1,15}['"]
```

### Vulnerable

```javascript
// RSA 1024-bit - factorable with modern resources
const { generateKeyPairSync } = require('crypto');
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 1024,
});

// DH with 1024-bit prime
const dh = crypto.createDiffieHellman(1024);
```

### Secure

```javascript
// RSA 2048-bit minimum (4096 recommended)
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// ECDSA (equivalent security to RSA-3072 at 256-bit)
const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
});

// DH with 2048-bit prime minimum
const dh = crypto.createDiffieHellman(2048);
```

### Vulnerable (Python)

```python
from Crypto.PublicKey import RSA
# 1024-bit RSA - insufficient
key = RSA.generate(1024)
```

### Secure (Python)

```python
from Crypto.PublicKey import RSA
# 4096-bit RSA
key = RSA.generate(4096)

# Or use elliptic curve
from cryptography.hazmat.primitives.asymmetric import ec
private_key = ec.generate_private_key(ec.SECP256R1())
```

---

## QUICK REFERENCE TABLE

| Pattern | CWE | OWASP 2025 | Severity | Minimum Standard |
|---------|-----|------------|----------|-----------------|
| MD5/SHA1 for passwords | CWE-328 | A04 | Critical | Use bcrypt/argon2/scrypt |
| MD5/SHA1 for integrity | CWE-328 | A04 | High | Use SHA-256+ |
| DES/RC4/3DES | CWE-327 | A04 | Critical | Use AES-256-GCM or ChaCha20-Poly1305 |
| ECB mode | CWE-327 | A04 | Critical | Use GCM or CBC with HMAC |
| Hardcoded keys/IVs | CWE-321 | A04 | Critical | Use env vars or secrets manager |
| Math.random / random | CWE-338 | A04 | High | Use crypto.randomBytes / secrets |
| TLS verify disabled | CWE-295 | A04 | Critical | Always verify certificates |
| Weak TLS versions | CWE-326 | A04 | High | TLS 1.2 minimum, prefer 1.3 |
| Keys in source code | CWE-321 | A04 | Critical | Use secrets manager |
| RSA < 2048 bits | CWE-326 | A04 | High | RSA 2048+ or ECC P-256+ |
| AES < 128 bits | CWE-326 | A04 | High | AES-128 minimum, prefer AES-256 |
