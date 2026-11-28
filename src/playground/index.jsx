// Polyfills
import 'es6-object-assign/auto';
import 'core-js/fn/array/includes';
import 'core-js/fn/promise/finally';
import 'intl'; // For Safari 9

import React from 'react';
import ReactDOM from 'react-dom';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import BrowserModalComponent from '../components/browser-modal/browser-modal.jsx';
import supportedBrowser from '../lib/supported-browser';
import {initDarkMode} from '../lib/dark-mode';

import styles from './index.css';

// Fase 6 — antes de montar cualquier árbol de React: deja el atributo data-theme y la cookie de
// colores de bloques ya seteados para el primer render (ver lib/dark-mode.js). El botón de
// toggle ya no se monta acá afuera (sesión 32) — vive adentro de la barra del editor, ver
// components/menu-bar/dark-mode-toggle.jsx.
initDarkMode();

const appTarget = document.createElement('div');
appTarget.className = styles.app;
document.body.appendChild(appTarget);

// 28/11/2026 — quita la pantalla de carga de index.ejs (#boot-splash) cuando la app ya está montada.
// Dos requestAnimationFrame para que el primer cuadro de la app se pinte antes y no haya parpadeo.
const removeBootSplash = () => {
    const splash = document.getElementById('boot-splash');
    if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
};
const scheduleRemoveBootSplash = () => {
    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => window.requestAnimationFrame(removeBootSplash));
    } else {
        removeBootSplash();
    }
};

if (supportedBrowser()) {
    // require needed here to avoid importing unsupported browser-crashing code
    // at the top level
    require('./render-gui.jsx').default(appTarget);
    scheduleRemoveBootSplash();

} else {
    BrowserModalComponent.setAppElement(appTarget);
    const WrappedBrowserModalComponent = AppStateHOC(BrowserModalComponent, true /* localesOnly */);
    const handleBack = () => {};
    // eslint-disable-next-line react/jsx-no-bind
    ReactDOM.render(<WrappedBrowserModalComponent onBack={handleBack} />, appTarget);
    scheduleRemoveBootSplash();
}
