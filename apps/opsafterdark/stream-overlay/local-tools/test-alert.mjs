// Alertas SIMULADAS: node test-alert.mjs <follow|sub|raid|all> [nombre]
import { tool } from './obs.mjs';
const [type = 'all', name = 'UsuarioDePrueba'] = process.argv.slice(2);
for (const t of type === 'all' ? ['follow', 'sub', 'raid'] : [type]) console.log(t, JSON.stringify(await tool(`/alerts/test?type=${t}&name=${encodeURIComponent(name)}&months=3&viewers=128`)));
