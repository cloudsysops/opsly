# ADR-058: Contrato canónico del dominio Franchise

- Estado: aceptado para la reconciliación
- Fecha: 2026-09-04
- Alcance: `@intcloudsysops/franchise-core` y `@intcloudsysops/franchise-persistence`

## Decisión

`franchise-core` es el contrato canónico. Persistence es un adaptador explícito entre
las filas de `platform` y los objetos del dominio; no expone filas SQL ni mantiene
una segunda versión del dominio.

La migración `supabase/migrations/0098_franchise_core.sql` es la representación
durable vigente. Por eso:

- dinero se representa como `number` decimal con escala de dos decimales;
- porcentajes se representan en puntos porcentuales (`5` significa `5%`);
- territorios usan `type` + `geo` (`GeoReference`), no `geometry`;
- acuerdos usan `state`; sus unidades viven en `franchise_agreement_units`;
- cálculos de regalía conservan sus campos desglosados y snapshots JSON;
- auditorías son `FranchiseAudit`, con hallazgos y acciones correctivas del Core.

Los nombres `*_minor`, `percentageBps`, `geometry`, `status` y `idempotency_key`
pertenecen al adaptador legado y no se introducen en el contrato canónico. La
idempotencia de cálculos se resuelve con `(tenant_id, unit_id, sales_report_id,
rule_version)`, que es la clave durable disponible en 0098.

## Consecuencias

Las conversiones de nombres y de JSON están confinadas a los mappers de
`franchise-persistence`. No se crea una migración nueva ni se aplican migraciones
de producción en esta decisión. Cualquier consumidor que aún use nombres legacy
debe migrar a través de su propio adaptador y no modificar Core para compilar.

La prueba live de Postgres requiere una URL efímera/local (`FRANCHISE_TEST_DATABASE_URL`);
la ausencia de esa dependencia no se convierte en una prueba simulada.
