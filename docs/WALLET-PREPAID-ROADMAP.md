# Wallet prepago — roadmap

## Estado: pausado (según ADR-017)

El wallet prepago con tokens o saldo reutilizable requiere prerequisitos que aún no están cerrados.

### Prerequisitos pendientes

- [ ] Sistema de contabilidad configurado
- [ ] Sistema de impuestos (facturación)
- [ ] Conciliación automática con Stripe
- [ ] Ledger inmutable de movimientos
- [ ] Decisión de unidad de crédito (¿1 crédito = X USD?)
- [ ] Política de caducidad de créditos
- [ ] Política de reembolsos
- [ ] Marco legal para prepago

### Mientras tanto

El sistema actual funciona con:

- **USD** como unidad de cuenta
- **Stripe** para pagos de suscripción / checkout
- **budget-enforcer** y `platform.tenant_budgets` / límites por plan
- **usage_events** / `billing_usage` para seguimiento de gasto LLM

### Mejoras actuales (sin wallet)

1. UX de dashboards de costos y presupuesto en USD (admin)
2. Proyecciones orientativas de fin de mes (basadas en gasto acumulado del mes)
3. Alertas por umbrales (p. ej. 75% / 90% del presupuesto mensual)
4. Visualización de consumo por tenant frente al límite

### Referencias

- [ADR-017](adr/ADR-017-prepaid-token-wallet-roadmap.md) — prepaid token wallet roadmap
- [ADR-016](adr/ADR-016-worker-teams-billing-roadmap.md) — worker teams billing
- [TOKEN-BILLING-SYSTEM.md](TOKEN-BILLING-SYSTEM.md) — diseño futuro
- [TOKEN-SYSTEM-GUIDE.md](TOKEN-SYSTEM-GUIDE.md) — diseño futuro

### Historial

- 2026-04-12: Documentado estado pausado y alcance “solo USD”.
