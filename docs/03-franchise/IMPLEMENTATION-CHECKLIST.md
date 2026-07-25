# 🚀 Checklist de Implementación - CRM Multi-Tenant & Franchise Dashboard

**Estado:** Código listo, esperando configuración y validación  
**Responsable siguiente:** Agente con acceso a Doppler + Twenty.com  
**Rama:** `claude/peskids-scope-review-3xAZz`

---

## 📋 FASE 1: Configuración de Doppler (CRÍTICO)

### ✅ Variables de Entorno Requeridas

Agregar a Doppler (`ops-intcloudsysops / prd`):

```yaml
# Twenty.com CRM Integration
TWENTY_API_URL: "https://api.twenty.com/graphql"
TWENTY_API_KEY: "xxx_your_twenty_api_key_xxx"

# Franchise Admin Auth (TODO: Implementar)
# ADMIN_API_KEY: "xxx"

# Supabase (ya existe, validar)
SUPABASE_URL: "xxx"
SUPABASE_ANON_KEY: "xxx"
SUPABASE_SERVICE_ROLE_KEY: "xxx"
```

### 🔍 Cómo Obtener Twenty API Key

1. Ir a **Twenty.com dashboard** → Account Settings
2. → API Keys
3. → Crear nuevo "API Token"
4. Nombre: `peskids-crm-sync`
5. Copiar y guardar en Doppler

### ✔️ Validar Doppler

```bash
# Verificar que las variables lleguen a Peskids
doppler run --project ops-intcloudsysops --config prd -- env | grep TWENTY

# Debe mostrar:
# TWENTY_API_URL=https://api.twenty.com/graphql
# TWENTY_API_KEY=xxx
```

---

## 📋 FASE 2: Configuración de Twenty.com

### ✅ Paso 1: Crear Custom Field

**Ubicación:** Twenty.com Dashboard → Settings → Custom Fields

```
Name: franchise_tenant_id
Type: Text
Description: ID de franquicia para aislamiento multi-tenant
Required: Yes
Max length: 36 (UUID length)
```

**Validar:**
- [ ] Campo visible en Contact form
- [ ] Es requerido al crear contacto
- [ ] Se puede filtrar por este campo

### ✅ Paso 2: Crear Vistas Filtradas

**Para cada franquicia, crear una vista en Twenty:**

```
Vista: "Franquicia LlanoGrande"
├─ Filter: franchise_tenant_id = "550e8400-e29b-41d4-a716-446655440000"
├─ Campos: First Name, Last Name, Email, Phone, Status, Source
├─ Orden: Created At (DESC)
└─ Acceso: Compartir con usuarios de LlanoGrande

Vista: "Franquicia Bogotá Centro"
├─ Filter: franchise_tenant_id = "660e8400-e29b-41d4-a716-446655440111"
├─ Campos: First Name, Last Name, Email, Phone, Status, Source
├─ Orden: Created At (DESC)
└─ Acceso: Compartir con usuarios de Bogotá

Vista: "Admin Dashboard - Todos"
├─ Filter: None (todos los contactos)
├─ Campos: First Name, Last Name, Email, Status, franchise_tenant_id
├─ Orden: Created At (DESC)
└─ Acceso: Solo admin@peskids
```

**Validar:**
- [ ] Cada vista filtra correctamente
- [ ] Usuarios de franquicia ven solo sus datos
- [ ] Admin ve todos

### ✅ Paso 3: Probar GraphQL API

```bash
# Test de autenticación
curl -X POST https://api.twenty.com/graphql \
  -H "Authorization: Bearer $TWENTY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ contacts { edges { node { id firstName email } } } }"
  }'

# Debe retornar: { "data": { "contacts": { "edges": [] } } }
```

---

## 📋 FASE 3: Configuración de Peskids

### ✅ Paso 1: Descargar y Verificar Código

```bash
# En rama claude/peskids-scope-review-3xAZz

# Verificar archivos principales
ls apps/peskids/lib/services/crm-sync.service.ts
ls apps/peskids/app/api/crm/search/route.ts
ls apps/peskids/app/api/admin/crm/contacts/route.ts
ls apps/peskids/app/api/webhooks/sync-to-crm/route.ts

# Verificar componentes
ls apps/peskids/components/crm/crm-contact-search.tsx
```

### ✅ Paso 2: Type-Check & Lint

```bash
# Validar TypeScript
npm run type-check --workspace=peskids

# Validar linting
npm run lint --workspace=peskids

# Debe pasar sin errores
```

### ✅ Paso 3: Probar Endpoints Localmente

```bash
# 1. Iniciar servidor Peskids
npm run dev --workspace=peskids
# → http://localhost:3004

# 2. Probar endpoint de búsqueda (franquicia)
curl -X GET "http://localhost:3004/api/crm/search?q=test&limit=10" \
  -H "x-franchise-id: 550e8400-e29b-41d4-a716-446655440000"

# Respuesta esperada:
# {
#   "ok": true,
#   "data": {
#     "contacts": [],
#     "total": 0,
#     "query": "test",
#     "franchise_id": "550e8400-e29b-41d4-a716-446655440000"
#   }
# }

# 3. Probar endpoint de admin
curl -X GET "http://localhost:3004/api/admin/crm/contacts?q=test"

# 4. Probar webhook de sincronización
curl -X POST "http://localhost:3004/api/webhooks/sync-to-crm" \
  -H "Content-Type: application/json" \
  -d '{
    "franchiseTenantId": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Test",
    "email": "test@example.com",
    "status": "lead",
    "source": "form"
  }'

# Respuesta esperada:
# {
#   "ok": true,
#   "data": {
#     "contactId": "20-xyz...",
#     "franchiseTenantId": "550e8400-...",
#     "email": "test@example.com"
#   }
# }
```

### ✅ Paso 4: Validar que Twenty Recibe Datos

Después de ejecutar el webhook:

```bash
# En Twenty.com dashboard
# 1. Ir a Contacts
# 2. Buscar "Test"
# 3. Verificar que aparezca con franchise_tenant_id = "550e8400-..."
# 4. Ir a vista "Franquicia LlanoGrande"
# 5. Verificar que "Test" aparece
```

---

## 📋 FASE 4: Integración con Formularios

### ✅ Paso 1: Agregar Sincronización a Formularios Existentes

**Ubicación:** `apps/peskids/app/api/public/forms/submit/route.ts` (existente)

```typescript
// Después de crear/guardar el contacto en Supabase:

// 1. Sincronizar a Twenty CRM
const crmSync = await fetch('/api/webhooks/sync-to-crm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    franchiseTenantId: franchiseId,  // ← Del contexto del formulario
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
    status: 'lead',  // Nuevo contacto siempre es lead
    source: 'form',
    notes: `Formulario de ${franchiseName}`
  })
})

if (!crmSync.ok) {
  console.warn('CRM sync failed, pero continuamos:', await crmSync.json())
}

// 2. Continuar con lógica existente (email, etc)
```

### ✅ Paso 2: Agregar Sincronización a API de Leads

**Ubicación:** Cualquier endpoint que cree leads

```typescript
// Después de crear lead:
await fetch('/api/webhooks/sync-to-crm', {
  method: 'POST',
  body: JSON.stringify({
    franchiseTenantId: lead.franchise_id,
    firstName: lead.name.split(' ')[0],
    email: lead.email,
    status: 'lead',
    source: 'api'
  })
})
```

### ✅ Paso 3: Validar Sincronización End-to-End

```bash
# 1. Llenar formulario en http://localhost:3004/franchises/nearby
# 2. Verificar que contacto aparece en Twenty.com
# 3. Buscar con /api/crm/search
# 4. Verificar que franquicia ve el contacto
# 5. Verificar que admin también lo ve
```

---

## 📋 FASE 5: Autenticación de Admin (TODO)

### ⚠️ IMPORTANTE: Implementar Admin Auth

**Archivos que necesitan validación:**
- `apps/peskids/app/api/admin/franchises/route.ts` (línea 30: `// TODO: Validate admin auth`)
- `apps/peskids/app/api/admin/crm/contacts/route.ts` (línea 16: `// TODO: Validate admin auth`)

**Opciones para implementar:**

**Opción A: JWT Claims (Recomendado)**
```typescript
// En middleware
const token = req.headers.get('authorization')?.split(' ')[1]
const decoded = verifyJWT(token)

if (decoded.is_superuser !== true) {
  return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}
```

**Opción B: API Key**
```typescript
const apiKey = req.headers.get('x-api-key')
if (apiKey !== process.env.ADMIN_API_KEY) {
  return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}
```

**Opción C: Supabase RLS**
```typescript
// Usar resolveTrustedAdminSession() si existe
const { user } = await resolveTrustedAdminSession(req)
if (!user?.is_superuser) {
  return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}
```

**Validar después de implementar:**
```bash
# Debe rechazar sin credenciales
curl -X GET "http://localhost:3004/api/admin/crm/contacts" 
# → 401 Unauthorized

# Debe aceptar con credenciales válidas
curl -X GET "http://localhost:3004/api/admin/crm/contacts" \
  -H "Authorization: Bearer valid_token"
# → 200 OK
```

---

## 📋 FASE 6: Integración con Header/Layout

### ✅ Paso 1: Agregar FranchiseHeader

**Ubicación:** Layout principal (`apps/peskids/app/layout.tsx`)

```typescript
import { FranchiseHeader } from '@/components/franchise/franchise-header'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <FranchiseHeader />  {/* ← Agregar aquí */}
        {children}
      </body>
    </html>
  )
}
```

**Validar:**
- [ ] Header aparece después de seleccionar franquicia
- [ ] Muestra nombre y distancia
- [ ] Botón "Cambiar franquicia" redirige a `/franchises/nearby`
- [ ] Botón X limpia selección

---

## ✅ FASE 7: Deployment Checklist

### Antes de Deploy a Producción

```bash
# 1. Todas las variables en Doppler
doppler run --project ops-intcloudsysops --config prd -- npm run type-check

# 2. Type-check pasa
npm run type-check --workspace=peskids

# 3. Lint pasa
npm run lint --workspace=peskids

# 4. Tests pasan (si existen)
npm run test --workspace=peskids

# 5. Build completa
npm run build --workspace=peskids

# 6. Endpoints funcionan en staging
# - Probar /api/crm/search
# - Probar /api/admin/crm/contacts
# - Probar /api/webhooks/sync-to-crm

# 7. Datos sincronizados a Twenty
# - Verificar en dashboard de Twenty
```

---

## 📝 Documentación de Referencia

| Documento | Propósito | Ubicación |
|-----------|-----------|-----------|
| **Guía Técnica** | Explicación detallada del sistema | `docs/03-franchise/crm-multitenant.md` |
| **Arquitectura** | Diagramas y flujos | `docs/03-franchise/crm-architecture-diagram.md` |
| **Admin Dashboard** | Features del dashboard de franquicias | `docs/03-franchise/admin-dashboard.md` |
| **Este documento** | Pasos de implementación | `docs/03-franchise/IMPLEMENTATION-CHECKLIST.md` |

---

## 🆘 Troubleshooting

### Error: "TWENTY_API_KEY not configured"

```bash
# Verificar en Doppler
doppler run --project ops-intcloudsysops --config prd -- env | grep TWENTY_API_KEY

# Si no aparece:
# 1. Agregar a Doppler
# 2. Wait 30 segundos para que se propague
# 3. Reiniciar servidor
```

### Error: "Invalid location parameters"

```bash
# En /api/public/franchises/nearby
# Validar query params:
# - latitude: número entre -90 y 90
# - longitude: número entre -180 y 180
# - radiusKm: número entre 1 y 500

# Ejemplo correcto:
GET /api/public/franchises/nearby?latitude=4.7110&longitude=-74.0721&radiusKm=50
```

### Error: "Franchise not found"

```bash
# En /api/admin/franchises/:franchiseId
# Validar que franchiseId es UUID válido
# y que existe en tabla platform.tenants

# Consultar:
SELECT id FROM platform.tenants WHERE franchise_type = 'child';
```

### Error: "Twenty API key invalid"

```bash
# Validar token en Twenty.com
# Settings → API Keys → Copiar token exacto
# Pegar en Doppler sin espacios adicionales
```

---

## 📞 Next Agent Checklist

```
[ ] Configurar TWENTY_API_KEY en Doppler
[ ] Crear custom field en Twenty
[ ] Crear vistas filtradas en Twenty
[ ] Probar GraphQL API de Twenty
[ ] Ejecutar endpoints localmente
[ ] Integrar sincronización en formularios
[ ] Implementar admin auth
[ ] Agregar FranchiseHeader a layout
[ ] Type-check & lint
[ ] Build local
[ ] Deploy a staging
[ ] Validar en Twenty
[ ] Deploy a producción
```

---

## 📌 Notas Importantes

- **No hay secretos en código** → Todo va en Doppler
- **Admin auth es crítico** → No dejar TODO sin implementar
- **Validar en Twenty** → Asegurar que datos llegan correctamente
- **Test end-to-end** → Desde formulario hasta búsqueda
- **Documentar cambios** → Actualizar checklist conforme avanza

**Estado:** ✅ Código completo, esperando configuración
**Próximo paso:** Configurar Doppler y Twenty.com
