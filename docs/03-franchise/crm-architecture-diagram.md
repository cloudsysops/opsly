# Arquitectura CRM Multi-Tenant con Búsqueda Filtrada

## 🏗️ Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PESKIDS PLATFORM                             │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│  Franquicia          │         │  Franquicia          │
│  LlanoGrande         │         │  Bogotá Centro       │
│                      │         │                      │
│  /admin/franquicia   │         │  /admin/franquicia   │
│  ├─ Formularios      │         │  ├─ Formularios      │
│  ├─ Contactos CRM    │         │  ├─ Contactos CRM    │
│  └─ Búsqueda         │         │  └─ Búsqueda         │
└──────────────────────┘         └──────────────────────┘
         │                               │
         │ POST /api/webhooks/sync      │ POST /api/webhooks/sync
         │ {franchiseTenantId: XXX}     │ {franchiseTenantId: YYY}
         │                               │
         └──────────────┬────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │   Peskids API (Node.js)       │
        │   ────────────────────────    │
        │                               │
        │ /api/crm/search               │
        │ ├─ Busca solo su franquicia   │
        │ ├─ Filtra por status          │
        │ └─ Header: x-franchise-id     │
        │                               │
        │ /api/admin/crm/contacts       │
        │ ├─ Ve todos los contactos     │
        │ ├─ Filtra por franquicia      │
        │ ├─ Filtra por status          │
        │ └─ Agrupa por franquicia      │
        │                               │
        │ /api/webhooks/sync-to-crm     │
        │ └─ Sincroniza a Twenty        │
        └───────────────────────────────┘
                        ↓
                  (GraphQL API)
                        ↓
        ┌───────────────────────────────┐
        │   Twenty.com (CRM Único)      │
        │   ─────────────────────────   │
        │                               │
        │  Contactos (con tags):        │
        │  ├─ Juan (LlanoGrande)        │
        │  │  ├─ franchise: XXX         │
        │  │  ├─ status: lead           │
        │  │  └─ tags:                  │
        │  │     └─ "franchise:XXX"     │
        │  │                            │
        │  ├─ María (Bogotá)            │
        │  │  ├─ franchise: YYY         │
        │  │  ├─ status: enrolled       │
        │  │  └─ tags:                  │
        │  │     └─ "franchise:YYY"     │
        │  │                            │
        │  └─ Carlos (Medellín)         │
        │     ├─ franchise: ZZZ         │
        │     ├─ status: active         │
        │     └─ tags:                  │
        │        └─ "franchise:ZZZ"     │
        │                               │
        │  Vistas (Filtradas):          │
        │  ├─ "Franquicia LlanoGrande"  │
        │  │  └─ Filtro: franchise=XXX  │
        │  ├─ "Franquicia Bogotá"       │
        │  │  └─ Filtro: franchise=YYY  │
        │  └─ "Admin Dashboard"         │
        │     └─ Sin filtro (todos)     │
        └───────────────────────────────┘
                ↑               ↑
                └─ Búsqueda ────┘
```

---

## 📊 Flujo de Datos

### 1. Crear Contacto (Franquicia)

```
Franquicia completa formulario
          ↓
POST /api/webhooks/sync-to-crm
{
  "franchiseTenantId": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "Juan",
  "email": "juan@example.com",
  "status": "lead",
  "source": "form"
}
          ↓
Peskids API valida franchise_tenant_id
          ↓
Envía a Twenty GraphQL:
  mutation {
    createContact(input: {
      firstName: "Juan",
      email: "juan@example.com",
      customFields: {
        franchise_tenant_id: "550e8400-...",
        status: "lead"
      },
      tags: ["franchise:550e8400-..."]
    })
  }
          ↓
Twenty almacena contacto con aislamiento
          ↓
Respuesta: { ok: true, contactId: "20-001" }
```

### 2. Buscar Contactos (Franquicia)

```
Usuario de LlanoGrande busca "juan"
          ↓
GET /api/crm/search?q=juan
Header: x-franchise-id: 550e8400-...
          ↓
API valida header x-franchise-id
          ↓
Envía a Twenty GraphQL:
  query {
    contacts(filter: {
      customFields: {
        franchise_tenant_id: {
          equals: "550e8400-..."
        }
      },
      OR: [
        { firstName: { ilike: "%juan%" } },
        { email: { ilike: "%juan%" } }
      ]
    })
  }
          ↓
Twenty retorna SOLO contactos de LlanoGrande
          ↓
API retorna:
{
  "contacts": [
    {
      "id": "20-001",
      "firstName": "Juan",
      "email": "juan@example.com",
      "status": "lead",
      "franchiseTenantId": "550e8400-..."
    }
  ],
  "total": 1
}
```

### 3. Buscar Contactos (Admin)

```
Admin de Peskids busca sin filtro
          ↓
GET /api/admin/crm/contacts?q=juan
(sin header de franquicia)
          ↓
API verifica admin auth (TODO)
          ↓
Envía a Twenty GraphQL:
  query {
    contacts(filter: {
      OR: [
        { firstName: { ilike: "%juan%" } },
        { email: { ilike: "%juan%" } }
      ]
    })
  }
          ↓
Twenty retorna TODOS los contactos que matchean
          ↓
API agrupa por franquicia y retorna:
{
  "contacts": [
    {
      "firstName": "Juan",
      "franchiseTenantId": "550e8400-..." (LlanoGrande)
    },
    {
      "firstName": "Juan",
      "franchiseTenantId": "660e8400-..." (Bogotá)
    }
  ],
  "stats": {
    "totalByFranchise": {
      "550e8400-...": 1,
      "660e8400-...": 1
    }
  },
  "total": 2
}
```

---

## 🔐 Aislamiento de Datos

### Mecanismos de Seguridad

| Nivel | Mecanismo | Dónde |
|-------|-----------|-------|
| **API** | Header `x-franchise-id` validado | Peskids backend |
| **Búsqueda GraphQL** | Filtro `franchise_tenant_id` en WHERE | Twenty |
| **Vistas Twenty** | Filtro por `franchise_tenant_id` | Twenty UI |
| **Tags** | `franchise:UUID` para filtrado rápido | Twenty |
| **Custom Field** | `franchise_tenant_id` requerido | Twenty schema |

### Validación en Peskids

```typescript
// 1. Obtener franchise_id del header
const franchiseTenantId = req.headers.get('x-franchise-id')

// 2. Validar que existe
const franchise = await db.franchises.findById(franchiseTenantId)
if (!franchise) return 401

// 3. Validar que es franquicia, no admin
if (franchise.type !== 'child') return 403

// 4. Pasar a búsqueda con isolate
const contacts = await searchCRMContacts(
  franchiseTenantId,  // ← SIEMPRE incluir
  query
)

// 5. GraphQL en Twenty filtra automáticamente
// WHERE franchise_tenant_id = franchiseTenantId
```

---

## 📈 Escalabilidad

### Crecimiento de Franquicias

```
Agrega franquicia → 
  ✅ Solo agrega nuevo franchise_tenant_id
  ✅ No requiere nueva instancia de Twenty
  ✅ Búsquedas siguen siendo rápidas (indexed)
  ✅ Reportes consolidados funcionan igual
```

### Números Estimados

| Métrica | Capacidad |
|---------|-----------|
| Contactos totales | 10M+ (Twenty soporta) |
| Franquicias | Ilimitadas |
| Búsquedas/seg | 1000+ (indexed) |
| Latencia búsqueda | <200ms |
| Almacenamiento | Escalable con Twenty plan |

---

## 🎯 Casos de Uso

### Franquicia: "Ver mis contactos"

```
1. Usuario en portal de LlanoGrande
2. Click: "Ver contactos en CRM"
3. GET /api/crm/search?q=&status=lead
4. Header: x-franchise-id (de sesión)
5. Ve solo contactos de LlanoGrande
6. Puede buscar, filtrar, editar
```

### Peskids Admin: "Ver todas las franquicias"

```
1. Admin en /admin/crm
2. Ve todos los contactos
3. Click: "Filtrar por Bogotá"
4. GET /api/admin/crm/contacts?franchise_id=YYY
5. Ve solo contactos de Bogotá
6. Puede hacer seguimiento, reportes
```

### Franquicia: "Sincronizar nuevo lead"

```
1. Completar formulario en franquicia
2. POST /api/webhooks/sync-to-crm
   {
     "franchiseTenantId": "XXX",
     "firstName": "Juan",
     "email": "juan@..."
   }
3. Contacto se crea en Twenty con aislamiento
4. Visible en búsqueda de franquicia
5. Admin ve en dashboard consolidado
```

---

## ✅ Ventajas vs Desventajas

### Opción B: CRM Único Compartido (Recomendado)

**Ventajas:**
- ✅ Un solo costo
- ✅ Reporting consolidado fácil
- ✅ Sincronización centralizada
- ✅ Backup único
- ✅ Escalable
- ✅ Mismo patrón que Supabase

**Desventajas:**
- ⚠️ Requiere validación de franchise_id en API
- ⚠️ Filtros en Twenty deben ser correctos

### Opción A: CRM Separado por Franquicia

**Ventajas:**
- ✅ Máximo aislamiento de datos
- ✅ Sin validación de franchise_id

**Desventajas:**
- ❌ Muy costoso (N instancias)
- ❌ Sin reporting consolidado
- ❌ Sin cross-franquicia collaboration
- ❌ Complicado agregar franquicia nueva

---

## 🚀 Implementación

### Paso 1: Twenty Setup

```
1. Ir a Twenty.com
2. Crear custom field "franchise_tenant_id" (TEXT, required)
3. Crear vista "Franquicia LlanoGrande"
   └─ Filter: franchise_tenant_id = "550e8400-..."
4. Crear vista "Franquicia Bogotá"
   └─ Filter: franchise_tenant_id = "660e8400-..."
5. Crear vista "Admin Dashboard"
   └─ Sin filtro (todos los contactos)
```

### Paso 2: Peskids Setup

```bash
# 1. Configurar variables de entorno
TWENTY_API_URL=https://api.twenty.com/graphql
TWENTY_API_KEY=xxx_key_xxx

# 2. Implementar servicios
lib/services/crm-sync.service.ts

# 3. Crear endpoints
app/api/crm/search/route.ts
app/api/admin/crm/contacts/route.ts
app/api/webhooks/sync-to-crm/route.ts

# 4. Agregar componentes
components/crm/crm-contact-search.tsx
app/admin/crm/page.tsx

# 5. Integrar en formularios
// Cuando se crea contacto:
await fetch('/api/webhooks/sync-to-crm', {
  body: JSON.stringify({
    franchiseTenantId: sessionFranchiseId,
    firstName: ...,
    email: ...
  })
})
```

### Paso 3: Validar

```bash
# 1. Crear contacto en franquicia
POST /api/webhooks/sync-to-crm

# 2. Buscar como franquicia
GET /api/crm/search?q=juan
Header: x-franchise-id: 550e8400-...

# 3. Buscar como admin
GET /api/admin/crm/contacts?q=juan

# 4. Filtrar admin por franquicia
GET /api/admin/crm/contacts?franchise_id=550e8400-...
```

---

## 📞 Support

- **Twenty Docs**: https://docs.twenty.com
- **GraphQL Playground**: https://api.twenty.com/graphql
- **Peskids CRM Service**: `lib/services/crm-sync.service.ts`
- **Documentation**: `docs/03-franchise/crm-multitenant.md`

