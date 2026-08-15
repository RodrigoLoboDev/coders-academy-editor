import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import styles from './save-toast.css';

const TOAST_DURATION_MS = 2500;

/*
 * 14/08/2026 — toast flotante "Proyecto guardado" a pedido del usuario. scratch-gui ya tiene su
 * propia alerta de guardado exitoso (alertId 'saveSuccess', ver lib/alerts/index.jsx), pero es de
 * tipo INLINE — se muestra chica, adentro de <SaveStatus> en la barra de menú, fácil de no ver.
 * En vez de duplicar la lógica de "guardó bien" (ese estado ya lo actualiza correctamente
 * project-saver-hoc.jsx sin importar quién disparó el guardado — clic en "Guardar ahora" o
 * "Guardar cambios" de ExitEditorGuard), este componente solo OBSERVA esa misma lista de alertas
 * y muestra un toast real, flotante, cuando aparece.
 *
 * Sin UI propia visible hasta que hay algo que mostrar — se monta vía `rightContent` (mismo truco
 * que ExitEditorGuard) para vivir dentro del <Provider> interno del editor.
 */
const SaveToastComponent = ({alertsList}) => {
    const [visible, setVisible] = useState(false);
    const hadSuccessRef = useRef(false);

    useEffect(() => {
        const hasSuccess = (alertsList || []).some(alert => alert.alertId === 'saveSuccess');
        if (hasSuccess && !hadSuccessRef.current) {
            setVisible(true);
            hadSuccessRef.current = hasSuccess;
            const timeoutId = setTimeout(() => setVisible(false), TOAST_DURATION_MS);
            return () => clearTimeout(timeoutId);
        }
        hadSuccessRef.current = hasSuccess;
    }, [alertsList]);

    if (!visible) return null;

    return (
        <div className={styles.toast}>
            <span className={styles.check}>✓</span>
            Proyecto guardado
        </div>
    );
};

SaveToastComponent.propTypes = {
    alertsList: PropTypes.arrayOf(PropTypes.object)
};

const mapStateToProps = state => ({
    alertsList: state.scratchGui.alerts.alertsList
});

export default connect(mapStateToProps)(SaveToastComponent);
