import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import menuBarStyles from '../menu-bar/menu-bar.css';
import styles from './settings-menu.css';

// Ícono de engranaje — trazo simple (Feather/Lucide "settings"), mismo criterio "profesional, sin
// emoji" que EyeIcon/EyeOffIcon en access-gate.jsx.
const GearIcon = () => (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

/*
 * 14/08/2026 — reemplaza a los links sueltos "Mis plantillas"/"Cerrar sesión" de la barra del
 * editor: un solo ícono de engranaje + "Ajustes" que despliega un menú (fondo oscuro, línea
 * divisoria, texto blanco). `children` son los ítems del menú — cada uno decide su propio onClick
 * (ej. "Mis plantillas" abre el modal in-place, "Cerrar sesión" pasa por ExitEditorGuard), este
 * componente solo se encarga de mostrar/ocultar el desplegable y cerrarlo al clickear afuera o
 * elegir un ítem.
 */
const SettingsMenu = ({children}) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleOutsideClick = e => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [open]);

    return (
        <div ref={wrapperRef} className={styles.wrapper}>
            <button
                className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable, styles.trigger)}
                type="button"
                onClick={() => setOpen(prev => !prev)}
            >
                <GearIcon />
                <span className={menuBarStyles.tutorialsLabel}>Ajustes</span>
            </button>
            {open && (
                <div className={styles.dropdown} onClick={() => setOpen(false)}>
                    {children}
                </div>
            )}
        </div>
    );
};

SettingsMenu.propTypes = {
    children: PropTypes.node.isRequired
};

export default SettingsMenu;
