---
title: "SQL Migration Template"
description: "Plantilla para migraciones SQL idempotentes con rollback"
category: database
tags: [sql, migration, postgres, schema, rollback]
created_at: 2026-04-15
updated_at: 2026-04-15
---

# Plantilla: Migration SQL

## Estructura de Archivos

```
migrations/
├── 000001_add_users_table.up.sql     # Migration adelante
├── 000001_add_users_table.down.sql   # Rollback
└── 000002_alter_users_table.up.sql   # Ejemplo de alteración
```

## Migration: Crear Tabla

```sql
-- ============================================================
-- MIGRATION: 000001_create_{{table_name}}_table
-- DESC:      Crear tabla {{table_name}} con auditoría
-- AUTHOR:    Opsly Team
-- DATE:      2026-04-15
-- ============================================================

-- --------------------------------------------------------
-- UP: Create table
-- --------------------------------------------------------

-- Verificar si la tabla ya existe (idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = '{{table_name}}'
  ) THEN
    CREATE TABLE {{table_name}} (
      -- Primary key
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Timestamps con timezone
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Datos de la tabla (ajustar según necesidad)
      -- Ejemplo:
      -- name VARCHAR(255) NOT NULL,
      -- email VARCHAR(255) UNIQUE NOT NULL,
      -- status VARCHAR(50) DEFAULT 'active',
      -- metadata JSONB DEFAULT '{}'::jsonb,
      
      -- Foreign keys (si aplica)
      -- organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      
      -- Constraints
      -- CONSTRAINT {{table_name}}_pkey PRIMARY KEY (id)
    );

    -- Agregar comentarios para documentación
    COMMENT ON TABLE {{table_name}} IS 'Tabla para almacenar {{description}}';
    
    -- Crear índices para optimizar queries comunes
    -- CREATE INDEX idx_{{table_name}}_organization_id ON {{table_name}}(organization_id);
    -- CREATE INDEX idx_{{table_name}}_status ON {{table_name}}(status);
    -- CREATE UNIQUE INDEX idx_{{table_name}}_email ON {{table_name}}(email) WHERE deleted_at IS NULL;
    
    RAISE NOTICE 'Table {{table_name}} created successfully';
  ELSE
    RAISE NOTICE 'Table {{table_name}} already exists, skipping';
  END IF;
END $$;

-- --------------------------------------------------------
-- DOWN: Rollback (reverse operations in exact order)
-- --------------------------------------------------------

-- Drop índices primero (orden inverso a creación)
-- DROP INDEX IF EXISTS idx_{{table_name}}_email;
-- DROP INDEX IF EXISTS idx_{{table_name}}_status;
-- DROP INDEX IF EXISTS idx_{{table_name}}_organization_id;

-- Drop tabla (si existe)
DROP TABLE IF EXISTS {{table_name}} CASCADE;

-- ============================================================
-- EJEMPLO SPECÍFICO: Tabla de usuarios
-- ============================================================

-- Migration: 000001_create_users_table.up.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'users'
  ) THEN
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar_url TEXT,
      role VARCHAR(50) DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      last_login_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    -- Índices
    CREATE INDEX idx_users_org ON users(organization_id);
    CREATE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
    CREATE INDEX idx_users_status ON users(is_active) WHERE deleted_at IS NULL;

    -- Trigger para updated_at automático
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    COMMENT ON TABLE users IS 'Usuarios de la plataforma con autenticación';
    RAISE NOTICE 'Table users created successfully';
  ELSE
    RAISE NOTICE 'Table users already exists, skipping';
  END IF;
END $$;
```

## Migration: Añadir Columna

```sql
-- ============================================================
-- MIGRATION: 000002_add_column_to_{{table_name}}
-- DESC:      Añadir columna {{column_name}} a {{table_name}}
-- DATE:      2026-04-15
-- ============================================================

-- --------------------------------------------------------
-- UP: Add column
-- --------------------------------------------------------

-- Añadir columna solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = '{{table_name}}' 
    AND column_name = '{{column_name}}'
  ) THEN
    ALTER TABLE {{table_name}} 
    ADD COLUMN {{column_name}} {{data_type}} {{constraints}};
    
    -- Ejemplo:
    -- ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    -- ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    COMMENT ON COLUMN {{table_name}}.{{column_name}} IS '{{description}}';
    RAISE NOTICE 'Column {{column_name}} added to {{table_name}}';
  ELSE
    RAISE NOTICE 'Column {{column_name}} already exists in {{table_name}}, skipping';
  END IF;
END $$;

-- --------------------------------------------------------
-- DOWN: Remove column
-- --------------------------------------------------------

ALTER TABLE {{table_name}} DROP COLUMN IF EXISTS {{column_name}};
```

## Migration: Añadir Foreign Key

```sql
-- ============================================================
-- MIGRATION: 000003_add_fk_to_{{table_name}}
-- DESC:      Añadir foreign key a {{table_name}}
-- DATE:      2026-04-15
-- ============================================================

-- --------------------------------------------------------
-- UP: Add foreign key
-- --------------------------------------------------------

DO $$
BEGIN
  -- Verificar que no exista ya la constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = '{{table_name}}_{{column_name}}_fkey'
  ) THEN
    ALTER TABLE {{table_name}}
    ADD CONSTRAINT {{table_name}}_{{column_name}}_fkey
    FOREIGN KEY ({{column_name}})
    REFERENCES {{referenced_table}}(id)
    ON DELETE {{on_delete}}  -- CASCADE, SET NULL, RESTRICT, NO ACTION
    ON UPDATE {{on_update}}; -- CASCADE, SET NULL, RESTRICT, NO ACTION
    
    RAISE NOTICE 'Foreign key {{table_name}}_{{column_name}}_fkey created';
  ELSE
    RAISE NOTICE 'Foreign key already exists, skipping';
  END IF;
END $$;

-- --------------------------------------------------------
-- DOWN: Remove foreign key
-- --------------------------------------------------------

ALTER TABLE {{table_name}} DROP CONSTRAINT IF EXISTS {{table_name}}_{{column_name}}_fkey;
```

## Migration con Datos (Seed)

```sql
-- ============================================================
-- MIGRATION: 000004_seed_{{table_name}}
-- DESC:      Insertar datos iniciales en {{table_name}}
-- DATE:      2026-04-15
-- ============================================================

-- --------------------------------------------------------
-- UP: Insert data
-- --------------------------------------------------------

-- Insertar solo si no existen datos (idempotency)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM {{table_name}} LIMIT 1) THEN
    INSERT INTO {{table_name}} (id, name, description, created_at, updated_at)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', 'Admin', 'Rol de administrador', NOW(), NOW()),
      ('22222222-2222-2222-2222-222222222222', 'User', 'Rol de usuario estándar', NOW(), NOW()),
      ('33333333-3333-3333-3333-333333333333', 'Guest', 'Rol de invitado', NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Seed data inserted into {{table_name}}';
  ELSE
    RAISE NOTICE 'Table {{table_name}} already has data, skipping seed';
  END IF;
END $$;

-- --------------------------------------------------------
-- DOWN: Clear data
-- --------------------------------------------------------

-- Opcional: limpiar datos (cuidado con datos existentes)
-- DELETE FROM {{table_name}};
```

## Ejecución de Migrations

```bash
# Usando PostgreSQL diretamente
psql -h localhost -U postgres -d mydb -f migrations/000001_create_users_table.up.sql

# Con migrate CLI
migrate -path migrations -database "postgres://user:pass@localhost:5432/mydb" up

# Con Node/Knex
npx knex migrate:latest

# Con Node/Prisma
npx prisma migrate deploy
```

## Checklist de Validación

- [ ] Cada migration tiene su archivo `.up.sql` y `.down.sql` pareado
- [ ] Los archivos siguen el patrón `000XXX_description.up.sql`
- [ ] Las migrations son idempotentes (verifican existencia antes de crear)
- [ ] Las foreign keys tienen `ON DELETE` y `ON UPDATE` explícitos
- [ ] Todas las tablas tienen `id`, `created_at`, `updated_at`
- [ ] Las columnas `updated_at` se actualizan con trigger
- [ ] Los índices cubren las queries más comunes
- [ ] Las columnas sensibles tienen comentarios (PII warning)
- [ ] El archivo `down.sql` revierte exactamente el `up.sql` en orden inverso
- [ ] Se probó la migration en entorno de staging
- [ ] Se probó el rollback en staging
- [ ] La migration no bloquea tablas grandes (usar CONCURRENTLY para índices)
- [ ] Se documentó la razón de la migration en comments