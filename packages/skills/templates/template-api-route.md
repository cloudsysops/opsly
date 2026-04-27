---
title: 'API Route Template'
description: 'Plantilla para crear rutas API con tests asociados'
category: backend
tags: [api, route, test, vitest, fastify]
created_at: 2026-04-15
updated_at: 2026-04-15
---

# Plantilla: API Route con Tests

## Estructura de Archivos

```
src/
├── routes/
│   └── {{route-name}}.ts        # Implementación de la ruta
├── routes.test/
│   └── {{route-name}}.test.ts   # Tests unitarios
└── schema/
    └── {{route-name}}.schema.ts # Zod schemas (si aplica)
```

## Implementación de la Ruta

```typescript
// src/routes/{{route-name}}.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// ============================================================
// SCHEMA: Define el contrato de entrada/salida
// ============================================================

const {{routeName}}QuerySchema = z.object({
  // Ejemplo: id: z.string().uuid(),
});

const {{routeName}}ResponseSchema = z.object({
  // Define la estructura de respuesta
});

type {{routeName}}Query = z.infer<typeof {{routeName}}QuerySchema>;

// ============================================================
// HANDLER: Lógica principal de la ruta
// ============================================================

export async function {{routeName}}Handler(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Querystring: {{routeName}}Query }>,
  reply: FastifyReply
) {
  try {
    // 1. Validar input (ya hecho por Fastify con schema)
    const params = request.query;

    // 2. Ejecutar lógica de negocio
    // const result = await someService(params);

    // 3. Responder
    return reply.code(200).send({
      success: true,
      data: result,
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      success: false,
      error: 'Internal Server Error',
    });
  }
}

// ============================================================
// ROUTE REGISTRY: Registro de la ruta
// ============================================================

export async function routePlugin(fastify: FastifyInstance) {
  fastify.get(
    '/{{url-path}}',
    {
      schema: {
        querystring: {{routeName}}QuerySchema,
        response: {
          200: {{routeName}}ResponseSchema,
        },
      },
    },
    {{routeName}}Handler
  );
}
```

## Tests Unitarios

```typescript
// src/routes.test/{{route-name}}.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { routePlugin } from '../routes/{{route-name}}.ts';

describe('{{routeName}} API Route', () => {
  let app: Fastify.FastifyInstance;

  // ============================================================
  // SETUP: Inicializa Fastify con el plugin de rutas
  // ============================================================
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(routePlugin);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================
  // TEST: Respuesta exitosa con parámetros válidos
  // ============================================================
  it('debería retornar 200 con datos válidos', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/{{url-path}}?param=value',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  // ============================================================
  // TEST: Validación de parámetros inválidos
  // ============================================================
  it('debería retornar 400 con parámetros inválidos', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/{{url-path}}?invalid-param',
    });

    expect(response.statusCode).toBe(400);
  });

  // ============================================================
  // TEST: Manejo de errores del servidor
  // ============================================================
  it('debería retornar 500 si hay error interno', async () => {
    // Configurar mock para simular error
    const response = await app.inject({
      method: 'GET',
      url: '/{{url-path}}',
    });

    expect(response.statusCode).toBe(500);
  });
});
```

## Ejemplos de Input/Output

### GET /{{url-path}}

**Input:**

```
GET /{{url-path}}?page=1&limit=10
```

**Output (200):**

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0
    }
  }
}
```

**Output (400):**

```json
{
  "success": false,
  "error": "Validation Error",
  "details": []
}
```

## Checklist de Validación

- [ ] La ruta está registrada en el archivo principal de rutas
- [ ] El schema de Query define todos los parámetros requeridos/opcionales
- [ ] El schema de Response cubre todos los casos de éxito (200, 201, etc.)
- [ ] Los tests cubren caso éxito (200)
- [ ] Los tests cubren caso error de validación (400)
- [ ] Los tests cubren caso error interno (500)
- [ ] Los tests usan `app.inject()` para pruebas sin servidor real
- [ ] Los tests limpian recursos en `afterAll`
- [ ] La ruta tiene documentación JSDoc si es necesaria
- [ ] Se ejecutó `npm run lint` y no hay errores
- [ ] Se ejecutó `npm run test` y todos los tests pasan
