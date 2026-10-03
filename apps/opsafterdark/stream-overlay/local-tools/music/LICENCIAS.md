# Licencias y riesgo de copyright — música Strudel

> Esto documenta lo que se usó y de dónde viene. **No es asesoría legal.**

## Qué suena en cada patrón

Los cuatro patrones (`01-techno-oscuro`, `02-house-suave`, `03-build-up`, `04-drop`) usan **únicamente los sintetizadores incorporados de Strudel**. No cargan ningún sample, banco de baterías ni archivo de audio externo:

| Sonido | Qué es | Origen | Licencia |
|---|---|---|---|
| `sine`, `sawtooth`, `square`, `triangle` | Osciladores generados por código | Motor de audio de Strudel (`superdough`), documentado en <https://strudel.cc/learn/synths/> | Software de Strudel: **AGPL-3.0** |
| `white`, `pink` (ruido) | Ruido generado por código | Ídem | Ídem |
| Bombo, clap, hi-hat, bajo, acordes, lead | Se construyen con los osciladores y ruidos de arriba más filtros y envolventes | Escritos para este proyecto (los patrones de esta carpeta) | Propios del canal |

- **Strudel** se publica bajo la **GNU AGPL v3** (repositorio: <https://codeberg.org/uzu/strudel>). Esa licencia cubre el *software*. Su README no dice que la música creada con él tenga una licencia especial.
- **Samples por defecto de Strudel: NO se usan.** Strudel trae bancos (`bd`, `hh`, `RolandTR909`, `github:tidalcycles/dirt-samples`, etc.) cuyas licencias van aparte, en el repositorio `dough-samples`, y no se verificaron aquí. Por eso ningún patrón los nombra.
- **Guardia automática:** `run.ps1 music-check` falla si un patrón usa `samples(...)`, `.bank(...)`, URLs, `github:` o un sonido que no sea de la lista de arriba. Ejecútalo cada vez que edites o agregues un patrón.

## Sobre "hecho con código"

Generar audio por código **no elimina por sí solo** el riesgo de copyright:

- Una **melodía, línea de bajo o progresión de acordes** que copie una canción existente puede infringir derechos de la composición, aunque el sonido sea sintetizado.
- Los patrones de aquí son rítmicos y armónicos genéricos (bombo a 4 tiempos, acordes menores, riser de ruido) y no reproducen ninguna canción conocida. Si modificas las notas en vivo, **no reproduzcas temas de otros artistas** (ni "tocando de oído" un éxito).
- Plataformas como Twitch y YouTube usan detección automática. Es poco probable que la marque música original y genérica, pero **no se puede garantizar**: un falso positivo es posible. Guarda el código de tus patrones como prueba de autoría.
- Si la música sale del directo y **también** de tus clips o VOD, revisa la sección de pista separada del [instructivo](INSTRUCTIVO.md): mantener la música fuera de la pista del VOD reduce el riesgo en los VODs.

## Cómo añadir sonidos nuevos con seguridad

1. Documenta aquí: nombre, fuente (URL) y licencia exacta, con la fecha de revisión.
2. Solo se aceptan licencias que permitan explícitamente uso comercial/monetizado y en directo (p. ej. CC0 o CC-BY con atribución cumplida).
3. Añade el nombre a la lista `allowed` de `check-music-licenses.mjs` y vuelve a correr `music-check`.
