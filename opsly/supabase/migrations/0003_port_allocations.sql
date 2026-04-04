CREATE TABLE platform.port_allocations (
  port integer PRIMARY KEY CHECK (
    port BETWEEN 8000 AND 19999
  ),
  tenant_id uuid REFERENCES platform.tenants (id) ON DELETE
  SET NULL,
    service text NOT NULL,
    allocated_at timestamptz DEFAULT now()
);
INSERT INTO platform.port_allocations (port, tenant_id, service)
SELECT s.port::integer,
  NULL::uuid,
  'available'
FROM generate_series(8000, 19999) AS s (port);