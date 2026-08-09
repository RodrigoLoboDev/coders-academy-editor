import classNames from 'classnames';
import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter, Routes, Route, Navigate, useNavigate, useParams} from 'react-router-dom';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import log from '../lib/log.js';
import saveThumbnailToServer from '../lib/save-thumbnail-to-server';
import storage from '../lib/storage';
import AccessGate from '../components/access-gate/access-gate.jsx';
import ProjectPicker from '../components/project-picker/project-picker.jsx';
import TemplatePicker from '../components/template-picker/template-picker.jsx';
import PublicPlayer from '../components/public-player/public-player.jsx';
import Divider from '../components/divider/divider.jsx';

// Sesión 34 — reusa las clases ya definidas en menu-bar.css (mismo look que el botón Tutoriales:
// menuBarItem/hoverable/helpIcon, y el separador punteado blanco entre el título de proyecto y
// Tutoriales) en vez de duplicar esos estilos acá — el nombre físico de la clase es el mismo sin
// importar desde qué archivo se importe el módulo CSS.
import menuBarStyles from '../components/menu-bar/menu-bar.css';
import myProjectsIcon from '../components/menu-bar/icon--my-projects.svg';

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

// Sesión 32 — nombre del alumno/docente + acciones de sesión vive DENTRO de la barra del editor
// (prop `rightContent` de <WrappedGui>, ver menu-bar.jsx) en vez de flotar como badge fuera de
// ella. La barra tiene texto blanco siempre (`.menu-bar { color: $ui-white }` en menu-bar.css),
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

// Sesión 34 — nombre del alumno/docente/admin al mismo tamaño y grosor que el wordmark "Coders
// Academy | Editor" del logo (menu-bar/scratch-logo.svg: font-size 17, font-weight 700 — 17px con
// raíz de 16px por default, sin ningún override en este repo, ≈ 1.0625rem).
const sessionNameStyle = {
    fontSize: '1.0625rem',
    fontWeight: 700
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

// Sesión 33 — routing real con react-router (docs/scratch-editor-integration.md, monorepo
// privado). Antes todo el flujo (AccessGate → picker → editor) era una state machine adentro de
// un solo componente, sin tocar nunca la URL — el navegador siempre mostraba
// crear.codersacademy.com.ar sin importar la pantalla. Ahora cada pantalla tiene su propia ruta:
// no cambia la lógica de sesión (sigue en sessionStorage, sobrevive un refresh), solo se le suma
// una URL real por encima — permite compartir/recargar en la pantalla en la que estás y usar
// atrás/adelante del navegador. El catch-all de Vercel (vercel.json) y `historyApiFallback` del
// dev server (webpack.config.js) ya cubrían esto de antes, no hizo falta tocar infra.
const PATHS = {
    role: '/',
    projects: '/proyectos',
    editor: id => `/editor/${id}`,
    templates: '/docente/plantillas',
    template: id => `/docente/plantilla/${id}`
};

/*
 * Pantalla inicial: si ya hay sesión de alumno o docente guardada (refresh, o volver con
 * atrás/adelante del navegador), redirige directo a su picker en vez de mostrar el rol de nuevo.
 */
const RoleRoute = () => {
    const navigate = useNavigate();
    const student = readStoredStudent();
    const teacher = readStoredTeacher();

    if (student) return <Navigate replace to={PATHS.projects} />;
    if (teacher) return <Navigate replace to={PATHS.templates} />;

    const handleSelectStudent = (id, firstName) => {
        sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify({id, firstName}));
        navigate(PATHS.projects);
    };

    const handleTeacherLogin = (token, user) => {
        sessionStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify({token, name: user.name}));
        storage.setAuthToken(token);
        navigate(PATHS.templates);
    };

    return <AccessGate onSelectStudent={handleSelectStudent} onTeacherLogin={handleTeacherLogin} />;
};

/*
 * Guarda de ruta: sin sesión del rol pedido, vuelve a "/" en vez de mostrar la pantalla rota
 * (ej. entrar directo a /editor/xyz por URL sin haber elegido alumno antes).
 */
const RequireStudent = ({children}) => {
    const student = readStoredStudent();
    if (!student) return <Navigate replace to={PATHS.role} />;
    return children(student);
};

const RequireTeacher = ({children}) => {
    const teacher = readStoredTeacher();
    if (!teacher) return <Navigate replace to={PATHS.role} />;
    storage.setAuthToken(teacher.token);
    return children(teacher);
};

const ProjectsRoute = () => {
    const navigate = useNavigate();
    return (
        <RequireStudent>
            {student => (
                <ProjectPicker
                    studentId={student.id}
                    onCreateNew={() => navigate(PATHS.editor('nuevo'))}
                    onExit={() => {
                        sessionStorage.removeItem(STUDENT_SESSION_KEY);
                        navigate(PATHS.role);
                    }}
                    onSelectProject={id => navigate(PATHS.editor(id))}
                />
            )}
        </RequireStudent>
    );
};

const StudentEditorRoute = ({WrappedGui}) => {
    const navigate = useNavigate();
    const {projectId} = useParams();

    return (
        <RequireStudent>
            {student => {
                const apiScratchProjectsHost = `${process.env.API_URL}/scratch-projects/${student.id}`;
                // ProjectFetcherHOC (containers/project-fetcher-hoc.jsx) solo despacha
                // setProjectId en su constructor si projectId no es null/undefined/'' — 'nuevo'
                // (nuestro slug de URL para "crear proyecto en blanco") se traduce acá a '0'
                // (defaultProjectId, sentinela hardcodeado en reducers/project-state.js) para que
                // sí dispare esa carga. Mismo id que usaba el viejo HashParserHOC, ver más abajo
                // por qué no se usa ese HOC.
                const effectiveProjectId = projectId === 'nuevo' ? '0' : projectId;

                const studentRightContent = (
                    <div style={sessionInfoStyle}>
                        <span style={sessionNameStyle}>{student.firstName}</span>
                        <Divider className={menuBarStyles.divider} />
                        <div
                            className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable)}
                            onClick={() => navigate(PATHS.projects)}
                        >
                            <img
                                className={menuBarStyles.helpIcon}
                                src={myProjectsIcon}
                            />
                            <span className={menuBarStyles.tutorialsLabel}>Mis Proyectos</span>
                        </div>
                    </div>
                );

                return (
                    <WrappedGui
                        canEditTitle
                        canSave
                        projectHost={apiScratchProjectsHost}
                        assetHost={apiScratchProjectsHost}
                        projectId={effectiveProjectId}
                        rightContent={studentRightContent}
                        onClickLogo={onClickLogo}
                        onUpdateProjectThumbnail={saveThumbnailToServer}
                    />
                );
            }}
        </RequireStudent>
    );
};

const TemplatesRoute = () => {
    const navigate = useNavigate();
    return (
        <RequireTeacher>
            {teacher => (
                <TemplatePicker
                    token={teacher.token}
                    onLogout={() => {
                        sessionStorage.removeItem(TEACHER_SESSION_KEY);
                        storage.setAuthToken(null);
                        navigate(PATHS.role);
                    }}
                    onSelectTemplate={id => navigate(PATHS.template(id))}
                />
            )}
        </RequireTeacher>
    );
};

const TeacherEditorRoute = ({WrappedGui}) => {
    const navigate = useNavigate();
    const {templateId} = useParams();

    return (
        <RequireTeacher>
            {teacher => {
                const apiScratchTemplatesHost = `${process.env.API_URL}/admin/scratch-templates`;
                const teacherRightContent = (
                    <div style={sessionInfoStyle}>
                        <span style={sessionNameStyle}>{teacher.name}</span>
                        <Divider className={menuBarStyles.divider} />
                        <button
                            style={{...sessionButtonStyle, marginLeft: 0}}
                            type="button"
                            onClick={() => navigate(PATHS.templates)}
                        >
                            Mis plantillas
                        </button>
                        <button
                            style={sessionButtonStyle}
                            type="button"
                            onClick={() => {
                                sessionStorage.removeItem(TEACHER_SESSION_KEY);
                                storage.setAuthToken(null);
                                navigate(PATHS.role);
                            }}
                        >
                            Cerrar sesión
                        </button>
                    </div>
                );

                return (
                    <WrappedGui
                        canEditTitle
                        canSave
                        projectHost={apiScratchTemplatesHost}
                        assetHost={apiScratchTemplatesHost}
                        projectId={templateId}
                        rightContent={teacherRightContent}
                        onClickLogo={onClickLogo}
                        onUpdateProjectThumbnail={saveThumbnailToServer}
                    />
                );
            }}
        </RequireTeacher>
    );
};

const PublicPlayerRoute = ({WrappedGui}) => {
    const {projectId} = useParams();
    return <PublicPlayer WrappedGui={WrappedGui} projectId={projectId} onClickLogo={onClickLogo} />;
};

const PlaygroundRouter = ({WrappedGui}) => (
    <BrowserRouter>
        <Routes>
            <Route element={<RoleRoute />} path={PATHS.role} />
            <Route element={<ProjectsRoute />} path={PATHS.projects} />
            <Route element={<StudentEditorRoute WrappedGui={WrappedGui} />} path="/editor/:projectId" />
            <Route element={<TemplatesRoute />} path={PATHS.templates} />
            <Route element={<TeacherEditorRoute WrappedGui={WrappedGui} />} path="/docente/plantilla/:templateId" />
            <Route element={<PublicPlayerRoute WrappedGui={WrappedGui} />} path="/jugar/:projectId" />
            <Route element={<Navigate replace to={PATHS.role} />} path="*" />
        </Routes>
    </BrowserRouter>
);

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
    // le pasamos por prop justo cuando empieza a cargar. Bug real encontrado en el Paso 2.2: elegir
    // un proyecto ya guardado se quedaba colgado para siempre en "Cargando proyecto"/"Creando el
    // proyecto" superpuestos — nuestro fetch real llegaba bien (sin error de red), pero el reducer
    // de project-state ya había pisado el loadingState a FETCHING_NEW_DEFAULT por el hash vacío, así
    // que el DONE_FETCHING_WITH_ID de nuestro fetch quedaba descartado en silencio. Nuestro propio
    // AccessGate + ProjectPicker + el router (sesión 33) ya cumplen el rol de elegir proyecto por
    // URL — este HOC no aporta nada acá, solo rompe.
    const WrappedGui = AppStateHOC(GUI);

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
            <PlaygroundRouter WrappedGui={WrappedGui} />,
        appTarget);
};
