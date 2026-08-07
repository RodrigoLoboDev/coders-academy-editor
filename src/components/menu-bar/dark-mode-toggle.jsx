import classNames from 'classnames';
import React from 'react';

import {applyDarkMode, isDarkMode} from '../../lib/dark-mode';

import styles from './menu-bar.css';

/*
 * Toggle de modo oscuro adentro de la barra (sesión 32) — antes vivía FUERA del árbol de React,
 * como botón flotante montado directo al <body> (Fase 6, ver lib/dark-mode.js), para cubrir por
 * igual todas las pantallas (AccessGate, pickers, editor). Movido acá a pedido del usuario: deja
 * de estar disponible en AccessGate/los pickers (solo se ve una vez adentro del editor), a cambio
 * de vivir integrado en la barra en vez de flotar encima de todo. Mismo mecanismo de fondo
 * (localStorage + reload forzado) — ver el comentario en lib/dark-mode.js.
 */
const handleClick = () => {
    applyDarkMode(!isDarkMode());
    window.location.reload();
};

const DarkModeToggle = () => (
    <div
        aria-label="Cambiar modo oscuro"
        className={classNames(styles.menuBarItem, styles.noOffset, styles.hoverable)}
        title="Cambiar modo oscuro"
        onClick={handleClick}
    >
        <span className={styles.darkModeToggleIcon}>{isDarkMode() ? '☀️' : '🌙'}</span>
    </div>
);

export default DarkModeToggle;
