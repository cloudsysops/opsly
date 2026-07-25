# 🎯 Para el Próximo Agente: CRM Multi-Tenant & Franchise Dashboard

**Rama de trabajo:** `claude/peskids-scope-review-3xAZz`  
**Estado:** ✅ Código completo | ⏳ Esperando configuración  
**Tiempo estimado:** 2-4 horas

---

## 📦 Qué Se Entrega

### ✅ Código Completado
- 8 archivos nuevos en Peskids
- 4 endpoints API listos
- 4 componentes React
- 3 documentos técnicos
- 1 script de validación

### ⏳ Qué Falta (TODO)

1. **Configurar Twenty.com API** (30 min)
   - Obtener API key
   - Agregar a Doppler
   - Crear custom field en Twenty
   - Crear vistas filtradas

2. **Validar endpoints** (30 min)
   - Probar localmente
   - Verificar conexión con Twenty
   - Probar sincronización

3. **Implementar admin auth** (1 hora)
   - Validar en `/api/admin/crm/contacts`
   - Validar en `/api/admin/franchises`

4. **Integrar con formularios** (30 min)
   - Agregar webhook en formularios existentes
   - Validar sincronización end-to-end

---

## 🚀 Comienza Aquí

### Paso 1: Lee los Documentos (15 min)

```
1. Este archivo (README-NEXT-AGENT.md)
2. IMPLEMENTATION-CHECKLIST.md ← GUÍA PASO A PASO
3. crm-multitenant.md ← Técnico profundo
```

### Paso 2: Configura y Valida (1 hora)

```bash
# 1. Ejecutar script de validación
chmod +x docs/03-franchise/ENVIRONMENT-SETUP.sh
bash docs/03-franchise/ENVIRONMENT-SETUP.sh

# 2. Seguir pasos en IMPLEMENTATION-CHECKLIST.md
#    (Fases 1-7)
```

### Paso 3: Implementa Faltantes (2 horas)

```bash
# 1. Configurar TWENTY_API_KEY en Doppler
# 2. Crear custom fields en Twenty
# 3. Implementar admin auth
# 4. Integrar con formularios
```

---

## 📋 TODO List Rápido

```
FASE 1: Doppler (30 min)
  [ ] Obtener Twenty API key
  [ ] Agregar TWENTY_API_URL a Doppler
  [ ] Agregar TWENTY_API_KEY a Doppler
  [ ] Validar con script

FASE 2: Twenty.com (30 min)
  [ ] Crear custom field franchise_tenant_id
  [ ] Crear vista "Franquicia LlanoGrande"
  [ ] Crear vista "Franquicia Bogotá"
  [ ] Crear vista "Admin Dashboard"
  [ ] Probar API GraphQL

FASE 3: Validar Localmente (30 min)
  [ ] npm run dev
  [ ] Probar GET /api/crm/search
  [ ] Probar GET /api/admin/crm/contacts
  [ ] Probar POST /api/webhooks/sync-to-crm
  [ ] Verificar en Twenty

FASE 4: Admin Auth (1 hora)
  [ ] Implementar en /api/admin/crm/contacts
  [ ] Implementar en /api/admin/franchises
  [ ] Validar endpoint protegido
  [ ] Validar endpoint con credenciales

FASE 5: Integración (30 min)
  [ ] Agregar webhook en formularios
  [ ] Validar sincronización
  [ ] Probar end-to-end

FASE 6: Deploy (30 min)
  [ ] Type-check ✅
  [ ] Lint ✅
  [ ] Build ✅
  [ ] Endpoints funcionan ✅
  [ ] Datos en Twenty ✅
```

---

## 🔑 Archivos Críticos

### Código

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `lib/services/crm-sync.service.ts` | Sincronización a Twenty | ✅ Completo |
| `app/api/crm/search/route.ts` | Búsqueda franquicia | ✅ Completo |
| `app/api/admin/crm/contacts/route.ts` | Búsqueda admin (TODO: auth) | ⏳ Falta auth |
| `app/api/webhooks/sync-to-crm/route.ts` | Webhook de sincronización | ✅ Completo |
| `components/crm/crm-contact-search.tsx` | Componente búsqueda | ✅ Completo |
| `app/admin/crm/page.tsx` | Dashboard CRM | ✅ Completo |

### Documentación

| Archivo | Propósito |
|---------|-----------|
| `IMPLEMENTATION-CHECKLIST.md` | Guía paso a paso (LEE ESTO) |
| `crm-multitenant.md` | Documentación técnica profunda |
| `crm-architecture-diagram.md` | Diagramas y flujos |
| `ENVIRONMENT-SETUP.sh` | Script de validación |
| `README-NEXT-AGENT.md` | Este archivo |

---

## ⚙️ Variables de Entorno Necesarias

```yaml
# Doppler (ops-intcloudsysops/prd)

TWENTY_API_URL: "https://api.twenty.com/graphql"
TWENTY_API_KEY: "xxxx_key_from_twenty_com_xxxx"

# Existing (validar que existen)
SUPABASE_URL: "xxxx"
SUPABASE_ANON_KEY: "xxxx"
SUPABASE_SERVICE_ROLE_KEY: "xxxx"
```

---

## 🔐 Implementar Admin Auth

**Archivos que necesitan validación:**

```typescript
// File: apps/peskids/app/api/admin/crm/contacts/route.ts
// Line: 16
// TODO: Validate admin auth ← IMPLEMENTAR AQUÍ

// File: apps/peskids/app/api/admin/franchises/route.ts
// Line: 30
// TODO: Validate admin auth ← IMPLEMENTAR AQUÍ
```

**Opciones recomendadas:**

1. **JWT Claims** (si existe middleware de auth)
2. **API Key** (simple, crear en Doppler)
3. **Supabase RLS** (si existe helper)

Ver detalles en `IMPLEMENTATION-CHECKLIST.md` Fase 5

---

## 🧪 Comandos de Testing

```bash
# Validación completa
bash docs/03-franchise/ENVIRONMENT-SETUP.sh

# Type-check
npm run type-check --workspace=peskids

# Lint (esperar que pase)
npm run lint --workspace=peskids

# Dev server
npm run dev --workspace=peskids

# Probar endpoints
curl -X GET "http://localhost:3004/api/crm/search?q=test" \
  -H "x-franchise-id: 550e8400-e29b-41d4-a716-446655440000"

# Probar webhook
curl -X POST "http://localhost:3004/api/webhooks/sync-to-crm" \
  -H "Content-Type: application/json" \
  -d '{"franchiseTenantId":"550e8400-...","firstName":"Test","email":"test@test.com"}'
```

---

## 📞 Troubleshooting Rápido

### "TWENTY_API_KEY not configured"
→ Ver Doppler, Variables faltantes

### "Twenty API key invalid"
→ Validar token exacto en Twenty.com → Settings → API Keys

### "Custom field not found"
→ Crear en Twenty.com → Settings → Custom Fields

### "Franchise not found"
→ UUID no existe en platform.tenants

### "Unauthorized"
→ Admin auth no implementado (ver Fase 5)

---

## 📚 Documentación de Referencia

```
Índice Completo de Docs:

docs/03-franchise/
├── README-NEXT-AGENT.md              ← COMIENZA AQUÍ
├── IMPLEMENTATION-CHECKLIST.md        ← GUÍA DETALLADA
├── ENVIRONMENT-SETUP.sh               ← Validación automática
├── crm-multitenant.md                 ← Técnico profundo
├── crm-architecture-diagram.md        ← Diagramas
├── admin-dashboard.md                 ← Dashboard features
├── revenue-sharing.md                 ← Modelo de ingresos
└── forms-system.md                    ← Sistema de formularios
```

---

## ✅ Checklist Final (Antes de Deploy)

```
CÓDIGO
[ ] npm run type-check --workspace=peskids
[ ] npm run lint --workspace=peskids
[ ] npm run build --workspace=peskids

CONFIGURACIÓN
[ ] TWENTY_API_KEY en Doppler
[ ] Custom field en Twenty
[ ] Vistas en Twenty

ENDPOINTS
[ ] GET /api/crm/search funciona
[ ] GET /api/admin/crm/contacts funciona
[ ] POST /api/webhooks/sync-to-crm funciona
[ ] Admin auth implementado

INTEGRACIÓN
[ ] Webhook en formularios
[ ] Sincronización end-to-end
[ ] Datos en Twenty

DEPLOY
[ ] All checks pasan
[ ] Staging funciona
[ ] Production ready
```

---

## 🎯 Estimación de Tiempo

| Tarea | Tiempo |
|-------|--------|
| Leer documentación | 15 min |
| Configurar Doppler | 15 min |
| Configurar Twenty | 30 min |
| Validar endpoints | 30 min |
| Implementar admin auth | 1 hora |
| Integrar con formularios | 30 min |
| Testing y validación | 1 hora |
| **Total** | **~4 horas** |

---

## 🚀 Resumen Ejecutivo

**Qué es:** CRM único en Twenty.com, dividido por `franchise_tenant_id`

**Por qué:** Reporting consolidado + Aislamiento de datos + Un solo costo

**Estado:** Código completo, esperando configuración y validación

**Próximo paso:** Ejecutar `ENVIRONMENT-SETUP.sh` y seguir `IMPLEMENTATION-CHECKLIST.md`

**Contacto anterior:** claude (si hay preguntas sobre implementación)

---

## 📌 Notas Importantes

- ✅ No hay secretos en código
- ✅ Todo va en Doppler
- ✅ Todos los endpoints tienen validación básica
- ⏳ Admin auth es TODO (crítico antes de deploy)
- ⏳ Integración con formularios es TODO
- 📖 Documentación completa y detallada

---

**¡Adelante! El código está listo. Solo falta configuración y validación.** 🚀
