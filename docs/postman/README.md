# Postman + Browser Smoke

## Import rapido en Postman

1. Importa:
   - `docs/postman/opsly-super-agent.postman_collection.json`
   - `docs/postman/opsly-super-agent.postman_environment.json`
2. En el environment, reemplaza:
   - `platform_admin_token`
   - `supabase_access_token`
3. Ejecuta en orden:
   - Health
   - Admin
   - n8n Super Agent
   - Portal

## Probar desde Chrome (sin exponer secretos en chat)

- Opcion A (recomendada): usa Postman para requests autenticadas.
- Opcion B: abre en browser solo endpoints publicos:
  - `/api/health`
  - `/api/health/lightweight`
- Opcion C (DevTools -> Console) para endpoints autenticados:

```js
await fetch('https://api.ops.smiletripcare.com/api/n8n/decide', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('opsly_admin_token'),
  },
  body: JSON.stringify({
    task_description: 'automatizar deploy y notificacion de errores',
    constraints: { security_level: 'safe', cost_limit: 25 },
  }),
}).then((r) => r.json());
```

Guarda los tokens localmente en tu entorno, no en prompts compartidos.
