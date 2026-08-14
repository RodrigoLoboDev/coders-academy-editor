# Guía de escala de UI — texto, bloques, categorías, sprites

> Estado: análisis cerrado y recomendación dada (14/08/2026). Pendiente de aplicar — ver
> "Próximo paso" al final. Este documento es la referencia a citar la próxima vez que se agregue
> o agrande un componente nuevo del editor.

## Por qué existe este documento

El editor se empezó a ver "grande" en las netbooks de 11" de la academia, en contraste con cómo
se ve en notebooks/monitores normales. Investigando el origen: no es que el editor "siempre fue
así" — el 08/08/2026 ("sesión 34") se hizo una ronda de 14 commits que agrandó texto, bloques,
categorías, panel del sprite y editor de sonido con factores de **+25% a +30.8%** sobre los
valores originales de scratch-gui/scratch-blocks (`vanilla` de acá en más). Fue una decisión real
y documentada, no un descuido — pero se aplicó el mismo factor de "consistencia visual" a zonas
que nunca se validaron contra una referencia externa, y en ningún caso se consideró el **alto**
de la pantalla, solo el ancho.

## Metodología

Se midieron en vivo (DevTools, no folletería/marketing) los 3 motores comparables — los tres
corren sobre scratch-blocks/scratch-gui reales, así que las clases (`.scratchCategoryMenu`,
`.blocklyPath`, `.react-tabs__tab`, etc.) son literalmente las mismas y comparables 1:1:

- **scratch.mit.edu** (editor oficial) — la referencia "vanilla" pura.
- **animaciones.educabot.com** — fork de scratch-gui sin tocar el tamaño de nada (confirmado:
  valores idénticos a vanilla en cada métrica medida). Sirve como segunda confirmación
  independiente de cuáles son los valores originales.
- **ide.mblock.cc** (modo "Objetos", el equivalente a nuestro editor sin hardware) — el único de
  los tres que también agranda a propósito para un público más chico, como nosotros.

Los valores "nuestros" salen del propio código (`src/lib/layout-constants.js`,
`src/components/gui/gui.css`, `src/components/blocks/blocks.css`, etc.) y del historial de git —
cada commit de sesión 34 documenta el valor original antes del cambio, así que no hay ninguna
cifra inferida acá, todas están confirmadas contra el diff real.

## Tabla comparativa

| Métrica | Vanilla (Scratch / Educabot) | mBlock | **Nuestro actual** | Factor propio vs. vanilla |
|---|---|---|---|---|
| Ancho barra de categorías | 60px | 84px | **80px** | +33% |
| Letra de categoría (Movimiento/Apariencia/...) | 10.4px (0.65rem) | 14px | **13.6px (0.85rem)** | +30.8% |
| Escala de bloques (paleta + workspace, `BLOCKS_DEFAULT_SCALE`) | 0.675 | ~+18% vs. vanilla (altura de bloque: 45px vs. 38px) | **0.88** | **+30.4%** |
| Pestañas Código/Disfraces/Sonidos — letra | 12.8px (0.8rem) | no medido (layout distinto) | **16px (1.0rem)** | +25% |
| Alto de la fila de pestañas | 44px (`2.75rem`) | no medido | **44px — sin cambiar** | 0% (¡el contenido creció, el contenedor no!) |
| Ícono de pestaña | 22px (1.375rem) | no medido | **27.5px (1.72rem)** | +25% |
| Panel de propiedades del sprite (Objeto/x/y/Tamaño/Dirección) | valor base de scratch-gui | no medido | **+25%** sobre ese valor | +25% |
| Editor de sonido (controles y texto) | valor base de scratch-gui | no medido | **+30.8%** sobre ese valor | +30.8% |

## Diagnóstico

1. **La barra de categorías (ancho + letra) ya está bien calibrada — no tocarla.** Quedó casi
   idéntica a lo que mBlock eligió de forma totalmente independiente (80px/13.6px nuestro vs.
   84px/14px de mBlock), y además fue validada a ojo en el inspector antes de aplicarse (commit
   `78d174e`). Dos validaciones independientes coincidiendo es la señal más fuerte de todo este
   análisis — este valor se queda como está.

2. **El resto de los cambios de sesión 34 son proporcionalmente más grandes que lo que hace
   mBlock**, sin ninguna validación externa detrás — se aplicó el mismo factor "porque así quedó
   consistente con lo de arriba", no porque se haya medido contra nada. El caso más marcado es
   `BLOCKS_DEFAULT_SCALE`: nuestro +30.4% vs. el ~+18% que se infiere de mBlock. Como este valor
   escala literalmente todos los bloques (paleta y workspace), es la palanca de mayor impacto en
   espacio ocupado de toda la lista.

3. **Bug de fondo en las pestañas, no solo "está grande":** el alto de la fila (`$stage-menu-height`,
   44px) nunca se tocó — coincide exacto con el alto real medido en Scratch/Educabot. Lo que creció
   fue el texto y el ícono *adentro* de esa misma caja de 44px (+25% cada uno). Eso no es "más
   grande y más cómodo", es texto más grande apretado en un contenedor que no le hizo lugar — un
   problema en sí mismo, más allá del tamaño general.

4. **Ninguno de estos cambios miró la altura de pantalla**, mismo problema de fondo que ya se
   resolvió para el stage el 12/08 (`fullSizeMinHeight`/`constrainedMinHeight` en
   `layout-constants.js`) — pero esa fix solo achica el stage. No ayuda en nada al tamaño *fijo*
   de letra de pestañas, panel del sprite o editor de sonido, que son justamente los que comen
   alto disponible en una netbook de 11".

## Recomendación

**No usar un factor único global ni revertir todo a vanilla.** La barra de categorías demuestra
que "más grande que Scratch original" es la decisión correcta para un público de esta edad —
mBlock llega a la misma conclusión por su cuenta. El problema es la *magnitud* en las zonas sin
validar, no la dirección.

| Área | Valor actual | Recomendado | Vs. vanilla |
|---|---|---|---|
| Barra de categorías (ancho + letra) | 80px / 13.6px | **sin cambios** | +33% / +30.8% (ya validado) |
| `BLOCKS_DEFAULT_SCALE` | 0.88 | **0.76** | +12.6% |
| Pestañas — letra | 1.0rem | **0.88rem** | +10% |
| Pestañas — ícono | 1.72rem | **1.5rem** | +9% |
| Panel de propiedades del sprite | +25% sobre base | **+12%** sobre base | +12% |
| Editor de sonido | +30.8% sobre base | **+12%** sobre base | +12% |

Un solo factor de referencia (~**+12%** sobre vanilla) para todo lo que no sea la barra de
categorías — perceptible como "más grande y cómodo que Scratch original" sin acumular varias
rondas de +25/+30% una sobre otra. Combinado con la fix de altura del stage que ya existe, da
mucho más margen real en una pantalla de 560-720px de alto que cualquiera de las dos fixes por
separado.

## Para el próximo componente que se agregue o agrande

- **Citar siempre el valor vanilla real**, no "lo que ya usa tal otro componente". Confirmarlo en
  scratch.mit.edu o animaciones.educabot.com (son intercambiables, miden igual) antes de aplicar
  cualquier factor.
- **Un solo factor de referencia, ~1.12×**, salvo que haya una razón puntual y documentada para
  desviarse (como la barra de categorías, que tiene su propia validación cruzada con mBlock).
- **Medir el alto, no solo el ancho.** Cualquier tamaño fijo (padding, alto de fila, tamaño de
  fuente) que se agrande hay que probarlo mentalmente contra una netbook de ~560-720px de alto
  disponible, no solo contra la notebook/monitor donde se está desarrollando.
- Si el contenedor tiene un alto fijo (como `$stage-menu-height`), agrandar el contenido sin
  agrandar el contenedor es un bug, no una mejora — o crece el contenedor también, o no crece el
  contenido.

## Próximo paso

Este documento cierra el análisis y deja la recomendación tomada. Falta aplicarla en el código
(`layout-constants.js`, `gui.css`, `blocks.css`, `sprite-info.css`, `sound-editor.css`) — se hace
en una sesión aparte, a pedido del usuario, no automáticamente al escribir este doc.
