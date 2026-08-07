import {persistTheme} from './themes/themePersistance';
import {DEFAULT_THEME, DARK_THEME} from './themes';

/*
 * Fase 6 (docs/scratch-editor-integration.md, monorepo privado) — modo oscuro "híbrido": vive
 * FUERA del árbol de React de <PlaygroundApp>/<WrappedGui> a propósito, porque tiene que afectar
 * por igual a AccessGate, los pickers y el propio editor — pantallas que se montan/desmontan por
 * separado según el estado de la sesión (ver render-gui.jsx). Un botón vanilla-DOM, sin React,
 * es lo más simple que cubre todas por igual sin duplicar estado.
 *
 * El toggle de colores de bloques (persistTheme, cookie 'scratchtheme') solo se lee una vez, en el
 * constructor de AppStateHOC (lib/app-state-hoc.jsx) — no hay forma de despachar en caliente a la
 * store de un <WrappedGui> ya montado desde acá afuera. Por eso el toggle fuerza un
 * window.location.reload(): simple y sin casos raros de estado a medio aplicar.
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

const TOGGLE_STYLE = {
    position: 'fixed',
    bottom: '12px',
    right: '12px',
    zIndex: 10000,
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: '44px',
    textAlign: 'center',
    padding: '0',
    background: '#1a1aad',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
};

const mountDarkModeToggle = () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Cambiar modo oscuro');
    button.title = 'Cambiar modo oscuro';
    Object.assign(button.style, TOGGLE_STYLE);

    const render = () => {
        button.textContent = isDarkMode() ? '☀️' : '🌙';
    };
    render();

    button.addEventListener('click', () => {
        applyDarkMode(!isDarkMode());
        window.location.reload();
    });

    document.body.appendChild(button);
};

export {initDarkMode, mountDarkModeToggle, isDarkMode};
