# DESIGN.md — editor de Coders Academy

Fuente de verdad de **medidas, escala y estilo** del editor (fork de `scratch-gui`). Léelo antes de
agregar o agrandar cualquier componente. Complementa a `CLAUDE.md` (arquitectura) y a
`docs/ui-scale-guidelines.md` (análisis comparativo contra Scratch, Educabot y mBlock, 14/08/2026).

> **Estado (28/11/2026):** auditoría visual hecha sobre producción con Chrome. **[MEDIDO]** = hecho
> observado; **[DECIDIDO]** = aprobado por Rodrigo; **[PROPUESTO]** = espera su OK.
> Paso 1 (layout del editor) **escrito en el repo, sin commitear ni desplegar**: hasta que Vercel lo
> publique, producción sigue con el comportamiento descrito en la sección 2.

## 0. Alcance de dispositivos [DECIDIDO]

- **Editor** (`/docente`, alumnos, todo lo que tiene login o código): netbook 11,6", notebook y monitor.
  **No se diseña para celular.**
- **Proyectos publicados** (`/jugar/:id`): tiene que verse bien en netbook, pantallas grandes **y celular**
  (vertical y horizontal). Es la única parte del editor que contempla mobile (ver `CLAUDE.md`,
  "Vista pública `/jugar/:id`").

## 1. Pantallas objetivo

| Equipo | Pantalla | Viewport útil del navegador (CSS px) | Prioridad |
|---|---|---|---|
| Netbook del alumno, 11,6" | 1366×768 (a confirmar con el modelo real) | ~1366×590 al 100 %; ~1100×443 si Windows escala al 125 % | **Máxima**: manda el diseño |
| Notebook del docente | ~1366×768 a 1920×1080 | 1366×590 a 1920×~950 | Alta |
| Mac / monitor | 1512×982 a 1920×1080 o más | amplio | Debe verse bien, no condiciona |

- "Viewport útil" = pantalla menos barra de pestañas y de direcciones (~178 px de alto en Chrome/Edge).
  **F11 (pantalla completa) devuelve ~100 px de alto**: es el parche inmediato para clase.
- Chrome y Edge usan el mismo motor (Chromium) y se ven igual: no hay navegador "mejor" para el editor.
  Si las netbooks son Chromebooks, es Chrome sí o sí.
- **Piso de diseño [PROPUESTO]: 1024×440 de viewport útil.** Todo lo importante (paleta, área de código,
  escenario, lista de objetos y botones de agregar) tiene que verse **sin scroll de la página**.
  Si no entra, scrollea el panel que corresponda, nunca la página.

## 2. Medidas actuales [MEDIDO, 28/11/2026]

Barra superior 48 px · pestañas 44 px (`$stage-menu-height`) · barra de categorías 80 px de ancho ·
paleta (flyout) ~250 px · escenario 410×308 px · panel de objetos 351×232 px (`1366×768`).

**Problema raíz:** `src/playground/index.css` fija `min-width: 1024px; min-height: 640px` en `html`,
`body` y `.app`. Con un viewport de 590 px (o 443 px al 125 %) la **página entera scrollea** y quedan
fuera de pantalla el panel de objetos, los botones "agregar objeto/fondo" (en y=584–628 con ventana de
591), el zoom del área de código (`.blocklyZoom`, hasta y=618) y el final de la paleta.

| Viewport | Alto de página | Se corta | Ancho de página |
|---|---|---|---|
| 1366×591 | 640 | ~49 px (botones agregar y zoom al borde) | 1351 (ok) |
| 1100×443 | 640 | **~197 px** (lista de objetos, agregar, zoom) | 1085 (ok, sin margen) |
| Mac 1512×~805 | ≤ alto | nada | ok |

Nota: la vista pública `/jugar/:id` ya anula esos mínimos con `data-public-player`
(ver `CLAUDE.md`). **El editor todavía no.**

## 3. Reglas de escala (heredadas, siguen vigentes)

1. **Citar siempre el valor vanilla real** (scratch.mit.edu o animaciones.educabot.com miden igual)
   antes de agrandar algo.
2. **Un solo factor de referencia: ~1,12× vanilla** para todo lo que no sea la barra de categorías.
   La barra de categorías (80 px / 13,6 px) está validada contra mBlock: **no se toca**.
3. **Medir el alto, no solo el ancho.** Cada tamaño fijo se prueba contra el piso de la sección 1.
4. Agrandar el contenido sin agrandar su contenedor es un bug (caso de las pestañas: letra +25 % en
   una fila de 44 px que no creció).
5. **Ya aplicado el 14/08/2026** (commit `b0b9551`, bajó +25/30 % a +12 %): `BLOCKS_DEFAULT_SCALE` = 0,76
   (verificado en `layout-constants.js`), pestañas, panel del sprite y editor de sonido. En producción
   se midió pestaña a 14,4 px, categoría a 80 px de ancho y 54 px de alto por ítem. No hay escala pendiente.

## 3b. Layout del editor — cambios del paso 1 [DECIDIDO, sin desplegar]

- `src/playground/index.css`: `min-height` 640 → **420 px**. `min-width` queda en 1024 px (una netbook
  al 125 % mide ~1100 px, entra).
- `src/components/blocks/blocks.css`: con `max-height: 640px` las categorías se compactan (ítem
  54 → 37 px, burbuja 20 → 16 px, letra 0,85 → 0,78 rem): se ven **7 de 9** en vez de 4 a 443 px de alto.
  Probado en vivo inyectando el CSS en producción a 1100×443. Con alto normal no cambia nada.
- `src/components/gui/gui.css`, `.editor-wrapper { overflow-y: auto }`: quitar el mínimo de 640 solo
  no alcanza. A 443 px el editor de sonido (efectos, grabar) y el lienzo de dibujo (herramientas,
  zoom) medían más que el alto disponible y quedaban **recortados sin forma de llegar** (el shell tiene
  `overflow: hidden`). Con este scroll se alcanzan en Disfraces y Sonidos; en Código no aparece barra
  (395 = 395 px). Probado en vivo a 1100×443.
- Lo que **no** se cambió y por qué: el panel de objetos queda chico (~84 px) a 443 px de alto, pero
  scrollea por dentro y los botones de agregar quedan a la vista; el escenario ya se achica solo
  (`constrainedMinHeight`). Si en clase resulta incómodo, el siguiente paso es dar más alto al panel
  de objetos en vez de al escenario.
- Pendiente de verificar tras el deploy: pestañas Disfraces/Sonidos y editores de pintura y sonido a
  443 px de alto (no se midieron todavía).

## 3c. Proyectos publicados `/jugar/:id` — auditoría 28/11/2026 [MEDIDO]

Proyecto de prueba `cmwzn24gk000c01qjnibp2fof`. Escenario siempre 4:3, calculado por `getPlayerStageSize`
(`src/lib/screen-utils.js`).

| Viewport | Disposición | Escenario | Resultado al cargar |
|---|---|---|---|
| 1100×443 (netbook al 125 %) | `side` | 567×425 | ok, sin scroll |
| 1366×591 (netbook al 100 %) | `desktop` | 567×425 (al recargar: según `innerHeight`) | ok |
| 1920×896 (monitor) | `desktop` | 976×732 | ok |
| 390×844 y 360×640 (celular vertical) | `stack` | todo el ancho | ok, controles y tarjeta visibles |
| 844×390 y 667×375 (celular horizontal) | `side` | a todo el alto | ok |

**Bug encontrado:** el escenario se calcula bien **al cargar** pero **no se recalcula al girar el celular ni
al cambiar el tamaño de la ventana** (la disposición sí cambia, el escenario queda con el tamaño viejo y
se corta o queda chico). Causa: `StageWrapperComponent` no renderizaba `children`, así que el
`<PlayerViewportWatcher>` que `gui.jsx` le pasa nunca se montaba; el store no tenía `playerViewport`. Al
despachar la acción a mano el escenario sí se redibujaba. Arreglo: renderizar `{children}` en
`src/components/stage-wrapper/stage-wrapper.jsx` (**escrito, sin desplegar**). Efecto colateral esperado:
`<Alerts>` (que `gui.jsx` también pasa como hijo) ahora puede mostrarse si hay una alerta activa.

Notas:
- El texto "Ordena correctamente…" se corta a la derecha dentro del escenario: es contenido del proyecto
  (un objeto de texto más ancho que el escenario de 480×360), no del layout.
- `gui.js` pesa **~18 MB** sin comprimir: relevante para la carga en las netbooks y en celular con datos.
- Chrome no baja de ~500 px de ancho; para celular se probó con iframes del mismo sitio.

## 3d. Peso y carga [MEDIDO, 28/11/2026]

| Qué | Valor |
|---|---|
| `gui.js` sin comprimir | 19,1 MB (minimizado, producción) |
| `gui.js` con gzip / **Brotli** (lo que baja Chrome/Edge) | 6,1 MB / **5,5 MB** |
| Visita repetida | `304 Not Modified`, 0 bytes, ~0,23 s (`max-age=0, must-revalidate` + ETag) |
| Composición | casi todo es código de Scratch; fuentes y SVG embebidos suman ~2 MB; un solo archivo, sin hash en el nombre, sin dividir (`shouldSplitChunks: false`) |

Estimación de primera visita para 5,5 MB: ~9 s a 5 Mbps, ~22 s a 2 Mbps. **Cada deploy cambia el ETag y
obliga a todas las netbooks a volver a bajarlo**: con 30 alumnos abriendo a la vez en el mismo wifi son
~165 MB juntos.

Reglas:
- **No desplegar el editor justo antes de una clase.** Si se hace, abrir el editor una vez en cada netbook
  con tiempo (queda cacheado) o hacerlo de a pocas.
- Mientras baja el JS el `<body>` estaba vacío (pantalla blanca). Desde el 28/11/2026 `index.ejs` trae una
  pantalla de carga de HTML+CSS puro (`#boot-splash`) que `index.jsx` quita al montar la app; a los 20 s
  muestra "Está tardando más de lo normal… recargá la página". No usar nada que dependa de JS ahí.
- Cualquier dependencia nueva pesada se mide contra este número antes de aceptarla.

Opciones evaluadas y **no hechas** (costo/riesgo alto para la ganancia): dividir en chunks y un bundle solo
para `/jugar` (quita el editor completo de la vista pública; es un cambio de build grande y no se puede
probar sin compilar en Vercel); nombres con hash + `immutable` (no reduce la primera descarga). Si los padres
se quejan de la carga en celular con datos, el candidato es el bundle de solo reproductor.

## 4. Presupuesto de alto [PROPUESTO]

Para que entre en 440 px útiles sin scroll de página, el alto se reparte así (de arriba a abajo):

| Zona | Hoy | Propuesto |
|---|---|---|
| Barra superior | 48 | 40–44 |
| Pestañas | 44 | 40 |
| Escenario (modo grande) | 308 | se calcula con lo que sobre (`fullSizeMinHeight`/`constrainedMinHeight`) |
| Panel de objetos | 232 | scroll propio, mínimo 140 |
| Resto | — | área de código y paleta llenan el alto y scrollean por dentro |

Cambios técnicos que implica (cuando se apruebe): anular `min-height: 640px` y bajar `min-width` en el
editor (mismo patrón que `public-player.css`), página sin scroll (`overflow: hidden` en el shell),
`min-height: 0` en los contenedores flex para que scrolleen por dentro, y probar en 1366×590 y 1100×443.
En viewports de poca altura (< 560 px) usar por defecto el modo "escenario chico".

## 5. Íconos y logos propios [DECIDIDO, escrito sin desplegar]

Decisiones de Rodrigo (28/11/2026): `</>` para "agregar objeto", ícono de imagen para "agregar fondo",
**borrar los modos viejos de Scratch**, y **el gato queda** como objeto por defecto de un proyecto nuevo
(es contenido del proyecto, no interfaz).

Hecho:
- `action-menu/icon--sprite.svg` → Lucide `code-xml` (`</>`); `icon--backdrop.svg` → Lucide `image`.
  Trazo blanco fijo de 2 px, viewBox 24, 20×20 (se cargan como `<img>`, no heredan `currentColor`).
  `icon--sprite.svg` también es el ícono de respaldo de extensiones sin `iconURL` (`extension-library.jsx`).
- Borrados: `nineties-mode/`, `oldtimey-mode/`, `prehistoric-mode/` (nadie los importaba) y los logos
  `cat_logo.svg`, `nineties_logo.svg`, `oldtimey-logo.svg`, `prehistoric-logo.svg`.
- `menu-bar.jsx`: sin `handleSetMode`, sin el menú "Modo" (Normal / Caturday; solo existía con
  `isTotallyNormal`, la broma del 1 de abril) y sin sus props ni conexión a Redux.
- **`menu-bar/scratch-logo.svg` se queda**: pese al nombre ya es el wordmark "Coders Academy | Editor".

Pendiente / a propósito sin tocar:
- `reducers/time-travel.js` y el valor `useCatBlocks` de `containers/blocks.jsx`: las usan los bloques de
  gato del modo Caturday. Sin menú son inalcanzables; se pueden borrar en otro paso (toca `gui.js` reducers).
- `coming-soon/aww-cat.png`, `cool-cat.png`: gato en mensajes "próximamente"; no se ven en el flujo normal.
- Otros íconos de Scratch con estilo propio (bandera verde, stop, categorías) no se tocaron: no son marca.
- Política de marca (CLAUDE.md): **no usar el nombre ni el logo "Scratch" en la UI**. Reemplazar el gato
  de los botones ayuda a cumplirla.

**Cómo incorporar íconos tipo Lucide (`</>`, etc.):** el repo no tiene `lucide-react` y corre con
React 16. Recomendado: **copiar el SVG del ícono de Lucide (licencia ISC) como archivo `.svg`** en
`src/components/<componente>/` y importarlo como los otros 181 SVG. Sin dependencia nueva y sin riesgo de
compatibilidad con React 16. Si se prefiere el paquete, verificar su peer dependency antes de instalar.

Reglas de estilo para íconos nuevos: trazo, no relleno; 24×24 de grilla; `stroke-width` 2; color por
`currentColor` para que herede del token; tamaño de botón táctil mínimo 44 px (`/jugar` usa 48 px).

## 6. Cómo sumar una feature sin romper el diseño

1. Definir su alto/ancho dentro del presupuesto de la sección 4 (no agregar filas fijas nuevas).
2. Si es una barra o panel fijo: restar su alto al escenario (`layout-constants.js`), no al código.
3. Probar en 1366×590, 1100×443 y 1920×1080 (script de medición: ver sección 7).
4. Anotar acá el valor nuevo con su porqué.

## 7. Cómo auditar (reproducible)

Con Claude en Chrome: abrir el editor, `resize_window` a 1366×768 (viewport real 1366×591) y a
1100×620 (1100×443), y ejecutar en la consola: `document.documentElement.scrollHeight` vs
`innerHeight`. **Criterio de aprobado: `scrollHeight <= innerHeight` y `scrollWidth <= innerWidth`**, y
los rectángulos de `.blocklyZoom`, el botón "agregar objeto" y el panel de objetos con `bottom <= innerHeight`.
Una ventana de Chrome no baja de ~500 px de ancho: para celular usar un iframe o viewport emulado.
