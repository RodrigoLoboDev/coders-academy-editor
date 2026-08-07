import {persistTheme} from './themes/themePersistance';
import {DEFAULT_THEME, DARK_THEME} from './themes';

/*
 * Fase 6 (docs/scratch-editor-integration.md, monorepo privado) — modo oscuro "híbrido".
 * `initDarkMode()` sigue llamándose FUERA del árbol de React, antes de montar cualquier
 * componente (ver playground/index.jsx) — así el atributo `data-theme` y la cookie de colores de
 * bloques ya están seteados para el primer render, incluida la lectura que hace AppStateHOC en su
 * constructor.
 *
 * El botón para togglear el modo (antes un `<button>` vanilla-DOM montado directo al `<body>`,
 * visible en TODAS las pantallas) se sacó de acá en la sesión 32 — ahora vive adentro de la barra
 * del editor como componente de React (`components/menu-bar/dark-mode-toggle.jsx`), a pedido del
 * usuario. Con eso el toggle deja de estar disponible en AccessGate/los pickers (solo se ve una
 * vez adentro del editor) — tradeoff aceptado a cambio de vivir integrado en la barra en vez de
 * flotar encima de todo.
 *
 * El toggle de colores de bloques (persistTheme, cookie 'scratchtheme') solo se lee una vez, en el
 * constructor de AppStateHOC (lib/app-state-hoc.jsx) — no hay forma de despachar en caliente a la
 * store de un <WrappedGui> ya montado. Por eso `applyDarkMode` sigue pensado para usarse seguido
 * de un `window.location.reload()` del lado que lo llama: simple y sin casos raros de estado a
 * medio aplicar.
 */
const STORAGE_KEY = 'ca_editor_dark_mode';

const isDarkMode = () => localStorage.getItem(STORAGE_KEY) === '1';

const applyDarkMode = dark => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem(STORAGE_KEY, dark ? '1' : '0');
    persistTheme(dark ? DARK_THEME : DEFAULT_THEME);
};

// Se llama una sola vez, antes de montar cualquier componente — deja el atributo/cookie ya
// seteados para que el primer render (incluido el de AppStateHOC leyendo la cookie) salga bien.
const initDarkMode = () => {
    applyDarkMode(isDarkMode());
};

export {initDarkMode, applyDarkMode, isDarkMode};
