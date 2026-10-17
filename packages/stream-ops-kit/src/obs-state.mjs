// Imprime el estado de OBS: live | idle | closed | unknown. Sale con 0 si es seguro hacer trabajo pesado o subir
// (idle/closed) y con 10 si no (live/unknown). Lo usan los wrappers antes de procesar o publicar.
import { obsState } from './post-stream-clips.mjs';

const st = await obsState();
console.log(st);
process.exit(st === 'idle' || st === 'closed' ? 0 : 10);
