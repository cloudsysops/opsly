---
title: 'Vitest Test Template'
description: 'Plantilla para tests unitarios con Vitest'
category: testing
tags: [test, vitest, unit, integration, mock]
created_at: 2026-04-15
updated_at: 2026-04-15
---

# Plantilla: Test Vitest

## Estructura de Archivos

```
src/
├── utils/
│   ├── string.ts           # Implementación
│   └── string.test.ts      # Tests
├── services/
│   ├── user.service.ts     # Implementación
│   └── user.service.test.ts # Tests con mocks
└── __mocks__/
    └── external-lib.ts     # Mocks de dependencias externas
```

## Test Básico (Unit Test)

```typescript
// src/utils/{{module-name}}.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { {{functionName}} } from '../{{module-name}}.ts';

describe('{{ModuleName}}', () => {
  // ============================================================
  // SETUP: Variables reutilizables en todos los tests
  // ============================================================

  describe('{{functionName}}', () => {
    // ============================================================
    // TEST: Comportamiento esperado con input válido
    // ============================================================

    it('debería retornar resultado esperado cuando el input es válido', () => {
      // Arrange
      const input = 'test-input';
      const expected = 'expected-output';

      // Act
      const result = {{functionName}}(input);

      // Assert
      expect(result).toBe(expected);
    });

    // ============================================================
    // TEST: Comportamiento con edge cases
    // ============================================================

    it('debería manejar input vacío correctamente', () => {
      const result = {{functionName}}('');
      expect(result).toBe('');
    });

    // ============================================================
    // TEST: Comportamiento con tipos de datos específicos
    // ============================================================

    it('debería lanzar error con input inválido', () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      expect(() => {{functionName}}(invalidInput)).toThrow();
    });
  });
});
```

## Test con Mocks (Service Test)

```typescript
// src/services/{{service-name}}.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { {{ServiceName}}Service } from './{{service-name}}.service.ts';

// ============================================================
// MOCKS: Dependencies externas
// ============================================================

// Mock de una dependencia externa
vi.mock('../external-api.ts', () => ({
  ExternalApi: {
    fetch: vi.fn(),
  },
}));

// Mock de una librería externa (automático con Vitest)
vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-123',
}));

describe('{{ServiceName}}Service', () => {
  let service: {{ServiceName}}Service;

  // ============================================================
  // SETUP: Inicializar servicio antes de cada test
  // ============================================================

  beforeEach(() => {
    service = new {{ServiceName}}Service();
    // Resetear todos los mocks antes de cada test
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    // ============================================================
    // TEST: Crear usuario exitosamente
    // ============================================================

    it('debería crear un usuario y retornar el resultado', async () => {
      // Arrange
      const mockUserData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      // Configurar mock de la dependencia
      const { ExternalApi } = await import('../external-api.ts');
      vi.mocked(ExternalApi.fetch).mockResolvedValue({
        id: 'user-123',
        ...mockUserData,
        created_at: '2026-04-15T10:00:00Z',
      });

      // Act
      const result = await service.createUser(mockUserData);

      // Assert
      expect(result).toEqual({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(ExternalApi.fetch).toHaveBeenCalledTimes(1);
      expect(ExternalApi.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockUserData),
        })
      );
    });

    // ============================================================
    // TEST: Manejar error de API
    // ============================================================

    it('debería lanzar error cuando la API falla', async () => {
      // Arrange
      const { ExternalApi } = await import('../external-api.ts');
      vi.mocked(ExternalApi.fetch).mockRejectedValue(
        new Error('Network error')
      );

      // Act & Assert
      await expect(service.createUser({ name: 'Test', email: 'test@test.com' }))
        .rejects.toThrow('Failed to create user');
    });
  });

  describe('getUser', () => {
    // ============================================================
    // TEST: Obtener usuario por ID
    // ============================================================

    it('debería obtener un usuario por ID', async () => {
      // Arrange
      const userId = 'user-123';
      const { ExternalApi } = await import('../external-api.ts');

      vi.mocked(ExternalApi.fetch).mockResolvedValue({
        id: userId,
        name: 'John Doe',
      });

      // Act
      const result = await service.getUser(userId);

      // Assert
      expect(result).toEqual({
        id: userId,
        name: 'John Doe',
      });
    });

    // ============================================================
    // TEST: Retornar null si el usuario no existe
    // ============================================================

    it('debería retornar null si el usuario no existe', async () => {
      // Arrange
      const { ExternalApi } = await import('../external-api.ts');
      vi.mocked(ExternalApi.fetch).mockResolvedValue(null);

      // Act
      const result = await service.getUser('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });
});
```

## Test de Componente (Vue/React)

```typescript
// src/components/{{ComponentName}}.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { {{ComponentName}} } from './{{ComponentName}}.vue';

describe('{{ComponentName}}', () => {
  // ============================================================
  // TEST: Renderizado del componente
  // ============================================================

  it('debería renderizar el componente correctamente', () => {
    render({{ComponentName}}, {
      props: {
        title: 'Test Title',
      },
    });

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  // ============================================================
  // TEST: Interacción del usuario (click)
  // ============================================================

  it('debería llamar a onClick cuando se hace click', async () => {
    const onClick = vi.fn();

    render({{ComponentName}}, {
      props: {
        onClick,
      },
    });

    await fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // ============================================================
  // TEST: Estado del componente
  // ============================================================

  it('debería mostrar estado de loading cuando está cargando', () => {
    render({{ComponentName}}, {
      props: {
        isLoading: true,
      },
    });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

## Test de Integración (API)

```typescript
// src/api/{{endpoint}}.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from 'fastify';
import { app } from '../../app.ts';
import { routePlugin } from '../../routes/{{route}}.ts';

describe('API Integration: {{route}}', () => {
  let client: ReturnType<typeof createTestClient>;

  // ============================================================
  // SETUP: Inicializar Fastify para tests de integración
  // ============================================================

  beforeAll(async () => {
    await app.register(routePlugin);
    await app.ready();
    client = createTestClient(app);
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================
  // TEST: Endpoint GET exitoso
  // ============================================================

  it('GET /{{path}} debería retornar 200 con datos', async () => {
    const response = await client.get('/{{path}}');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('data');
  });

  // ============================================================
  // TEST: Endpoint POST con validación
  // ============================================================

  it('POST /{{path}} debería retornar 400 con payload inválido', async () => {
    const response = await client.post('/{{path}}').send({
      invalidField: 'value',
    });

    expect(response.statusCode).toBe(400);
  });
});
```

## Utilidades y Patrones Comunes

```typescript
// ============================================================
// PATRON: Testing singleton con beforeEach
// ============================================================
const mockConfig = {
  apiUrl: 'http://localhost:3000',
  timeout: 5000,
};

// ============================================================
// PATRON: Snapshots para estructuras complejas
// ============================================================
it('debería generar la estructura correcta', () => {
  const result = generateStructure();
  expect(result).toMatchSnapshot();
});

// ============================================================
// PATRON: Tests asíncronos con waitFor
// ============================================================
import { waitFor } from '@testing-library/vue';

it('debería actualizar el DOM después de async operation', async () => {
  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});

// ============================================================
// PATRON: Test con timer (jest fake timers)
// ============================================================
it('debería ejecutar callback después de delay', async () => {
  vi.useFakeTimers();

  const callback = vi.fn();
  setTimeout(callback, 1000);

  vi.advanceTimersByTime(1000);

  expect(callback).toHaveBeenCalled();

  vi.useRealTimers();
});
```

## Checklist de Validación

- [ ] Cada archivo de código tiene su archivo de test correspondiendo (`*.test.ts`)
- [ ] Los tests usan `describe` para agrupar funcionalidad relacionada
- [ ] Cada test tiene nombre claro que describe qué prueba (formato: "debería...")
- [ ] Los tests siguen el patrón Arrange-Act-Assert (AAA)
- [ ] Las dependencias externas están mockeadas con `vi.mock()`
- [ ] Los mocks se limpian con `vi.clearAllMocks()` en beforeEach
- [ ] Los tests son independientes entre sí (no dependen de orden)
- [ ] Los tests asíncronos usan `async/await` correctamente
- [ ] Se usa `toHaveBeenCalledTimes`, `toHaveBeenCalledWith` para verificar llamadas
- [ ] Los tests de error usan `.rejects.toThrow()`
- [ ] Los tests cubran casos edge: empty, null, undefined, max values
- [ ] Se ejecutó `npm run test` y todos los tests pasan
- [ ] Se ejecutó `npm run test:coverage` y coverage > 80%
