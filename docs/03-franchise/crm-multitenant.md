# CRM Multi-Tenant con Twenty

**Patrón de Diseño:** Un CRM único para todas las franquicias, dividido por `franchise_tenant_id`

---

## 📋 Visión General

### Estructura

```
Twenty.com (Instancia Única)
│
└─ Contactos (con franchise_tenant_id como field)
   ├── Juan - franquicia_id: LlanoGrande
   ├── María - franquicia_id: Bogotá
   └── Carlos - franquicia_id: Medellín
```

### Ventajas

- ✅ **Un solo costo** - Una instancia de Twenty
- ✅ **Reporting centralizado** - Peskids ve todo
- ✅ **Aislamiento por búsqueda** - Franquicias ven solo sus contactos
- ✅ **Multi-tenant natural** - Mismo patrón que Supabase
- ✅ **Escalable** - Agrega franquicias sin complejidad

---

## 🔍 Búsqueda Filtrada

### Estructura de Datos en Twenty

Cada contacto tiene:

```graphql
type Contact {
  id: ID!
  firstName: String!
  lastName: String
  email: String!
  phone: String
  createdAt: DateTime!
  
  # Custom fields para multi-tenancy
  customFields: {
    franchise_tenant_id: String!      # ← Clave de aislamiento
    status: "lead|enrolled|active|inactive"
    source: "form|referral|web|api"
    notes: String
  }
  
  # Tags para filtrado rápido
  tags: [
    "franchise:uuid-xxx",              # Tag de franquicia
    "status:lead",                     # Tag de estado
    "source:form"                      # Tag de origen
  ]
}
```

### Vistas en Twenty UI

Configura estas vistas en Twenty.com:

| Vista | Filtro | Acceso |
|-------|--------|--------|
| **Franquicia: LlanoGrande** | `franchise_tenant_id = "xxx"` | Solo usuarios de LlanoGrande |
| **Franquicia: Bogotá** | `franchise_tenant_id = "yyy"` | Solo usuarios de Bogotá |
| **Franquicia: Medellín** | `franchise_tenant_id = "zzz"` | Solo usuarios de Medellín |
| **Admin Dashboard** | Sin filtro | Solo admin de Peskids |
| **Leads Activos** | `status = "lead"` AND sin filtro franquicia | Admin |
| **Por Convertir** | `status = "enrolled"` AND sin filtro | Admin |

---

## 🔐 Control de Acceso

### Franquicia (Vista)

```typescript
// Portal de franquicia - API con x-franchise-id header
GET /api/crm/search?q=juan&status=lead

// Backend valida:
// - Header x-franchise-id
// - Contactos solo donde franchise_tenant_id == header
// - Response se filtra automáticamente
```

**SQL implícito en Twenty:**

```sql
SELECT * FROM contacts 
WHERE customFields.franchise_tenant_id = 'LlanoGrande-UUID'
  AND (
    firstName ILIKE '%juan%' 
    OR email ILIKE '%juan%'
  )
```

### Admin (Todos)

```typescript
// Admin de Peskids - sin validación de franquicia
GET /api/admin/crm/contacts?q=search&franchise_id=optional

// Backend:
// - Si franchise_id → filtrar por esa franquicia
// - Si no → retornar TODOS los contactos
// - Agrupados por franquicia en stats
```

**SQL implícito en Twenty:**

```sql
-- Sin franchise_id (todas):
SELECT * FROM contacts

-- Con franchise_id (una franquicia):
SELECT * FROM contacts
WHERE customFields.franchise_tenant_id = 'Bogotá-UUID'
```

---

## 📡 Sincronización

### Flujo Básico

```
1. Usuario completa formulario en franquicia
   ↓
2. POST /api/webhooks/sync-to-crm con franchise_tenant_id
   ↓
3. syncContactToCRM() crea contacto en Twenty
   ├── firstName
   ├── email
   └── customFields.franchise_tenant_id ← CRUCIAL
   ↓
4. Twenty almacena contacto con tag "franchise:uuid"
   ↓
5. Búsqueda GET /api/crm/search retorna solo este contacto
   a la franquicia porque franchise_tenant_id match
```

### Webhook Payload

```bash
POST /api/webhooks/sync-to-crm

{
  "franchiseTenantId": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "phone": "+573001234567",
  "status": "lead",
  "source": "form",
  "notes": "Lead de formulario de reserva"
}
```

### Confirmación

```json
{
  "ok": true,
  "data": {
    "contactId": "20-id-xxx",
    "franchiseTenantId": "550e8400...",
    "email": "juan@example.com"
  }
}
```

---

## 🔎 Ejemplos de Búsqueda

### Portal de Franquicia (LlanoGrande)

```bash
# Usuario de LlanoGrande busca "juan"
GET /api/crm/search?q=juan&status=lead

# Header: x-franchise-id: 550e8400-e29b-41d4-a716-446655440000

# Response (solo contactos de LlanoGrande):
{
  "ok": true,
  "data": {
    "contacts": [
      {
        "id": "20-001",
        "firstName": "Juan",
        "email": "juan@example.com",
        "status": "lead",
        "franchiseTenantId": "550e8400-e29b-41d4-a716-446655440000"
      }
    ],
    "total": 1,
    "franchise_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Admin de Peskids - Todas las Franquicias

```bash
# Admin busca todos los contactos
GET /api/admin/crm/contacts?q=juan

# Response (contactos de todas las franquicias):
{
  "ok": true,
  "data": {
    "contacts": [
      {
        "id": "20-001",
        "firstName": "Juan",
        "email": "juan@example.com",
        "status": "lead",
        "franchiseTenantId": "550e8400-e29b-41d4-a716-446655440000"
      },
      {
        "id": "20-002",
        "firstName": "Juan",
        "email": "juan2@example.com",
        "status": "enrolled",
        "franchiseTenantId": "660e8400-e29b-41d4-a716-446655440111"
      }
    ],
    "total": 2,
    "stats": {
      "totalByFranchise": {
        "550e8400-e29b-41d4-a716-446655440000": 1,
        "660e8400-e29b-41d4-a716-446655440111": 1
      }
    }
  }
}
```

### Admin - Filtrar por Franquicia

```bash
# Admin ve solo Bogotá
GET /api/admin/crm/contacts?franchise_id=660e8400-e29b-41d4-a716-446655440111

# Response (solo contactos de Bogotá):
{
  "ok": true,
  "data": {
    "contacts": [
      {
        "id": "20-002",
        "firstName": "Juan",
        "email": "juan2@example.com",
        "status": "enrolled",
        "franchiseTenantId": "660e8400-e29b-41d4-a716-446655440111"
      }
    ],
    "total": 1,
    "filters": {
      "franchise_id": "660e8400-e29b-41d4-a716-446655440111"
    }
  }
}
```

---

## 🛠️ Implementación

### 1. Configurar Twenty Custom Field

```graphql
mutation AddCustomField {
  createCustomField(input: {
    name: "franchise_tenant_id"
    type: "TEXT"
    description: "ID de la franquicia para aislamiento multi-tenant"
    isRequired: true
  }) {
    id
    name
  }
}
```

### 2. Crear Vistas Filtrantes

En Twenty.com dashboard:

1. **Crear vista "Franquicia LlanoGrande"**
   - Filtro: `franchise_tenant_id = "550e8400..."`
   - Acceso: Solo usuarios de LlanoGrande

2. **Crear vista "Admin Dashboard"**
   - Filtro: Ninguno (todos los contactos)
   - Acceso: Solo admin@peskids

3. **Crear vista "Leads"**
   - Filtro: `status = "lead"`
   - Acceso: Admin

### 3. Sincronizar en Peskids

En `lib/services/crm-sync.service.ts`:

```typescript
// Cuando se crea un contacto:
await syncContactToCRM({
  franchiseTenantId: sessionFranchiseId,  // ← SIEMPRE incluir
  firstName: "Juan",
  email: "juan@example.com",
  status: "lead",
  source: "form"
})
```

### 4. Configurar Webhooks

**Opción A: Webhook Automático en Formularios**

```typescript
// En route que procesa formularios:
if (formSubmitted) {
  await fetch('/api/webhooks/sync-to-crm', {
    method: 'POST',
    body: JSON.stringify({
      franchiseTenantId: formFranchiseId,
      firstName: formData.name,
      email: formData.email,
      source: 'form'
    })
  })
}
```

**Opción B: Trigger en Supabase**

```sql
-- Trigger que sincroniza automáticamente
CREATE TRIGGER sync_new_lead_to_crm
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.http_post_crm();
```

---

## 📊 Dashboard de Peskids

### Vista de Admin

```
CRM Central Dashboard
├── Total Contactos: 4,250
│   ├── LlanoGrande: 1,200
│   ├── Bogotá: 1,500
│   └── Medellín: 1,550
│
├── Estado de Contactos
│   ├── Leads: 1,200 (28%)
│   ├── Inscritos: 1,800 (42%)
│   ├── Activos: 1,100 (26%)
│   └── Inactivos: 150 (4%)
│
└── Búsqueda Rápida
   └── [Buscar...] [Por Franquicia ▼] [Por Estado ▼]
       └── Resultados: 50 (1 de 100)
```

### Componente React

```typescript
<CRMContactSearch 
  isAdmin={true}
  // Automáticamente:
  // - Busca en /api/admin/crm/contacts
  // - Muestra todos los contactos
  // - Permite filtrar por franquicia
  // - Agrupa por estado
/>
```

---

## 🔒 Seguridad

### Validación de Franquicia

En cada endpoint de búsqueda:

```typescript
// 1. Obtener franchise_id del header o JWT
const franchiseTenantId = req.headers.get('x-franchise-id')

// 2. Validar que existe en BD
const franchise = await getFranchise(franchiseTenantId)
if (!franchise) return 401

// 3. Filtrar búsqueda
const contacts = await searchCRMContacts(franchiseTenantId, query)
// ↑ Solo retorna contactos donde franchise_tenant_id match
```

### Aislamiento en Twenty

- Cada vista en Twenty tiene su propio filtro
- Usuarios de franquicia solo ven su vista
- Admin ve todas las vistas

---

## 📈 Métricas y Reportes

### Por Franquicia

```sql
SELECT 
  franchise_tenant_id,
  COUNT(*) as total_contactos,
  COUNT(CASE WHEN status = 'lead' THEN 1 END) as leads,
  COUNT(CASE WHEN status = 'enrolled' THEN 1 END) as inscritos,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as activos
FROM contacts
GROUP BY franchise_tenant_id
```

### Global (Admin)

```sql
SELECT 
  status,
  COUNT(*) as total,
  COUNT(DISTINCT franchise_tenant_id) as franquicias
FROM contacts
GROUP BY status
```

---

## ✅ Checklist de Implementación

- [ ] Crear custom field `franchise_tenant_id` en Twenty
- [ ] Configurar Twenty API key en `.env.local`
- [ ] Crear vistas en Twenty para cada franquicia
- [ ] Implementar `syncContactToCRM()` en service
- [ ] Crear endpoints `/api/crm/search` y `/api/admin/crm/contacts`
- [ ] Crear webhook `/api/webhooks/sync-to-crm`
- [ ] Integrar CRMContactSearch en portales
- [ ] Validar aislamiento de datos
- [ ] Documentar en Notion para team

---

## 🚀 Próximos Pasos

1. **Sync bidireccional**: Actualizar contacto en Twenty → actualizar en Peskids
2. **Deals multi-franquicia**: Crear deals automáticamente al inscribirse
3. **Automaciones**: Flujos en Twenty para seguimiento
4. **Analytics**: Dashboards de conversion por franquicia
5. **Integración n8n**: Webhooks avanzados (email, SMS, etc.)

