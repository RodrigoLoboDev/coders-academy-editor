# CLAUDE.md — coders-academy-editor

Guía para trabajar en este repo. Es el editor de bloques propio de Coders Academy — fork de
[`scratch-gui`](https://github.com/scratchfoundation/scratch-gui) (Scratch Foundation, AGPL-3.0).

## Qué es este repo, en una frase

Un editor de bloques tipo Scratch, embebido en una app propia (header + sidebar + flujo de
código de acceso + selector de trabajos), que un alumno usa en clase desde la notebook/tablet del
aula, y que guarda sus proyectos contra la API privada de Coders Academy.

## Relación con el monorepo privado (`coders-academy-platform`)

Este repo es **público** (obligación de la licencia AGPL-3.0, ver más abajo) y **totalmente
separado** del monorepo privado de Coders Academy (`coders-academy-platform`, que contiene
pagos, JEN, inscripciones, DNI de alumnos, etc. — nada de eso vive ni debe vivir acá).

- **Se comunica con `apps/api` del monorepo privado solo por HTTP** (fetch a endpoints REST). Sin
  paquetes compartidos, sin código compartido, sin importar nada del monorepo.
- El monorepo privado tiene un documento de análisis/progreso completo en
  `docs/scratch-editor-integration.md` (plan por fases, decisiones de licencia, todo el porqué).
  **Ese documento es privado** — no está ni debe estar en este repo. Este `CLAUDE.md` es la versión
  pública mínima: contexto de desarrollo, no el razonamiento de negocio completo.
- Convención de carpetas local: se asume que ambos repos están clonados como hermanos en disco
  (ej. `~/dev/coders-academy-platform` y `~/dev/coders-academy-editor`), sin ninguna dependencia
  de build entre ambos — es solo para comodidad de tener los dos abiertos a la vez.
- **Desarrollo**: siempre directo acá, nunca "hacer cambios en el monorepo y después copiar" — el
  código de este repo vive únicamente acá.

## Licencia — AGPL-3.0-only, por qué y qué implica

`scratch-gui` cambió de BSD-3-Clause a AGPL-3.0 en noviembre de 2024. AGPL es copyleft fuerte:
ofrecer una versión modificada como servicio de red (exactamente este caso) obliga a publicar el
código fuente completo de la versión modificada — **este repo es esa publicación**.

- El editor productivo tiene que tener un link visible (chico, tipo footer — no oculto por CSS,
  eso viola el espíritu de la obligación) a
  `https://github.com/RodrigoLoboDev/coders-academy-editor`.
- **Restringir el acceso (código de docente, rotativo o fijo) no reduce la obligación** — la
  cláusula de red se dispara por interacción del usuario con el programa, sin importar cómo se
  autenticó. Es una feature de producto (uso exclusivo en la academia), no una mitigación legal.
- No usar el nombre/logo "Scratch" en la UI (política de marca de MIT/Scratch Foundation — el
  código sí se puede forkear bajo AGPL, el nombre no).
- Nombre de producto visible en la UI: pendiente de definir.

## Arquitectura de la app (no es solo el editor de bloques)

No es "se abre la app y aparece directo la UI de Scratch". El flujo real:

1. **Pantalla de código de acceso** — el alumno ingresa un código que le da el docente en clase.
   Implementado (`src/components/access-gate/access-gate.jsx`): código **rotativo**, generado por
   el docente desde el propio editor ("🔑 Código de la clase" en `TemplatePicker`), con vencimiento
   editable (default 3 horas) — `EditorAccessCode` del lado de la API, verificado server-side
   (`POST /editor-access-code/verify`), no un valor fijo compilado al bundle. Un alumno con sesión
   abierta cuando el código vence se desloguea solo (`AccessCodeWatcher` en `render-gui.jsx`). Fase
   6 del plan (docs privado), reemplazó el `ACCESS_CODE` fijo original (hallazgo de la auditoría de
   seguridad: al ser este repo público, ese valor con su fallback hardcodeado quedaba visible en
   GitHub).
2. **Buscador de alumno** — busca por **nombre completo** contra la API privada
   (`GET /students/search`, público, sin auth) — puede haber más de un alumno con el mismo nombre
   de pila. Implementado, mismo componente que el paso 1.
3. **Pantalla principal** — por ahora un chip chico con el nombre de pila + link "Cambiar" en la
   esquina superior (`src/playground/render-gui.jsx`), no el header+sidebar completo descripto acá
   originalmente — eso se construye cuando llegue el trabajo de plantillas/tareas asignadas (ver
   punto 4). A partir de la selección del alumno, **el nombre se muestra solo de pila** en toda la
   UI — el nombre completo solo se usa en el paso 2 del buscador, nunca se re-expone completo
   después.
4. **Pendiente**: desde un sidebar real, **"Editor libre"** (proyecto nuevo sin plantilla, lo único
   que existe hoy) vs. **trabajos asignados por el docente** (plantillas). Hoy el editor siempre
   arranca con un proyecto en blanco — no hay todavía pantalla de "tus proyectos guardados" para
   continuar uno existente (`GET /scratch-projects/:studentId` ya lista los proyectos existentes
   del lado de la API, falta la UI acá).
5. El editor de bloques (el fork de `scratch-gui` en sí) ocupa el área central, montado como
   pantalla de esta misma app — no vive detrás de un `<iframe>` separado, es parte del mismo
   bundle/SPA.
6. Al guardar, el proyecto se persiste contra la API privada (`ScratchProject`, ver
   "Contrato con la API" abajo) — comunicación de red normal, no acoplamiento de código.

## Contrato con la API privada (`apps/api`)

Esta app consume endpoints REST del backend privado. El contrato exacto (rutas, auth, DTOs) se
define del lado de la API a medida que se implementa — algunos de estos endpoints todavía no
existen. Lo que sí es estable, y hay que respetar siempre:

- **Nunca pedir/mostrar más datos del alumno de los necesarios** — nombre completo solo en el paso
  de búsqueda, nunca después. No pedir ni mostrar DNI, teléfono de familia, ni ningún dato de
  facturación — esta app no tiene ninguna razón para tocar esos datos.
- Guardado de proyectos: JSON del proyecto desglosado (no el `.sb3` binario), assets subidos por
  separado — permite generar biblioteca de assets compartida y no re-parsear un binario.
- Auth: sin login de familia/docente en esta app — el "código de acceso" es el único mecanismo del
  lado del alumno. Desde la Fase 6 se valida **server-side** (`POST /editor-access-code/verify`,
  código rotativo con vencimiento, ver arriba) — sigue siendo una barrera de producto ("uso
  exclusivo en la academia"), no reemplaza la falta de auth real del buscador de alumnos
  (`GET /students/search`, público sin auth) ni de `/scratch-projects/:studentId/...` (accesible
  por cualquiera que tenga ese `studentId` — trade-off aceptado, ver hallazgos de la auditoría de
  seguridad en `docs/plan-fases-scratch-plataforma.md` del monorepo privado, Fase 6).
- CORS: la API privada tiene que tener el origin de esta app en su whitelist (env var del lado de
  la API, ver el doc privado si hace falta el nombre exacto).

## Convenciones técnicas del fork

- React 16 (`react@16.14.0`, `react-dom@16.14.0`) — versión que pide `scratch-gui`, aislada de
  cualquier otra app que eventualmente la consuma (no hay conflicto porque no comparte proceso ni
  bundle con nada más).
- `react`/`react-dom` están en `devDependencies` explícitas (no solo `peerDependencies` como en el
  original) — sin esto, gestores de paquetes modernos (`--legacy-peer-deps`, pnpm estricto) no las
  instalan solas.
- `regenerator-runtime` también explícita en `devDependencies` — dependencia "phantom" usada en
  `src/components/connection-modal/update-peripheral-step.jsx` pero nunca declarada en el
  `package.json` original (funcionaba por hoisting accidental de npm clásico).
- Dev server: `npm start` (webpack-dev-server, puerto default `8601`).
- Build de producción: `npm run build` (ver `webpack.config.js` — `buildConfig`/`distConfig`).

## Vista pública `/jugar/:id` (rediseño del 21/11/2026)

Página sin login que ve un padre o un compañero al abrir el link de un proyecto publicado. Código en
`src/components/public-player/`. Tres disposiciones, elegidas por JS según el tamaño de la ventana
(`getPlayerLayout` en `src/lib/screen-utils.js`, que también calcula el tamaño del escenario con
`getPlayerStageSize`):

- **`stack`** (ventana más alta que ancha): escenario de punta a punta, controles debajo y tarjeta con
  título, alumno y compartir. El escenario es siempre 4:3: en vertical manda el ancho y lo que sobra
  queda arriba y abajo, no a los costados.
- **`side`** (celular horizontal, alto ≤ 500px): escenario a todo el alto, controles en columna a la
  derecha y columna izquierda con logo, título, alumno y compartir.
- **`desktop`** (apaisado y alto): barra de arriba con todo el texto y escenario grande debajo.

Reglas a no romper: los tamaños fijos de `public-player.css` y `stage-header.css` (barra 44px, tarjeta
160px, columna 208px, controles 64px) están reservados en `STAGE_DIMENSION_DEFAULTS` de
`screen-utils.js` — se cambian en los dos lados. Los controles son de 48px (mínimo táctil). Ya no se usa
el pantalla completa de scratch-gui en esta vista; `player-viewport-watcher.jsx` guarda el tamaño de la
ventana en Redux (`playerViewport`) porque el `Stage` solo se redibuja si cambia alguna de sus props.
La línea "Hecho por …" usa `authorFirstName` de la API (solo nombre de pila; si falta, no se muestra).
Los tests de tamaños están en `test/unit/lib/screen-utils.test.js`.

## Estado actual (04/08/2026)

Fase 0 del plan (validar que el motor compila y corre) cerrada. Repo recién creado y separado del
monorepo privado. Todavía **no** tiene: branding propio, storage conectado a la API (usa el
storage default de `scratch-gui` todavía), pantallas de código/buscador/sidebar, PWA, ni deploy.
Ver el próximo commit / historial de este repo para el estado más actualizado — este archivo se
mantiene al día en cada paso, igual que `docs/scratch-editor-integration.md` del lado privado.
