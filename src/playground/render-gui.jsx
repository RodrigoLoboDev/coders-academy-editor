import React from 'react';
import ReactDOM from 'react-dom';
import {compose} from 'redux';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import HashParserHOC from '../lib/hash-parser-hoc.jsx';
import log from '../lib/log.js';
import saveThumbnailToServer from '../lib/save-thumbnail-to-server';

const onClickLogo = () => {};

const handleTelemetryModalCancel = () => {
    log('User canceled telemetry modal');
};

const handleTelemetryModalOptIn = () => {
    log('User opted into telemetry');
};

const handleTelemetryModalOptOut = () => {
    log('User opted out of telemetry');
};

/*
 * Render the GUI playground. This is a separate function because importing anything
 * that instantiates the VM causes unsupported browsers to crash
 * {object} appTarget - the DOM element to render to
 */
export default appTarget => {
    GUI.setAppElement(appTarget);

    // note that redux's 'compose' function is just being used as a general utility to make
    // the hierarchy of HOC constructor calls clearer here; it has nothing to do with redux's
    // ability to compose reducers.
    const WrappedGui = compose(
        AppStateHOC,
        HashParserHOC
    )(GUI);

    // TODO a hack for testing the backpack, allow backpack host to be set by url param
    const backpackHostMatches = window.location.href.match(/[?&]backpack_host=([^&]*)&?/);
    const backpackHost = backpackHostMatches ? backpackHostMatches[1] : null;

    // TEMPORAL — mismo patrón de hook por query param, mientras no existe el flujo real de código
    // de acceso + búsqueda de alumno (Fase 2, docs/scratch-editor-integration.md del monorepo
    // privado). studentId/projectId van a dejar de leerse de la URL cuando se construya la
    // pantalla real — ver ese documento para el estado del plan.
    const studentIdMatches = window.location.href.match(/[?&]studentId=([^&]*)&?/);
    const devStudentId = studentIdMatches ? studentIdMatches[1] : null;
    const projectIdMatches = window.location.href.match(/[?&]projectId=([^&]*)&?/);
    const devProjectId = projectIdMatches ? projectIdMatches[1] : null;
    const apiScratchProjectsHost = `${process.env.API_URL}/scratch-projects/${devStudentId}`;

    const scratchDesktopMatches = window.location.href.match(/[?&]isScratchDesktop=([^&]+)/);
    let simulateScratchDesktop;
    if (scratchDesktopMatches) {
        try {
            // parse 'true' into `true`, 'false' into `false`, etc.
            simulateScratchDesktop = JSON.parse(scratchDesktopMatches[1]);
        } catch {
            // it's not JSON so just use the string
            // note that a typo like "falsy" will be treated as true
            simulateScratchDesktop = scratchDesktopMatches[1];
        }
    }

    if (process.env.NODE_ENV === 'production' && typeof window === 'object') {
        // Warn before navigating away
        window.onbeforeunload = () => true;
    }

    ReactDOM.render(
        // important: this is checking whether `simulateScratchDesktop` is truthy, not just defined!
        simulateScratchDesktop ?
            <WrappedGui
                canEditTitle
                isScratchDesktop
                showTelemetryModal
                canSave={false}
                onTelemetryModalCancel={handleTelemetryModalCancel}
                onTelemetryModalOptIn={handleTelemetryModalOptIn}
                onTelemetryModalOptOut={handleTelemetryModalOptOut}
            /> :
            <WrappedGui
                canEditTitle
                backpackVisible
                showComingSoon
                backpackHost={backpackHost}
                canSave={Boolean(devStudentId)}
                projectHost={apiScratchProjectsHost}
                assetHost={apiScratchProjectsHost}
                projectId={devProjectId}
                onClickLogo={onClickLogo}
                onUpdateProjectThumbnail={saveThumbnailToServer}
                autoSaveIntervalSecs={90}
            />,
        appTarget);
};
