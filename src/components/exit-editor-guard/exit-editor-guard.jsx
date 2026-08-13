import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import {createProject, getIsShowingWithoutId, manualUpdateProject} from '../../reducers/project-state';

import styles from './exit-editor-guard.css';

/*
 * 13/08/2026 — bug real reportado en producción: si un proyecto deja algo sonando (ej. un sonido
 * en loop infinito) y el alumno toca "Mis Proyectos" (o el docente "Mis plantillas"/"Cerrar
 * sesión"), React desmonta el editor pero el audio ya programado en el AudioContext sigue sonando
 * de fondo — nada llama a vm.stopAll() al navegar, solo el botón rojo de Detener (⏹) lo hacía.
 *
 * Este componente envuelve cualquier link/botón de salida del editor (Mis Proyectos, Mis
 * plantillas, Cerrar sesión): intercepta el click, y
 *   - si no hay cambios sin guardar, corta el audio (vm.stopAll()) y navega directo — cero fricción
 *     extra en el caso común.
 *   - si hay cambios sin guardar (projectChanged), abre un modal chico con "Guardar cambios" /
 *     "Descartar cambios" — las dos opciones cierran el proyecto de verdad (audio incluido), la
 *     diferencia es solo si guardan antes o no.
 *
 * Reusable: recibe un único hijo (el botón/div ya estilado tal cual se veía antes) y le inyecta el
 * onClick por clonado — así "Mis Proyectos" (div con ícono) y "Mis plantillas"/"Cerrar sesión"
 * (button con estilo inline) no necesitan compartir ninguna marca visual, solo este comportamiento.
 */
const ExitEditorGuardComponent = ({
    children,
    isShowingWithoutId,
    onClickCreateNew,
    onClickSave,
    onExit,
    projectChanged,
    vm
}) => {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingSave, setPendingSave] = useState(false);

    const doExit = () => {
        if (vm) vm.stopAll();
        onExit();
    };

    // El guardado (creación o actualización, según si el proyecto ya tiene id — mismo criterio
    // que handleClickSave en menu-bar.jsx) es asíncrono y no devuelve una promesa utilizable acá:
    // se sabe que terminó bien porque project-saver-hoc despacha setProjectUnchanged() al
    // completar (ver storeProject en lib/project-saver-hoc.jsx). Si falla, projectChanged se queda
    // en true y el alumno ve la alerta de error que ya muestra el resto de la app — se queda en el
    // editor para reintentar, en vez de navegar igual y perder el aviso.
    useEffect(() => {
        if (pendingSave && !projectChanged) {
            setPendingSave(false);
            doExit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectChanged, pendingSave]);

    const handleClick = () => {
        if (projectChanged) {
            setConfirmOpen(true);
        } else {
            doExit();
        }
    };

    const handleSaveAndExit = () => {
        setConfirmOpen(false);
        setPendingSave(true);
        if (isShowingWithoutId) {
            onClickCreateNew();
        } else {
            onClickSave();
        }
    };

    const handleDiscardAndExit = () => {
        setConfirmOpen(false);
        doExit();
    };

    return (
        <React.Fragment>
            {React.cloneElement(children, {onClick: handleClick})}
            {confirmOpen && (
                <div className={styles.backdrop} onMouseDown={() => setConfirmOpen(false)}>
                    <div className={styles.card} onMouseDown={e => e.stopPropagation()}>
                        <h2 className={styles.title}>✋ Tenés cambios sin guardar</h2>
                        <p className={styles.subtitle}>
                            ¿Qué querés hacer con el proyecto antes de salir?
                        </p>
                        <div className={styles.actionsRow}>
                            <button className={styles.saveButton} type="button" onClick={handleSaveAndExit}>
                                💾 Guardar cambios
                            </button>
                            <button className={styles.discardButton} type="button" onClick={handleDiscardAndExit}>
                                🗑️ Descartar cambios
                            </button>
                        </div>
                        <button className={styles.cancelLink} type="button" onClick={() => setConfirmOpen(false)}>
                            Seguir editando
                        </button>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

ExitEditorGuardComponent.propTypes = {
    children: PropTypes.element.isRequired,
    isShowingWithoutId: PropTypes.bool,
    onClickCreateNew: PropTypes.func.isRequired,
    onClickSave: PropTypes.func.isRequired,
    onExit: PropTypes.func.isRequired,
    projectChanged: PropTypes.bool,
    vm: PropTypes.shape({
        stopAll: PropTypes.func
    })
};

const mapStateToProps = state => ({
    isShowingWithoutId: getIsShowingWithoutId(state.scratchGui.projectState.loadingState),
    projectChanged: state.scratchGui.projectChanged,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onClickCreateNew: () => dispatch(createProject()),
    onClickSave: () => dispatch(manualUpdateProject())
});

export default connect(mapStateToProps, mapDispatchToProps)(ExitEditorGuardComponent);
