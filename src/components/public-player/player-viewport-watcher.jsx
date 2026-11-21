import {useEffect} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import {setPlayerViewport} from '../../reducers/mode';

// iOS Safari todavía reporta el tamaño viejo en el evento `orientationchange` y recién actualiza
// `innerWidth/innerHeight` un rato después — por eso se vuelve a medir con un pequeño retraso.
const SETTLE_DELAY_MS = 300;

/*
 * 21/11/2026 — reemplaza a <OrientationAutoFullscreen> (que activaba el pantalla completa de
 * scratch-gui al girar el celular y tapaba el botón de compartir). Ahora /jugar/:id arma su propia
 * disposición para vertical y horizontal (ver getPlayerLayout en screen-utils.js), y lo único que
 * le falta al motor es enterarse de que la ventana cambió: el <Stage> solo se vuelve a dibujar si
 * cambia alguna de sus props (containers/stage.jsx, shouldComponentUpdate), así que acá se guarda
 * el tamaño de la ventana en Redux (reducers/mode.js, `playerViewport`) cada vez que cambia. El
 * tamaño real del escenario lo sigue calculando getStageDimensions leyendo `window`.
 *
 * No renderiza nada — vive como `playerExtras` del modo isPlayerOnly de gui.jsx, el único lugar de
 * esa rama que cae dentro del <Provider> redux interno de GUI.
 */
const PlayerViewportWatcherComponent = ({onViewportChange}) => {
    useEffect(() => {
        let settleTimeoutId = null;
        const measure = () => onViewportChange(`${window.innerWidth}x${window.innerHeight}`);
        const handleChange = () => {
            measure();
            clearTimeout(settleTimeoutId);
            settleTimeoutId = setTimeout(measure, SETTLE_DELAY_MS);
        };

        measure();
        window.addEventListener('resize', handleChange);
        window.addEventListener('orientationchange', handleChange);
        return () => {
            clearTimeout(settleTimeoutId);
            window.removeEventListener('resize', handleChange);
            window.removeEventListener('orientationchange', handleChange);
        };
    }, [onViewportChange]);

    return null;
};

PlayerViewportWatcherComponent.propTypes = {
    onViewportChange: PropTypes.func.isRequired
};

const mapDispatchToProps = dispatch => ({
    onViewportChange: viewport => dispatch(setPlayerViewport(viewport))
});

const PlayerViewportWatcher = connect(
    null,
    mapDispatchToProps
)(PlayerViewportWatcherComponent);

export default PlayerViewportWatcher;
