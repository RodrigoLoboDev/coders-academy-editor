import React, {useState} from 'react';
import ReactDOM from 'react-dom';
import {compose} from 'redux';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import HashParserHOC from '../lib/hash-parser-hoc.jsx';
import log from '../lib/log.js';
import saveThumbnailToServer from '../lib/save-thumbnail-to-server';
import AccessGate from '../components/access-gate/access-gate.jsx';

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

const badgeStyle = {
    position: 'fixed',
    top: 6,
    right: 12,
    zIndex: 1001,
    fontSize: '0.8rem',
    color: '#575e75',
    background: '#f4f4fb',
    padding: '4px 10px',
    borderRadius: 12
};

const badgeButtonStyle = {
    marginLeft: 8,
    background: 'none',
    border: 'none',
    color: '#1a1aad',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '0.8rem',
    padding: 0
};

/*
 * Wraps <WrappedGui> con la pantalla de código de acceso + búsqueda de alumno (Fase 2,
 * docs/scratch-editor-integration.md del monorepo privado). Después de seleccionar un alumno, solo
 * se guarda/muestra su nombre de pila de acá en adelante — el nombre completo solo existe durante
 * la búsqueda dentro de AccessGate.
 */
const PlaygroundApp = ({WrappedGui}) => {
    const [student, setStudent] = useState(null);

    if (!student) {
        return <AccessGate onSelectStudent={(id, firstName) => setStudent({id, firstName})} />;
    }

    const apiScratchProjectsHost = `${process.env.API_URL}/scratch-projects/${student.id}`;

    return (
        <React.Fragment>
            <div style={badgeStyle}>
                {student.firstName}
                <button
                    style={badgeButtonStyle}
                    type="button"
                    onClick={() => setStudent(null)}
                >
                    Cambiar
                </button>
            </div>
            <WrappedGui
                canEditTitle
                backpackVisible
                showComingSoon
                canSave
                projectHost={apiScratchProjectsHost}
                assetHost={apiScratchProjectsHost}
                onClickLogo={onClickLogo}
                onUpdateProjectThumbnail={saveThumbnailToServer}
                autoSaveIntervalSecs={90}
            />
        </React.Fragment>
    );
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
            <PlaygroundApp WrappedGui={WrappedGui} />,
        appTarget);
};
