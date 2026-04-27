---
title: 'MCP Tool Template'
description: 'Plantilla para tools MCP con OAuth y autenticación'
category: mcp
tags: [mcp, tool, oauth, authentication, claude]
created_at: 2026-04-15
updated_at: 2026-04-15
---

# Plantilla: MCP Tool con OAuth

## Estructura de Archivos

```
src/mcp/
├── tools/
│   ├── {{tool-name}}.ts           # Implementación de la tool
│   └── {{tool-name}}.test.ts      # Tests
├── schemas/
│   └── {{tool-name}}.schema.ts    # Zod schemas de input/output
├── oauth/
│   └── {{oauth-provider}}.ts      # Configuración OAuth
└── index.ts                       # Registro de tools
```

## Implementación de la Tool

```typescript
// src/mcp/tools/{{tool-name}}.ts
import { z } from 'zod';
import type { MCPTool } from '@modelcontextprotocol/sdk';

// ============================================================
// SCHEMA: Define el contrato de entrada (input schema)
// ============================================================

export const {{toolName}}InputSchema = z.object({
  // Parámetros que el usuario debe proporcionar
  // Ejemplo:
  // resource_id: z.string().describe('ID del recurso a obtener'),
  // include_related: z.boolean().optional().describe('Incluir recursos relacionados'),
});

export type {{toolName}}Input = z.infer<typeof {{toolName}}InputSchema>;

// ============================================================
// SCHEMA: Define el contrato de salida (output schema)
// ============================================================

export const {{toolName}}OutputSchema = z.object({
  // Estructura de la respuesta
  // Ejemplo:
  // id: z.string(),
  // name: z.string(),
  // created_at: z.string().datetime(),
});

export type {{toolName}}Output = z.infer<typeof {{toolName}}OutputSchema>;

// ============================================================
// CONFIGURACIÓN OAUTH: Define el flujo de autenticación
// ============================================================

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

// Obtiene el token desde el contexto de ejecución
async function getAccessToken(context: ToolContext): Promise<string> {
  const token = context.auth?.accessToken;
  if (!token) {
    throw new Error('OAuth token not available. Please authenticate first.');
  }
  return token;
}

// ============================================================
// HANDLER: Lógica principal de la tool
// ============================================================

export async function {{toolName}}Handler(
  input: {{toolName}}Input,
  context: { auth?: { accessToken: string; refreshToken?: string } }
): Promise<{{toolName}}Output> {
  // 1. Obtener token de acceso
  const accessToken = await getAccessToken(context as any);

  // 2. Validar input (ya hecho por Zod)
  const { resource_id, include_related } = input;

  // 3. Llamar a la API externa
  const response = await fetch(`https://api.example.com/v1/resources/${resource_id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // 4. Transformar respuesta al formato de salida
  return {
    id: data.id,
    name: data.name,
    created_at: data.created_at,
  };
}

// ============================================================
// MCP TOOL DEFINITION: Define metadata para el registry
// ============================================================

export const {{toolName}}Tool: MCPTool = {
  name: '{{tool-name}}',
  description: 'Descripción de qué hace esta tool. Incluye el comportamiento esperado.',
  inputSchema: {
    type: 'object',
    properties: {
      // Mapea el schema de Zod a JSON Schema para MCP
      resource_id: {
        type: 'string',
        description: 'ID del recurso a obtener',
      },
      include_related: {
        type: 'boolean',
        description: 'Incluir recursos relacionados',
      },
    },
    required: ['resource_id'],
  },
};
```

## Configuración OAuth (OAuth Config Schema)

```typescript
// src/mcp/oauth/{{oauth-provider}}.ts
import { z } from 'zod';

export const OAuthProviderSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  authorizationUrl: z.string().url(),
  tokenUrl: z.string().url(),
  scopes: z.array(z.string()),
  // Redirect URI debe coincidir con la configuración en el servidor OAuth
  redirectUri: z.string().url().optional(),
});

export interface OAuthProviderConfig extends z.infer<typeof OAuthProviderSchema> {
  // Propiedades adicionales específicas del provider
  issuer?: string;
  refreshTokenEndpoint?: string;
}

// ============================================================
// EJEMPLO: Configuración para Google OAuth
// ============================================================

export const googleOAuthConfig: OAuthProviderConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
  redirectUri: process.env.OAUTH_REDIRECT_URI,
};
```

## Tests Unitarios

```typescript
// src/mcp/tools/{{tool-name}}.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { {{toolName}}Handler, {{toolName}}InputSchema } from '../{{tool-name}}.ts';

describe('{{toolName}} MCP Tool', () => {
  // Mock del contexto con token
  const mockContext = {
    auth: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    },
  };

  // ============================================================
  // TEST: Input válido retorna datos correctos
  // ============================================================
  it('debería retornar datos del recurso exitosamente', async () => {
    // Mock de fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'resource-123',
        name: 'Test Resource',
        created_at: '2026-04-15T10:00:00Z',
      }),
    });

    const result = await {{toolName}}Handler(
      { resource_id: 'resource-123' },
      mockContext as any
    );

    expect(result.id).toBe('resource-123');
    expect(result.name).toBe('Test Resource');
  });

  // ============================================================
  // TEST: Input inválido lanza error de validación
  // ============================================================
  it('debería lanzar error con input inválido', async () => {
    const invalidInput = { resource_id: '' }; // Vacío, no es válido

    expect(() => {
      {{toolName}}InputSchema.parse(invalidInput);
    }).toThrow();
  });

  // ============================================================
  // TEST: Error de API se maneja correctamente
  // ============================================================
  it('debería lanzar error cuando la API falla', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    });

    await expect(
      {{toolName}}Handler({ resource_id: 'invalid' }, mockContext as any)
    ).rejects.toThrow('API error: 404');
  });

  // ============================================================
  // TEST: Sin token de acceso lanza error
  // ============================================================
  it('debería lanzar error si no hay token de acceso', async () => {
    await expect(
      {{toolName}}Handler({ resource_id: '123' }, { auth: undefined } as any)
    ).rejects.toThrow('OAuth token not available');
  });
});
```

## Ejemplos de Input/Output

### Input (desde Claude)

```json
{
  "resource_id": "res_abc123",
  "include_related": true
}
```

### Output

```json
{
  "id": "res_abc123",
  "name": "My Resource",
  "created_at": "2026-04-15T10:00:00Z"
}
```

### Error

```json
{
  "error": "API error: 401 - Unauthorized",
  "code": "UNAUTHORIZED"
}
```

## Checklist de Validación

- [ ] El schema de input tiene todos los campos requeridos marcados
- [ ] El schema de output define la estructura completa de respuesta
- [ ] El handler valida el token de acceso antes de hacer requests
- [ ] Los errores de API se traducen a mensajes claros
- [ ] La tool tiene descripción clara en el campo `description`
- [ ] Los tests cubren caso éxito
- [ ] Los tests cubren caso error de validación
- [ ] Los tests cubren caso error de API (4xx, 5xx)
- [ ] Los tests cubren caso sin token (auth undefined)
- [ ] La configuración OAuth está documentada
- [ ] Los scopes OAuth están claros y documentados
- [ ] Se ejecutó lint y no hay errores
- [ ] Se ejecutaron los tests y pasan
