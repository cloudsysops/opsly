# Cursor Quick Start — Peskids Level-Up

**Tu objetivo:** Llevar Peskids del MVP actual a Mission Control level (5 días de intenso trabajo).

---

## 🚀 Empieza aquí (5 minutos)

```bash
# 1. Asegúrate de estar en la rama correcta
git checkout claude/peskids-cursor-avance-1ortri

# 2. Verifica estado actual
git status
git log --oneline -3

# 3. Instala dependencias si es necesario
npm install

# 4. Inicia dev server (puerto 3004)
npm run dev

# 5. Abre http://localhost:3004/admin en tu navegador
```

---

## 📚 Documentación clave

1. **Plan maestro:** Lee `docs/PESKIDS-LEVEL-UP-PLAN.md` (este directorio)
   - Contiene 20 tareas específicas en 5 fases
   - Timeline: 27–35 horas

2. **DB Schema:** Lee `docs/tenants/peskids/DATA-MODEL.md`
   - Tablas: `leads`, `parents`, `students`, `teachers`, `classes`, `followups`, `sync_alerts`

3. **Código existente:** 
   - Admin components: `components/admin/`
   - API routes: `app/api/`
   - Services: `lib/services/`

4. **CLAUDE.md local:** `CLAUDE.md` en raíz de Peskids

---

## 🎯 Orden recomendado de trabajo

### **Día 1–2: Fase 1 (KPIs y Header)**

**Priority:**
1. **Tarea 1.1:** Renovar `components/admin/admin-shell.tsx`
   - Agregar búsqueda, bell icon, botón Admin, avatar
   - **Archivos a modificar:** `components/admin/admin-shell.tsx`
   - **Tiempo:** 2–3h

2. **Tarea 1.2:** Crear KPI components
   - Crear `components/admin/kpi-card.tsx` (nuevo)
   - Crear `components/admin/kpi-strip.tsx` (nuevo)
   - **Tiempo:** 3–4h

3. **Tarea 1.3:** Crear endpoint `/api/admin/kpis`
   - Crear `app/api/admin/kpis/route.ts` (nuevo)
   - Query leads sin contactar, pruebas pendientes, seguimientos vencidos
   - **Tiempo:** 1–2h

4. **Tarea 1.4:** Integrar en dashboard
   - Mejorar `app/admin/page.tsx`
   - **Tiempo:** 1h

**Commits después de cada tarea:**
```bash
git add -A
git commit -m "feat(peskids): 1.1 renovar admin shell header"
git push origin claude/peskids-cursor-avance-1ortri

git commit -m "feat(peskids): 1.2 crear kpi components"
git push origin claude/peskids-cursor-avance-1ortri

# etc...
```

### **Día 3: Fase 2 (Pipeline Kanban)**

1. **Tarea 2.1:** Mejorar `lead-pipeline-kanban.tsx` (refactor)
   - **Tiempo:** 2–3h

2. **Tarea 2.2:** Crear gráfico de rendimiento
   - Crear `components/admin/pipeline-performance-chart.tsx`
   - **Tiempo:** 2–3h

3. **Tarea 2.3:** Endpoint `/api/admin/pipeline-stats`
   - **Tiempo:** 1–2h

### **Día 4–5: Fases 3–5 (Panels + Layout)**

En paralelo:
- **Tarea 3.x:** Immediate attention panel
- **Tarea 4.x:** Automations + Agents panels
- **Tarea 5.x:** Layout final + estilos

---

## 💾 Comandos Git (repite después de cada tarea)

```bash
# Ver cambios
git status
git diff --stat

# Type check (antes de commit)
npm run type-check

# Agregar y commitear
git add -A
git commit -m "feat(peskids): [TASK-X.X] descripción corta"

# Push
git push origin claude/peskids-cursor-avance-1ortri

# Ver rama
bash scripts/git-session-brief.sh
```

---

## 📐 Componente Template (copiar y adaptar)

```typescript
// components/admin/my-new-component.tsx
import { FC } from 'react';
import { Card } from '@/components/ui/card'; // usa componentes existentes

interface MyNewComponentProps {
  data?: any;
  isLoading?: boolean;
}

export const MyNewComponent: FC<MyNewComponentProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return <div className="animate-pulse">Cargando...</div>;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Mi componente</h3>
      {/* Tu contenido aquí */}
    </Card>
  );
};
```

---

## 🔧 Endpoint Template

```typescript
// app/api/admin/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_slug', 'peskids')
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Request failed' },
      { status: 500 }
    );
  }
}
```

---

## ⚠️ Reglas importantes

✅ **SIEMPRE:**
- Filtrar queries por `tenant_slug = 'peskids'`
- Correr `npm run type-check` antes de commit
- Usar types específicos (no `any`)
- Reutilizar componentes de `components/ui/`

❌ **NUNCA:**
- Hardcodear dominios o secrets
- Pushear a `main` directamente
- Saltar validación de entrada
- Dejar `any` types

---

## 🧪 Testing rápido

```bash
# Type check
npm run type-check

# Build test
npm run build

# Dev server (para testing manual)
npm run dev
# Abre http://localhost:3004/admin
```

---

## 🆘 Si algo se rompe

1. **Revisa errores:** `npm run type-check`
2. **Rollback último commit:** `git reset --soft HEAD~1`
3. **Limpia cambios:** `git restore .`
4. **Pide help:** Menciona la tarea y el error

---

## 📊 Progress checklist

Usa esto para auto-reporte después de cada phase:

```markdown
## Fase 1 (KPIs y Header)
- [x] 1.1 Header renovado
- [x] 1.2 KPI components
- [x] 1.3 Endpoint /api/admin/kpis
- [x] 1.4 Integración en dashboard

## Fase 2 (Pipeline)
- [ ] 2.1 Kanban mejorado
- [ ] 2.2 Performance chart
- [ ] 2.3 Pipeline stats endpoint

## Fase 3–5
- [ ] ...
```

---

## 🎨 Referencia de diseño

**Colores Peskids (Tailwind):**
- Primary: `blue-500` / `blue-600`
- Success: `green-500`
- Warning: `amber-500`
- Danger: `red-500`
- Background dark: `slate-950`

**Iconos:** Usa Lucide React (`lucide-react` package)

```typescript
import { AlertCircle, TrendingUp, Users } from 'lucide-react';

<AlertCircle className="w-6 h-6 text-red-500" />
```

---

## 📞 Quick links

- Mockup 1 (Kanban): `/root/.claude/uploads/.../a36c333a-...png`
- Mockup 2 (Ejecutiva): `/root/.claude/uploads/.../dff8b492-...png`
- Plan maestro: `docs/PESKIDS-LEVEL-UP-PLAN.md`
- DB Schema: `docs/tenants/peskids/DATA-MODEL.md`
- Rama: `claude/peskids-cursor-avance-1ortri`

---

## ✨ Tips pro

1. **Commit después de CADA tarea** (no al final del día)
2. **Test en navegador mientras desarrollas** (`npm run dev`)
3. **Reutiliza componentes** antes de crear nuevos
4. **Documenta cambios grandes** en comentarios
5. **Push frecuente** para no perder trabajo

---

**¡Vamos a llevar Peskids al siguiente nivel! 🚀**

Comienza por Tarea 1.1 (Header) — es la más visible y te dará momentum.

**Contacto:** cboteros1@gmail.com  
**Fecha:** 2026-08-07
