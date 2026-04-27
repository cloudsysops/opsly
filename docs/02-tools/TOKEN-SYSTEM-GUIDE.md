# Guía: tokens, costes y ahorro en Opsly

## Para usuarios y agentes

### Cómo se mide hoy el uso

- Las llamadas pasan por el **LLM Gateway**; se registran **coste en USD** y uso de tokens del proveedor (donde aplique) en **`usage_events`**.
- **Planes** (`startup`, `business`, `enterprise`) tienen límites orientativos en `PLAN_BUDGETS` (tokens/coste mensual).
- Puedes definir un **tope mensual en USD** por tenant (portal) y recibir comportamiento de **alerta** y **forzar modelo más barato** al acercarte al límite.

### Cómo “ahorra” la plataforma automáticamente

1. **Caché:** respuestas repetidas similares no vuelven a llamar al proveedor (TTL configurable).
2. **Routing:** preferencia **`cost`** (`routing_bias`) cuando no fijas modelo — prioriza cadenas más baratas.
3. **Complejidad:** tareas simples pueden ir a **Ollama local** o modelos baratos (`cheap`).
4. **Presupuesto:** al acercarte al máximo, el gateway puede **forzar** rutas más económicas.

### Qué **no** existe aún en producción

- **Wallet prepago** (“cargar $50 → 5500 tokens abstractos”) como única forma de uso.
- **Panel admin** dedicado solo a “wallet de tokens” con bonus por tier.

Eso puede ser evolución de producto; la fuente de verdad sigue siendo **USD + planes + Stripe** según `VISION.md`.

### Buenas prácticas

- Pedir `routing_bias=cost` cuando la calidad máxima no sea crítica.
- Reutilizar patrones de prompt para **más hits de caché**.
- Para límites duros, configurar **presupuesto mensual** en el portal del tenant.

## Comandos útiles (desarrollo)

```bash
npm run type-check
```

## Más detalle

- `docs/TOKEN-BILLING-SYSTEM.md` — diseño completo y estado.
- `docs/LLM-GATEWAY.md` — proveedores, caché, `routing_bias`.
