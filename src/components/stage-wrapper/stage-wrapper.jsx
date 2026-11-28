import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import VM from 'scratch-vm';

import Box from '../box/box.jsx';
import {STAGE_DISPLAY_SIZES} from '../../lib/layout-constants.js';
import StageHeader from '../../containers/stage-header.jsx';
import Stage from '../../containers/stage.jsx';
import Loader from '../loader/loader.jsx';

import styles from './stage-wrapper.css';

const StageWrapperComponent = function (props) {
    const {
        children,
        isFullScreen,
        isPlayerOnly,
        isRtl,
        isRendererSupported,
        loading,
        stageSize,
        vm
    } = props;

    return (
        <Box
            className={classNames(
                styles.stageWrapper,
                {[styles.fullScreen]: isFullScreen},
                {[styles.playerStage]: isPlayerOnly}
            )}
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            <Box className={styles.stageMenuWrapper}>
                <StageHeader
                    stageSize={stageSize}
                    vm={vm}
                />
            </Box>
            <Box className={styles.stageCanvasWrapper}>
                {
                    isRendererSupported ?
                        <Stage
                            stageSize={stageSize}
                            vm={vm}
                        /> :
                        null
                }
            </Box>
            {loading ? (
                <Loader isFullScreen={isFullScreen} />
            ) : null}
            {
                /* 28/11/2026 — sin esto los hijos se descartaban en silencio: gui.jsx le pasa acá
                   <PlayerViewportWatcher /> (modo /jugar/:id) y nunca se montaba, así que el escenario
                   salía bien al cargar pero NO se recalculaba al girar el celular ni al cambiar el
                   tamaño de la ventana (quedaba cortado o chico). Medido en producción: el store no
                   tenía `playerViewport`; al despacharlo a mano el escenario sí se redibujaba. */
            }
            {children}
        </Box>
    );
};

StageWrapperComponent.propTypes = {
    children: PropTypes.node,
    isFullScreen: PropTypes.bool,
    isPlayerOnly: PropTypes.bool,
    isRendererSupported: PropTypes.bool.isRequired,
    isRtl: PropTypes.bool.isRequired,
    loading: PropTypes.bool,
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default StageWrapperComponent;
