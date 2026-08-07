import React, {useState} from 'react';
import ReactDOM from 'react-dom';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import log from '../lib/log.js';
import saveThumbnailToServer from '../lib/save-thumbnail-to-server';
import storage from '../lib/storage';
import AccessGate from '../components/access-gate/access-gate.jsx';
import ProjectPicker from '../components/project-picker/project-picker.jsx';
import TemplatePicker from '../components/template-picker/template-picker.jsx';
import PublicPlayer from '../components/public-player/public-player.jsx';

// Sobrevive un refresh accidental de la página sin perder al alumno ya identificado (el código de
// acceso ya se guarda aparte, ver access-gate.jsx) — se borra solo al cerrar la pestaña/navegador,
// mismo criterio de "barrera de sesión, no de seguridad" que el resto del flujo de acceso.
const STUDENT_SESSION_KEY = 'ca_editor_student';
// Mismo criterio para el docente (Fase 4) — acá sí importa la seguridad real (es un token JWT
// válido de /admin), pero el criterio de "se borra al cerrar la pestaña" sigue siendo el correcto:
// es una compu compartida del aula, no el dispositivo personal del docente.
const TEACHER_SESSION_KEY = 'ca_editor_teacher';

const readStoredStudent = () => {
    try {
        const raw = sessionStorage.getItem(STUDENT_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const readStoredTeacher = () => {
    try {
        const raw = sessionStorage.getItem(TEACHER_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

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

// Sesión 32 — nombre del alumno/docente + acciones de sesión, ahora vive DENTRO de la barra del
// editor (prop `rightContent` de <WrappedGui>, ver menu-bar.jsx) en vez de flotar como badge fuera
// de ella. La barra tiene texto blanco siempre (`.menu-bar { color: $ui-white }` en menu-bar.css),
// en los dos temas — a diferencia del badge flotante viejo, acá no hace falta condicionar el color
// según `isDarkMode()`.
const sessionInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    fontSize: '0.8rem',
    color: '#ffffff',
    whiteSpace: 'nowrap'
};

const sessionButtonStyle = {
    marginLeft: 10,
    background: 'none',
    border: 'none',
    color: '#ffffff',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '0.8rem',
    padding: 0
};

/*
 * Wraps <WrappedGui> con la pantalla de código de acceso + búsqueda de alumno/login docente +
 * selector de proyectos/plantillas (Fases 2 y 4, docs/scratch-editor-integration.md del monorepo
 * privado). Después de seleccionar un alumno, solo se guarda/muestra su nombre de pila de acá en
 * adelante — el nombre completo solo existe durante la búsqueda dentro de AccessGate.
 */
const PlaygroundApp = ({WrappedGui}) => {
    const [student, setStudent] = useState(readStoredStudent);
    const [teacher, setTeacher] = useState(readStoredTeacher);
    // undefined: todavía no se eligió — muestra el picker correspondiente. null (solo alumno):
    // "crear nuevo" (proyecto en blanco). string: id de un proyecto/plantilla existente.
    const [projectId, setProjectId] = useState(undefined);
    const [templateId, setTemplateId] = useState(undefined);

    const handleSelectStudent = (id, firstName) => {
        const newStudent = {id, firstName};
        sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(newStudent));
        setStudent(newStudent);
    };

    // Sesión 32 — antes se llamaba "cambiar de alumno" y era la única salida disponible desde
    // ambas pantallas (badge del editor y botón de ProjectPicker). Ahora es exclusivamente "salir
    // del todo, volver a la pantalla de rol" — usada solo desde el botón "Salir" de ProjectPicker.
    // Para volver a los proyectos del MISMO alumno sin salir de la sesión, ver
    // handleBackToProjects más abajo (nuevo, usado desde la barra del editor).
    const handleExitToStart = () => {
        sessionStorage.removeItem(STUDENT_SESSION_KEY);
        setStudent(null);
        setProjectId(undefined);
    };

    const handleBackToProjects = () => setProjectId(undefined);

    const handleTeacherLogin = (token, user) => {
        const newTeacher = {token, name: user.name};
        sessionStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(newTeacher));
        storage.setAuthToken(token);
        setTeacher(newTeacher);
    };

    const handleTeacherLogout = () => {
        sessionStorage.removeItem(TEACHER_SESSION_KEY);
        storage.setAuthToken(null);
        setTeacher(null);
        setTemplateId(undefined);
    };

    if (!student && !teacher) {
        return <AccessGate onSelectStudent={handleSelectStudent} onTeacherLogin={handleTeacherLogin} />;
    }

    // ── Modo docente ──────────────────────────────────────────────────────
    if (teacher) {
        storage.setAuthToken(teacher.token);

        if (typeof templateId === 'undefined') {
            return (
                <TemplatePicker
                    token={teacher.token}
                    onLogout={handleTeacherLogout}
                    onSelectTemplate={id => setTemplateId(id)}
                />
            );
        }

        const apiScratchTemplatesHost = `${process.env.API_URL}/admin/scratch-templates`;
        const teacherRightContent = (
            <div style={sessionInfoStyle}>
                {teacher.name}
                <button style={sessionButtonStyle} type="button" onClick={() => setTemplateId(undefined)}>
                    Mis plantillas
                </button>
                <button style={sessionButtonStyle} type="button" onClick={handleTeacherLogout}>
                    Cerrar sesión
                </button>
            </div>
        );
        return (
            <WrappedGui
                canEditTitle
                backpackVisible
                canSave
                projectHost={apiScratchTemplatesHost}
                assetHost={apiScratchTemplatesHost}
                projectId={templateId}
                rightContent={teacherRightContent}
                onClickLogo={onClickLogo}
                onUpdateProjectThumbnail={saveThumbnailToServer}
            />
        );
    }

    // ── Modo alumno ───────────────────────────────────────────────────────
    storage.setAuthToken(null);

    if (typeof projectId === 'undefined') {
        return (
            <ProjectPicker
                studentId={student.id}
                onCreateNew={() => setProjectId(null)}
                onExit={handleExitToStart}
                onSelectProject={id => setProjectId(id)}
            />
        );
    }

    const apiScratchProjectsHost = `${process.env.API_URL}/scratch-projects/${student.id}`;
    // ProjectFetcherHOC (containers/project-fetcher-hoc.jsx) solo despacha setProjectId en su
    // constructor si projectId no es null/undefined/'' — con projectId=null (nuestro "crear
    // nuevo") nunca dispara nada, y sin HashParserHOC (sacado en el Paso 2.2, ver más abajo) ya no
    // hay ningún otro lado que dispare la carga del proyecto en blanco por defecto: ni el gato ni
    // el Stage aparecían. Se traduce null a '0' (defaultProjectId, sentinela hardcodeado en
    // reducers/project-state.js) para que sí dispare esa carga — mismo id que usaba HashParserHOC.
    const effectiveProjectId = projectId === null ? '0' : projectId;

    const studentRightContent = (
        <div style={sessionInfoStyle}>
            {student.firstName}
            <button style={sessionButtonStyle} type="button" onClick={handleBackToProjects}>
                Volver a mis proyectos
            </button>
        </div>
    );

    return (
        <WrappedGui
            canEditTitle
            backpackVisible
            canSave
            projectHost={apiScratchProjectsHost}
            assetHost={apiScratchProjectsHost}
            projectId={effectiveProjectId}
            rightContent={studentRightContent}
            onClickLogo={onClickLogo}
            onUpdateProjectThumbnail={saveThumbnailToServer}
        />
    );
};

/*
 * Render the GUI playground. This is a separate function because importing anything
 * that instantiates the VM causes unsupported browsers to crash
 * {object} appTarget - the DOM element to render to
 */
export default appTarget => {
    GUI.setAppElement(appTarget);

    // Sin HashParserHOC a propósito: ese HOC del fork original lee el id de proyecto del #hash de
    // la URL (mecanismo legacy del playground de scratch-www) y en su componentDidMount despacha
    // "no hay hash, cargá el proyecto en blanco" incondicionalmente — pisando el projectId real que
    // le pasamos por prop (ver PlaygroundApp) justo cuando empieza a cargar. Bug real encontrado en
    // el Paso 2.2: elegir un proyecto ya guardado se quedaba colgado para siempre en "Cargando
    // proyecto"/"Creando el proyecto" superpuestos — nuestro fetch real llegaba bien (sin error de
    // red), pero el reducer de project-state ya había pisado el loadingState a FETCHING_NEW_DEFAULT
    // por el hash vacío, así que el DONE_FETCHING_WITH_ID de nuestro fetch quedaba descartado en
    // silencio. No usamos URLs con #hash para elegir proyecto — nuestro propio AccessGate +
    // ProjectPicker ya cumplen ese rol — así que este HOC no aporta nada acá, solo rompe.
    const WrappedGui = AppStateHOC(GUI);

    // Fase 5 — vista pública de solo lectura, sin AccessGate/login: /jugar/:projectId. No hay
    // react-router en esta app (todo el resto del flujo ya es un state machine simple dentro de
    // <PlaygroundApp>, ver comentario ahí), así que el path se lee directo de window.location acá,
    // antes de decidir qué árbol montar. webpack.config.js tiene devServer.historyApiFallback para
    // que esta ruta cargue bien en dev — el mismo rewrite hace falta en el hosting final (Fase 7).
    const jugarMatch = window.location.pathname.match(/^\/jugar\/([^/]+)\/?$/);
    if (jugarMatch) {
        ReactDOM.render(
            <PublicPlayer WrappedGui={WrappedGui} projectId={jugarMatch[1]} onClickLogo={onClickLogo} />,
            appTarget
        );
        return;
    }

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
