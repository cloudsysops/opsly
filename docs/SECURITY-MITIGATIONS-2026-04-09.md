# 🔒 Mitigaciones de Seguridad Multi-Tenancy (LocalRank Pilot - 2026-04-09)

**Status:** Ready to execute  
**Owner:** @cboteros  
**Affected Tenants:** localrank (new), smiletripcare (staging)

---

## 🔴 CRÍTICAS (Esta Noche)

### 1. Cloudflare Proxy para \*.ops.smiletripcare.com

**Objetivo:** Ocultar IP pública del VPS (157.245.223.7) y habilitar WAF.

**Pasos (Cloudflare Dashboard):**

```
1. Ve a Cloudflare → DNS Records
2. Para cada subdominio A record actual:
   - api.ops.smiletripcare.com (157.245.223.7)
   - admin.ops.smiletripcare.com (157.245.223.7)
   - portal.ops.smiletripcare.com (157.245.223.7)
   - n8n-smiletripcare.ops.smiletripcare.com (157.245.223.7)
   - uptime-smiletripcare.ops.smiletripcare.com (157.245.223.7)
   - n8n-localrank.ops.smiletripcare.com (157.245.223.7)
   - uptime-localrank.ops.smiletripcare.com (157.245.223.7)

   Haz clic en el ícono nube:
   - Naranja (Proxied): ACTIVA Cloudflare
   - Gris (DNS only): Actual

3. Cambia a Naranja para TODOS los *.ops.smiletripcare.com

4. Ve a Security → WAF Rules y habilita:
   - Managed Rulesets: Cloudflare Managed Challenge
   - Rate Limiting: 100 req/min para rutas admin

5. SSL/TLS:
   - Encryption mode: Full (strict)
   - Always use HTTPS: ON
```

**Verificación (Mac local):**

```bash
# Antes (IP pública visible):
dig api.ops.smiletripcare.com +short
# Output: 157.245.223.7

# Después (IP Cloudflare):
dig api.ops.smiletripcare.com +short
# Output: 104.16.x.x (Cloudflare IP)

# HTTPS debería funcionar igual:
curl -sfk https://api.ops.smiletripcare.com/api/health
# Output: {"status":"ok"}
```

**Impacto:**

- ✅ IP VPS oculta (157.245.223.7 no visible públicamente)
- ✅ WAF protege contra bot/SQL injection/XSS
- ✅ DDoS mitigation automático
- ⚠️ Pueden haber latencias de ~10-50ms extra (Cloudflare edge)

**Tiempo:** 5-10 min

---

### 2. ufw Firewall en VPS

**Objetivo:** Drop incoming por defecto; whitelist solo SSH (Tailscale), HTTP/HTTPS.

**Comandos SSH a VPS:**

```bash
ssh vps-dragon@157.245.223.7 << 'EOF'
set -euo pipefail

echo "=== Verificando ufw ==="
sudo ufw status || echo "ufw no instalado"

echo "=== Instalando ufw ==="
sudo apt-get update && sudo apt-get install -y ufw

echo "=== Configurando ufw ==="
# Default DROP incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Whitelist SSH desde Tailscale (100.64.0.0/10 range)
sudo ufw allow from 100.64.0.0/10 to any port 22/tcp comment "Tailscale SSH only"

# Allow HTTP/HTTPS (Traefik public)
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"

# Habilitar ufw (responde 'y' a prompt)
echo "y" | sudo ufw enable

echo "=== Verificando reglas ==="
sudo ufw status verbose

# Verificar que SSH desde IP pública está BLOCKED
echo "✓ SSH public: $(sudo ufw show added | grep -i '22' || echo 'BLOCKED')"
echo "✓ SSH Tailscale: ALLOWED (100.64.0.0/10)"
EOF
```

**Verificación:**

```bash
# Desde Mac (IP pública): SSH debe fallar con timeout
# (esto es correcto - queremos que falle)
ssh -o ConnectTimeout=3 vps-dragon@157.245.223.7
# Expected: timeout after 3 seconds (SSH port cerrado)

# Desde Tailscale VPN: SSH debe funcionar
# (requiere tener Tailscale activado en Mac primero - ver abajo)
ssh vps-dragon@100.120.151.91
# Expected: connection prompt o login
```

**Impacto:**

- ✅ SSH solo accesible desde Tailscale
- ✅ HTTP/HTTPS (puerto 80/443) públicos y funcionales
- ✅ Otros puertos bloqueados (no debe afectar n8n, uptime que van vía HTTP/HTTPS)
- ⚠️ Si algo en VPS escucha en puerto no whitelisted, se cortará el acceso

**Tiempo:** 5-10 min

**Reversible:** `sudo ufw disable` si hay problema

---

### 3. Tailscale SSH Setup (Mac)

**Objetivo:** Acceso seguro a VPS desde Tailscale VPN (no IP pública).

**Paso 1: Instalar Tailscale en Mac**

```bash
# Descargar e instalar
curl -fsSL https://tailscale.com/install.sh | sh

# Verificar
tailscale --version
# Output: tailscale version X.X.X, Go version 1.XX

# Iniciar Tailscale (abre navegador para login)
sudo tailscale up

# Obtener tu IP Tailscale
tailscale ip -4
# Output: 100.120.xxx.xxx (tu IP única en la red)
```

**Paso 2: Verificar Conectividad VPS en Tailscale**

```bash
# Desde Mac, con Tailscale activo:
ping 100.120.151.91
# Expected: respuestas (si VPS está en Tailscale)

# O buscar en lista de peers
tailscale status
# Output: debería incluir VPS con IP 100.120.151.91
```

**Paso 3: SSH vía Tailscale**

```bash
# SSH directo a IP Tailscale
ssh vps-dragon@100.120.151.91

# Después de ufw enable, IP pública (157.245.223.7) no responde a SSH
ssh -o ConnectTimeout=3 vps-dragon@157.245.223.7
# Expected: connection timeout (SSL port bloqueado por ufw)
```

**Verificación en AGENTS.md:**

- SSH_HOST en onboard-tenant.sh ya defaultea a `100.120.151.91` ✅
- Una vez ufw está en VPS, solo Tailscale funciona ✅

**Impacto:**

- ✅ SSH solo accessible desde VPN personal
- ✅ IP pública no expuesta
- ✅ Retrocompatible con scripts (usan Tailscale IP por defecto)
- ⚠️ Requiere Tailscale en dispositivo; si VPS pierde conexión, no hay recovery sin consola KVM

**Tiempo:** 5 min (instalación) + 2 min (verificación)

---

## 🟡 IMPORTANTES (Esta Semana)

### 4. Tailscale en VPS

**Objetivo:** VPS visible en Tailscale network; SSH desde Tailscale solo.

**Comandos SSH a VPS (antes de ufw):**

```bash
ssh vps-dragon@157.245.223.7 << 'EOF'
set -euo pipefail

echo "=== Instalando Tailscale en VPS ==="
curl -fsSL https://tailscale.com/install.sh | sh

echo "=== Iniciando Tailscale (se abrirá link de login) ==="
sudo tailscale up --advertise-exit-node

# El comando anterior imprime una URL tipo:
# https://login.tailscale.com/a/XXXXX
#
# Cópiala y pégala en navegador para autorizar VPS

echo "=== Esperando autorización (máx 30s) ==="
sleep 30

echo "=== Verificando IP Tailscale ==="
sudo tailscale ip -4
# Output: 100.120.151.91 (o similar)

echo "✓ VPS Tailscale setup completo"
EOF
```

**Verificación:**

```bash
# Desde Mac con Tailscale:
tailscale status | grep vps-dragon
# Output: debería mostrar VPS con IP 100.120.151.91

ping 100.120.151.91
# Expected: responde
```

**Impacto:**

- ✅ VPS accesible vía Tailscale IP privada
- ✅ No requiere exponer SSH a Internet
- ✅ Automático si Tailscale admin (cboteros) autoriza el dispositivo
- ⚠️ Requiere Tailscale account (gratuito hasta 3 devices)

**Tiempo:** 2-3 min (instalación + autorización)

---

### 5. Auditoría de Rutas API (Code Review)

**Objetivo:** Verificar que todas las rutas nuevas que requieren tenant validation usan `tenantSlugMatchesSession`.

**Comando (grep):**

```bash
cd /Users/dragon/cboteros/proyectos/intcloudsysops

# Buscar todas las rutas con [slug] en portal
find apps/api/app/api/portal/tenant -name "route.ts" -exec echo "=== {} ===" \; -exec grep -l "tenantSlugMatchesSession" {} \;

# Output esperado: TODAS deben incluir tenantSlugMatchesSession
# Si encuentra route.ts SIN tenantSlugMatchesSession → FIX NEEDED

# Comando para encontrar missing:
find apps/api/app/api/portal/tenant -name "route.ts" | while read f; do
  if ! grep -q "tenantSlugMatchesSession" "$f"; then
    echo "⚠️  MISSING: $f"
  else
    echo "✓ OK: $f"
  fi
done
```

**Rutas que ya tienen validación (✅):**

- `/api/portal/tenant/[slug]/me` ✅
- `/api/portal/tenant/[slug]/usage` ✅
- `/api/portal/tenant/[slug]/mode` ✅
- `/api/portal/tenant/[slug]/health` ✅

**Checklist para futuras rutas:**

- [ ] Ruta nueva bajo `/api/portal/tenant/[slug]/*` → agregar `tenantSlugMatchesSession` check
- [ ] Template (copiar de `mode/route.ts`):

```typescript
import {
  tenantSlugMatchesSession,
  resolveTrustedPortalSession,
} from '@/lib/portal-trusted-identity';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { ok, session, response } = await resolveTrustedPortalSession(req);
  if (!ok) return response;

  const { slug } = await params;
  if (!tenantSlugMatchesSession(session, slug)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... rest of logic
}
```

**Tiempo:** 5-10 min (código review)

---

## 🟢 OPCIONALES (Fase 2+)

### 6. OWASP ZAP en CI

**Objetivo:** Automated security scanning en PR/merge.

**Implementación (Fase 2):**

```yaml
# .github/workflows/security-scan.yml
name: OWASP ZAP Scan
on: [pull_request]
jobs:
  zap:
    runs-on: ubuntu-latest
    steps:
      - uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'https://api-staging.ops.smiletripcare.com/api/health'
          rules_file_name: '.zap/rules.tsv'
```

**Status:** Documentado, implementar después de LocalRank validación

---

## 📋 APLICAR ESTA NOCHE

### Orden Recomendado:

```bash
# 1. LOCAL: Instalar Tailscale en Mac (si no lo tienes)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
tailscale ip -4  # Anota tu IP (ej. 100.120.123.456)

# 2. VPS: Instalar Tailscale
# (SSH aún funciona desde IP pública)
ssh vps-dragon@157.245.223.7 << 'CMD'
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --advertise-exit-node
# Autoriza en navegador (URL que imprime)
sleep 10
sudo tailscale ip -4
CMD

# 3. MAC: Verificar conectividad
ping 100.120.151.91  # IP Tailscale del VPS
ssh vps-dragon@100.120.151.91  # SSH vía Tailscale

# 4. VPS: Instalar ufw
ssh vps-dragon@100.120.151.91 << 'CMD'
sudo ufw default deny incoming
sudo ufw allow from 100.64.0.0/10 to any port 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable
sudo ufw status verbose
CMD

# 5. CLOUDFLARE: Cambiar DNS a Proxy
# (Manual en dashboard: https://dash.cloudflare.com/)
# Cambiar icono nube a naranja para todos *.ops.smiletripcare.com

# 6. VERIFICAR: IP pública SSH está bloqueada
ssh -o ConnectTimeout=3 vps-dragon@157.245.223.7
# Expected: timeout (port closed) ✓

# 7. VERIFICAR: HTTPS aún funciona
curl -sfk https://api.ops.smiletripcare.com/api/health
# Expected: {"status":"ok"} ✓

# 8. VERIFICAR: LocalRank onboarding vía Tailscale
./scripts/onboard-tenant.sh --slug localrank --dry-run
# Expected: plan printed (SSH_HOST=100.120.151.91) ✓
```

---

## 📊 RESUMEN POST-MITIGACIONES

| Capa           | Antes                      | Después                                   | Estado       |
| -------------- | -------------------------- | ----------------------------------------- | ------------ |
| SSH            | IP pública (157.245.223.7) | Tailscale only (100.120.151.91)           | 🟢 Seguro    |
| Firewall       | Abierto (nada)             | ufw drop incoming + whitelist             | 🟢 Seguro    |
| IP VPS         | Expuesta                   | Cloudflare Proxy (naranja)                | 🟢 Oculta    |
| WAF            | Nada                       | Cloudflare Managed Challenge + rate limit | 🟢 Protegido |
| API Validation | ✅ (código OK)             | ✅ (auditoría completada)                 | 🟢 Seguro    |
| Secrets        | Doppler + tests            | Doppler + auditoría                       | 🟢 Seguro    |

---

## ⚠️ ROLLBACK (Si hay problema)

```bash
# SSH de emergencia (si Tailscale falla):
# No hay forma directa; requiere consola VPS o snapshots DigitalOcean

# Deshabilitar ufw desde Tailscale:
ssh vps-dragon@100.120.151.91
sudo ufw disable
sudo ufw status
# Expected: Status: inactive

# Revertir Cloudflare:
# Cloudflare dashboard → DNS → cambiar naranja a gris (DNS only)
```

---

**Generated:** 2026-04-09  
**Status:** Ready to execute  
**Prerequisite:** Tailscale installed on Mac + authorized
