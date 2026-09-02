import {useEffect} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import {setFullScreen} from '../../reducers/mode';

/*
 * 02/09/2026 — reemplazo del intento anterior (rotar el viewport entero con CSS, sacado de
 * public-player.css — ver el comentario ahí de por qué no funcionó en un iPhone real). En vez de
 * inventar un mecanismo nuevo, reutiliza el modo "pantalla completa" que scratch-gui ya tiene
 * armado y probado (stage-header.jsx/stage-wrapper.css): cuando el usuario gira el teléfono a
 * horizontal DE VERDAD, activa ese modo automáticamente; al volver a vertical, lo desactiva. La
 * diferencia clave con el rotate-CSS: acá la rotación es real (el usuario giró el dispositivo), así
 * que `window.innerWidth/innerHeight` SÍ reflejan las dimensiones correctas cuando
 * getStageDimensions (screen-utils.js) las lee al calcular el tamaño del stage en modo fullscreen.
 *
 * Solo en dispositivos táctiles (`hover: none` + `pointer: coarse`) — en desktop, cambiar el ancho
 * de la ventana del navegador no debería disparar/sacar fullscreen solo.
 *
 * No renderiza nada — vive como children de <StageWrapper> en el modo isPlayerOnly de gui.jsx
 * (prop `playerExtras`, ver ese comentario), el único lugar de esa rama que cae dentro del
 * <Provider> redux interno de GUI (mismo truco que <SaveToast>/<ExitEditorGuard>/<ProjectUrlSync>
 * en render-gui.jsx).
 */
const OrientationAutoFullscreenComponent = ({onSetFullScreen}) => {
    useEffect(() => {
        const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        if (!isTouchDevice) return;

        const landscapeQuery = window.matchMedia('(orientation: landscape)');
        const applyOrientation = () => onSetFullScreen(landscapeQuery.matches);

        applyOrientation();
        landscapeQuery.addEventListener('change', applyOrientation);
        return () => landscapeQuery.removeEventListener('change', applyOrientation);
    }, [onSetFullScreen]);

    return null;
};

OrientationAutoFullscreenComponent.propTypes = {
    onSetFullScreen: PropTypes.func.isRequired
};

const mapDispatchToProps = dispatch => ({
    onSetFullScreen: isFullScreen => dispatch(setFullScreen(isFullScreen))
});

const OrientationAutoFullscreen = connect(
    null,
    mapDispatchToProps
)(OrientationAutoFullscreenComponent);

export default OrientationAutoFullscreen;
