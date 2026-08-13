import classNames from 'classnames';
import React, {useEffect, useState} from 'react';
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
import TaskBanner from '../components/task-banner/task-banner.jsx';
import ExitEditorGuard from '../components/exit-editor-guard/exit-editor-guard.jsx';
import fetchSharedScratchAssets from '../lib/fetch-shared-scratch-assets';
import {clearCodeSession, codeSessionMsRemaining} from '../lib/editor-access-code-session';

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
// 13/08/2026 — cambia de sessionStorage a localStorage a pedido del usuario: el docente quiere
// apagar la netbook, prenderla al otro día y seguir en sus plantillas sin loguearse de nuevo. El
// JWT (apps/api, JwtModule.register signOptions.expiresIn: '7d') ya da margen de sobra para eso.
// Trade-off real, aceptado a propósito: en una compu compartida del aula, cualquiera que abra
// crear.codersacademy.com.ar en esa misma netbook dentro de esos 7 días entra directo a "Mis
// plantillas" del docente, hasta que alguien cierre sesión a mano ("Cerrar sesión" o la "✕" de
// TemplatePicker, los dos siguen limpiando la sesión igual que antes). Antes (Fase 4) era
// sessionStorage justamente para evitar esto — se revierte esa decisión con este cambio.
const TEACHER_SESSION_KEY = 'ca_editor_teacher';

// JWT sin verificar firma (no hace falta — solo se usa para decidir localmente si conviene
// mostrarle al docente el picker directo o mandarlo a loguearse de nuevo; cualquier request real a
// la API igual pasa por el JwtStrategy del backend, que si acepta el token es porque es válido de
// verdad). Si el token viene raro/corrupto, se lo trata como vencido en vez de romper.
const decodeJwtExpiryMs = token => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
};

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
        const raw = localStorage.getItem(TEACHER_SESSION_KEY);
        if (!raw) return null;
        const teacher = JSON.parse(raw);
        const expiresAt = decodeJwtExpiryMs(teacher.token);
        if (expiresAt !== null && expiresAt <= Date.now()) {
            localStorage.removeItem(TEACHER_SESSION_KEY);
            return null;
        }
        return teacher;
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
// no cambia la lógica de sesión (alumno en sessionStorage, docente en localStorage desde
// 13/08/2026 — ver TEACHER_SESSION_KEY), solo se le suma una URL real por encima — permite
// compartir/recargar en la pantalla en la que estás y usar
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

    // Fase 6 (punto 2, sesión real por alumno) — `token` ahora es parte de la sesión guardada:
    // AccessGate ya lo pidió (POST /editor-student-auth/:id) antes de llamar acá. Sin este token,
    // StudentOwnershipGuard del lado de la API rechaza todo lo que pegue contra
    // /scratch-projects/:studentId/... aunque el id sea el correcto.
    const handleSelectStudent = (id, firstName, token) => {
        sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify({id, firstName, token}));
        navigate(PATHS.projects);
    };

    const handleTeacherLogin = (token, user) => {
        localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify({token, name: user.name}));
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
    storage.setAuthToken(student.token);
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
                    token={student.token}
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
    // Leído directo acá (no del render-prop de RequireStudent más abajo) a propósito: los Hooks de
    // React no pueden vivir adentro de esa callback (RequireStudent hace un return temprano sin
    // alumno, así que los hooks de acá quedarían llamados condicionalmente — "rendered fewer hooks
    // than expected" en cuanto cambiara esa condición). Mismo dato, misma fuente
    // (sessionStorage), solo que leído en el nivel del componente en vez de adentro del guard.
    const student = readStoredStudent();
    // ProjectFetcherHOC (containers/project-fetcher-hoc.jsx) solo despacha setProjectId en su
    // constructor si projectId no es null/undefined/'' — 'nuevo' (nuestro slug de URL para "crear
    // proyecto en blanco") se traduce acá a '0' (defaultProjectId, sentinela hardcodeado en
    // reducers/project-state.js) para que sí dispare esa carga. Mismo id que usaba el viejo
    // HashParserHOC, ver más abajo por qué no se usa ese HOC.
    const effectiveProjectId = projectId === 'nuevo' ? '0' : projectId;
    const apiScratchProjectsHost = student ? `${process.env.API_URL}/scratch-projects/${student.id}` : null;

    // Fase 4 del plan (docs/plan-fases-scratch-plataforma.md, monorepo privado) — fetch propio y
    // liviano (solo metadata, no el projectJson pesado que ya trae fetch-project-from-server.js
    // por su cuenta) para saber si el proyecto abierto viene de una plantilla y armar la franja de
    // tarea. Un proyecto libre (sin sourceTemplateId) o el sentinela '0' de "nuevo en blanco" no
    // muestran franja.
    const [taskInfo, setTaskInfo] = useState(null);
    useEffect(() => {
        if (!apiScratchProjectsHost || effectiveProjectId === '0') {
            setTaskInfo(null);
            return;
        }
        let cancelled = false;
        fetch(`${apiScratchProjectsHost}/${effectiveProjectId}`, {
            headers: student ? {Authorization: `Bearer ${student.token}`} : {}
        })
            .then(response => (response.ok ? response.json() : null))
            .then(project => {
                if (cancelled) return;
                setTaskInfo(
                    project && project.sourceTemplateId
                        ? {title: project.title, story: project.taskStory, objective: project.taskObjective}
                        : null
                );
            })
            .catch(() => {
                if (!cancelled) setTaskInfo(null);
            });
        return () => {
            cancelled = true;
        };
    }, [apiScratchProjectsHost, effectiveProjectId]);

    return (
        <RequireStudent>
            {() => {
                const studentRightContent = (
                    <div style={sessionInfoStyle}>
                        <span style={sessionNameStyle}>{student.firstName}</span>
                        <Divider className={menuBarStyles.divider} />
                        <ExitEditorGuard onExit={() => navigate(PATHS.projects)}>
                            <div className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable)}>
                                <img
                                    className={menuBarStyles.helpIcon}
                                    src={myProjectsIcon}
                                />
                                <span className={menuBarStyles.tutorialsLabel}>Mis Proyectos</span>
                            </div>
                        </ExitEditorGuard>
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
                        taskBanner={
                            taskInfo && (
                                <TaskBanner
                                    objective={taskInfo.objective}
                                    story={taskInfo.story}
                                    title={taskInfo.title}
                                />
                            )
                        }
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
                        localStorage.removeItem(TEACHER_SESSION_KEY);
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
                        <ExitEditorGuard onExit={() => navigate(PATHS.templates)}>
                            <button style={{...sessionButtonStyle, marginLeft: 0}} type="button">
                                Mis plantillas
                            </button>
                        </ExitEditorGuard>
                        <ExitEditorGuard
                            onExit={() => {
                                localStorage.removeItem(TEACHER_SESSION_KEY);
                                storage.setAuthToken(null);
                                navigate(PATHS.role);
                            }}
                        >
                            <button style={sessionButtonStyle} type="button">
                                Cerrar sesión
                            </button>
                        </ExitEditorGuard>
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

// Fase 6 del plan (docs/plan-fases-scratch-plataforma.md, monorepo privado) — el código de acceso
// ahora vence de verdad (ver access-gate.jsx). Este componente vive DENTRO del <BrowserRouter>
// (necesita useNavigate) pero fuera de <Routes> — se monta una sola vez, sobrevive a los cambios
// de ruta, y cada `ACCESS_CODE_CHECK_INTERVAL_MS` fija de nuevo cuánto falta. Poll en vez de un
// único setTimeout calculado al montar: así también cubre al alumno que entra DESPUÉS de que este
// componente ya montó (un setTimeout fijo calculado una sola vez, con sessionStorage todavía
// vacío, nunca se reprogramaría solo).
const ACCESS_CODE_CHECK_INTERVAL_MS = 30000;

const AccessCodeWatcher = () => {
    const navigate = useNavigate();
    useEffect(() => {
        const check = () => {
            // El código solo aplica al flujo de alumno — un docente logueado no tiene por qué
            // desconectarse porque en algún momento anterior de esta pestaña haya vencido un
            // código de alumno.
            if (!readStoredStudent()) return;
            const msRemaining = codeSessionMsRemaining();
            if (msRemaining === null || msRemaining > 0) return;
            clearCodeSession();
            sessionStorage.removeItem(STUDENT_SESSION_KEY);
            navigate(PATHS.role, {replace: true});
        };
        check();
        const intervalId = setInterval(check, ACCESS_CODE_CHECK_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [navigate]);
    return null;
};

const PlaygroundRouter = ({WrappedGui}) => (
    <BrowserRouter>
        <AccessCodeWatcher />
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

    // Bug real encontrado probando en producción (Fase 4) — un sprite de la biblioteca
    // institucional (SharedScratchAsset, /admin/scratch-assets) que YA viene adentro de una
    // plantilla/proyecto al cargar aparecía como "?" (404 contra assets.scratch.mit.edu). Causa:
    // storage.sharedAssetMap solo se poblaba cuando el alumno/docente ABRÍA el selector de
    // sprites/fondos (sprite-library.jsx/backdrop-library.jsx) — si el proyecto ya trae ese
    // sprite desde el clonado (nunca se abrió el selector en esta sesión), scratch-vm intenta
    // resolverlo y no lo encuentra ni en el mapa propio del proyecto ni en el institucional,
    // cae al CDN real de Scratch (que nunca tuvo este md5) y 404. Se dispara acá, al boot de la
    // app entera (fetchSharedScratchAssets ya se cachea en memoria, así que las llamadas
    // posteriores de esos dos selectores son gratis) — para cuando el proyecto termine de
    // cargar, el mapa institucional ya está listo.
    fetchSharedScratchAssets();

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
