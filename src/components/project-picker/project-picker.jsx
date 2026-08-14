import classNames from 'classnames';
import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';

import styles from './project-picker.css';
import ExitEditorGuard from '../exit-editor-guard/exit-editor-guard.jsx';

// Sesión 34 — mismo relative-time en español que el resto de la plataforma usa para "hace X" (ej.
// notificaciones del portal de familias), acá sin dependencia nueva (date-fns no está instalado en
// este fork) — alcanza con una escalera simple de unidades.
const timeAgo = isoString => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora mismo';
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `hace ${diffHrs} h`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return 'ayer';
    if (diffDays < 30) return `hace ${diffDays} días`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
    const diffYears = Math.floor(diffMonths / 12);
    return `hace ${diffYears} ${diffYears === 1 ? 'año' : 'años'}`;
};

// Fase 5 — el link público (/jugar/:id) vive en el mismo host que el editor: no hace falta una env
// var nueva todavía (el dominio de producción recién se decide en la Fase 7, deploy). En dev,
// window.location.origin ya apunta al puerto correcto del propio webpack-dev-server.
const publicPlayUrl = projectId => `${window.location.origin}/jugar/${projectId}`;

/*
 * Sesión 34 — submenú "⋮" por proyecto (renombrar / publicar / ver / borrar). Antes "Publicar" y
 * "Ver" vivían como acciones siempre visibles debajo de la card — se consolidan acá junto con las
 * dos acciones nuevas (renombrar, borrar) para no acumular botones sueltos por card ahora que el
 * layout es más compacto (grid de 6 columnas).
 */
const ProjectMenu = ({project, onClose, onRename, onTogglePublish, onDelete, isToggling}) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = e => {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [onClose]);

    return (
        <div ref={menuRef} className={styles.projectMenu} onMouseDown={e => e.stopPropagation()}>
            <button className={styles.projectMenuItem} type="button" onClick={onRename}>
                ✏️ Renombrar
            </button>
            <button
                className={styles.projectMenuItem}
                disabled={isToggling}
                type="button"
                onClick={onTogglePublish}
            >
                {project.isPublishedToFamily ? '🔒 Despublicar' : '🌐 Publicar'}
            </button>
            {project.isPublishedToFamily && (
                <a
                    className={styles.projectMenuItem}
                    href={publicPlayUrl(project.id)}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    ▶ Ver proyecto
                </a>
            )}
            <div className={styles.projectMenuDivider} />
            <button className={styles.projectMenuItemDanger} type="button" onClick={onDelete}>
                🗑️ Borrar
            </button>
        </div>
    );
};

ProjectMenu.propTypes = {
    isToggling: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onRename: PropTypes.func.isRequired,
    onTogglePublish: PropTypes.func.isRequired,
    project: PropTypes.shape({
        id: PropTypes.string.isRequired,
        isPublishedToFamily: PropTypes.bool
    }).isRequired
};

const ConfirmDeleteModal = ({title, isDeleting, onCancel, onConfirm}) => (
    <div className={styles.confirmBackdrop} onMouseDown={onCancel}>
        <div className={styles.confirmCard} onMouseDown={e => e.stopPropagation()}>
            <h2 className={styles.confirmTitle}>🗑️ ¿Borrar este proyecto?</h2>
            <p className={styles.confirmText}>
                <strong>{title}</strong> se va a borrar para siempre. Esta acción no se puede deshacer.
            </p>
            <div className={styles.confirmActions}>
                <button className={styles.confirmCancelButton} type="button" onClick={onCancel}>
                    Cancelar
                </button>
                <button
                    className={styles.confirmDeleteButton}
                    disabled={isDeleting}
                    type="button"
                    onClick={onConfirm}
                >
                    {isDeleting ? 'Borrando…' : 'Sí, borrar'}
                </button>
            </div>
        </div>
    </div>
);

ConfirmDeleteModal.propTypes = {
    isDeleting: PropTypes.bool,
    onCancel: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired
};

/*
 * Lista los proyectos ya guardados de un alumno (GET /scratch-projects/:studentId) para elegir
 * continuar uno o empezar uno nuevo — evita que cada entrada al editor arranque siempre en
 * blanco, perdiendo de vista lo ya hecho. Ver docs/scratch-editor-integration.md (monorepo
 * privado, Fase 2, Paso 2.2).
 *
 * Sesión 34 — reskin completo: header fijo (buscador + título + salir), grid de 6 columnas con
 * scroll propio, selección de card + botón "Cargar proyecto" en vez de abrir directo al primer
 * click (mismo patrón que un selector de archivos nativo), y acciones secundarias (renombrar,
 * publicar, borrar) movidas a un submenú "⋮" por card.
 *
 * 14/08/2026 — mismo cambio que TemplatePicker: deja de ser una pantalla propia
 * (/proyectos, eliminada) para vivir como modal superpuesto AL editor (ver "Ajustes" en
 * render-gui.jsx) — por eso "onClose" (antes "onExit") ya no cierra sesión, solo oculta el modal;
 * cerrar sesión ahora vive en el menú de Ajustes ("Salir"), separado. Elegir otro proyecto/tarea o
 * empezar uno nuevo mientras hay cambios sin guardar en el que está abierto atrás puede perderlos
 * — esos tres triggers (Nuevo proyecto, Cargar proyecto, Empezar/Continuar tarea) pasan por
 * ExitEditorGuard, mismo guardián que ya protege "Editar plantilla" del lado docente.
 */
const ProjectPicker = ({studentId, token, onSelectProject, onCreateNew, onClose}) => {
    // Fase 4 del plan (docs/plan-fases-scratch-plataforma.md, monorepo privado) — pestaña nueva
    // "Tareas asignadas" al lado de "Mis Proyectos", mismo picker (header/footer/grid) en vez de
    // un componente aparte, para no duplicar el chrome del modal.
    const [activeTab, setActiveTab] = useState('projects');
    const [projects, setProjects] = useState(null);
    const [tasks, setTasks] = useState(null);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [startingTaskId, setStartingTaskId] = useState(null);

    // Fase 6 (punto 2, sesión real por alumno) — todo lo de acá abajo vive detrás de
    // StudentOwnershipGuard del lado de la API: sin este header, cualquiera de estos fetch da 401.
    const authHeaders = {Authorization: `Bearer ${token}`};

    useEffect(() => {
        fetch(`${process.env.API_URL}/scratch-projects/${studentId}`, {headers: authHeaders})
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(setProjects)
            .catch(() => setError('No se pudieron cargar tus proyectos.'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    // Se trae siempre (no solo al entrar a la pestaña) — así el badge con la cantidad ya está
    // listo desde el principio y projects ya tiene los datos para saber, por sourceTemplateId, qué
    // tareas ya tienen progreso propio (ver hasProgress más abajo).
    useEffect(() => {
        fetch(`${process.env.API_URL}/scratch-templates/assigned/${studentId}`, {headers: authHeaders})
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(setTasks)
            .catch(() => setError('No se pudieron cargar tus tareas asignadas.'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    // Idempotente del lado del backend (ScratchTemplatesService.cloneToStudentProject) — si el
    // alumno ya tiene un proyecto de esta plantilla, esto devuelve ESE proyecto en vez de crear
    // uno nuevo. Por eso acá no hace falta distinguir "empezar" de "continuar": siempre se llama
    // igual, y directo se navega al proyecto que devuelva.
    const handleStartTask = templateId => {
        setStartingTaskId(templateId);
        fetch(`${process.env.API_URL}/scratch-templates/${templateId}/clone/${studentId}`, {
            method: 'POST',
            headers: authHeaders
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(project => onSelectProject(project.id))
            .catch(() => {
                setError('No se pudo abrir la tarea. Probá de nuevo.');
                setStartingTaskId(null);
            });
    };

    const hasProgress = templateId => Boolean(projects && projects.some(p => p.sourceTemplateId === templateId));

    const handleTogglePublish = project => {
        setOpenMenuId(null);
        setTogglingId(project.id);
        fetch(`${process.env.API_URL}/scratch-projects/${studentId}/${project.id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', ...authHeaders},
            body: JSON.stringify({isPublishedToFamily: !project.isPublishedToFamily})
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(updated => {
                setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
            })
            .catch(() => setError('No se pudo cambiar la publicación. Probá de nuevo.'))
            .finally(() => setTogglingId(null));
    };

    const startRename = project => {
        setOpenMenuId(null);
        setRenamingId(project.id);
        setRenameValue(project.title);
    };

    const submitRename = project => {
        const nextTitle = renameValue.trim();
        setRenamingId(null);
        if (!nextTitle || nextTitle === project.title) return;
        // Optimista: se ve el nombre nuevo de inmediato, sin esperar la respuesta.
        setProjects(prev => prev.map(p => (p.id === project.id ? {...p, title: nextTitle} : p)));
        fetch(`${process.env.API_URL}/scratch-projects/${studentId}/${project.id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', ...authHeaders},
            body: JSON.stringify({title: nextTitle})
        }).catch(() => setError('No se pudo renombrar el proyecto. Probá de nuevo.'));
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        fetch(`${process.env.API_URL}/scratch-projects/${studentId}/${deleteTarget.id}`, {
            method: 'DELETE',
            headers: authHeaders
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
                setSelectedId(prev => (prev === deleteTarget.id ? null : prev));
                setDeleteTarget(null);
            })
            .catch(() => setError('No se pudo borrar el proyecto. Probá de nuevo.'))
            .finally(() => setIsDeleting(false));
    };

    const filteredProjects = projects
        ? projects.filter(p => p.title.toLowerCase().includes(query.trim().toLowerCase()))
        : null;
    const filteredTasks = tasks
        ? tasks.filter(t => t.template.title.toLowerCase().includes(query.trim().toLowerCase()))
        : null;

    return (
        <div className={styles.backdrop}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.searchWrap}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input
                            className={styles.searchInput}
                            placeholder="Buscar proyecto…"
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                    <div className={styles.tabBar}>
                        <button
                            className={classNames(
                                styles.tabButton, {[styles.tabButtonActive]: activeTab === 'projects'}
                            )}
                            type="button"
                            onClick={() => setActiveTab('projects')}
                        >
                            📂 Mis Proyectos
                        </button>
                        <button
                            className={classNames(styles.tabButton, {[styles.tabButtonActive]: activeTab === 'tasks'})}
                            type="button"
                            onClick={() => setActiveTab('tasks')}
                        >
                            🎯 Tareas asignadas
                            {tasks && tasks.length > 0 && <span className={styles.tabBadge}>{tasks.length}</span>}
                        </button>
                    </div>
                    <button className={styles.closeButton} type="button" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className={styles.content}>
                    {error && <p className={styles.hint}>{error}</p>}
                    {activeTab === 'projects' && projects === null && !error && (
                        <p className={styles.hint}>Cargando…</p>
                    )}
                    {activeTab === 'projects' && projects && projects.length === 0 && (
                        <p className={styles.hint}>Todavía no tenés proyectos guardados.</p>
                    )}
                    {activeTab === 'projects' && filteredProjects && projects.length > 0 &&
                        filteredProjects.length === 0 && (
                        <p className={styles.hint}>No encontramos ningún proyecto con ese nombre.</p>
                    )}
                    {activeTab === 'projects' && filteredProjects && filteredProjects.length > 0 && (
                        <div className={styles.grid}>
                            {filteredProjects.map(project => (
                                <div
                                    key={project.id}
                                    className={
                                        project.id === selectedId
                                            ? `${styles.projectCard} ${styles.projectCardSelected}`
                                            : styles.projectCard
                                    }
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedId(project.id)}
                                    onDoubleClick={() => onSelectProject(project.id)}
                                >
                                    <div className={styles.thumbWrap}>
                                        {project.thumbnailUrl ? (
                                            <img alt="" className={styles.thumb} src={project.thumbnailUrl} />
                                        ) : (
                                            <div className={styles.thumbPlaceholder}>🐱</div>
                                        )}
                                        {project.isPublishedToFamily && (
                                            <span className={styles.publishedBadge}>
                                                {/* SVG propio en vez del emoji 🌐 — un emoji es un glifo a todo
                                                color, no se puede recolorear con `color`/`fill` de CSS. Necesitamos
                                                que contraste oscuro sobre el verde-agua del badge. */}
                                                <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
                                                    <circle cx="12" cy="12" r="9" stroke="#0a2e22" strokeWidth="2.5" />
                                                    <path d="M3 12h18" stroke="#0a2e22" strokeWidth="2.5" />
                                                    <path
                                                        d="M12 3a14 14 0 0 1 3.6 9 14 14 0 0 1-3.6 9 14 14 0 0 1-3.6-9A14 14 0 0 1 12 3Z"
                                                        stroke="#0a2e22"
                                                        strokeWidth="2.5"
                                                    />
                                                </svg>
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.meta}>
                                        <div className={styles.metaText}>
                                            {renamingId === project.id ? (
                                                <input
                                                    autoFocus
                                                    className={styles.renameInput}
                                                    type="text"
                                                    value={renameValue}
                                                    onBlur={() => submitRename(project)}
                                                    onChange={e => setRenameValue(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') submitRename(project);
                                                        if (e.key === 'Escape') setRenamingId(null);
                                                    }}
                                                />
                                            ) : (
                                                <span className={styles.projectTitle}>{project.title}</span>
                                            )}
                                            <span className={styles.projectDate}>{timeAgo(project.updatedAt)}</span>
                                        </div>
                                        <div className={styles.menuAnchor}>
                                            <button
                                                className={styles.menuButton}
                                                type="button"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === project.id ? null : project.id);
                                                }}
                                            >
                                                ⋮
                                            </button>
                                            {openMenuId === project.id && (
                                                <ProjectMenu
                                                    isToggling={togglingId === project.id}
                                                    project={project}
                                                    onClose={() => setOpenMenuId(null)}
                                                    onDelete={() => {
                                                        setOpenMenuId(null);
                                                        setDeleteTarget(project);
                                                    }}
                                                    onRename={() => startRename(project)}
                                                    onTogglePublish={() => handleTogglePublish(project)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'tasks' && tasks === null && !error && (
                        <p className={styles.hint}>Cargando…</p>
                    )}
                    {activeTab === 'tasks' && tasks && tasks.length === 0 && (
                        <p className={styles.hint}>Todavía no tenés tareas asignadas por tu docente.</p>
                    )}
                    {activeTab === 'tasks' && filteredTasks && filteredTasks.length === 0 && tasks.length > 0 && (
                        <p className={styles.hint}>No encontramos ninguna tarea con ese nombre.</p>
                    )}
                    {activeTab === 'tasks' && filteredTasks && filteredTasks.length > 0 && (
                        <div className={styles.grid}>
                            {filteredTasks.map(({template}) => (
                                <div key={template.id} className={styles.taskCard}>
                                    <div className={styles.taskThumbWrap}>
                                        {template.thumbnailUrl ? (
                                            <img alt="" className={styles.taskThumb} src={template.thumbnailUrl} />
                                        ) : (
                                            <div className={styles.taskThumbPlaceholder}>🎯</div>
                                        )}
                                        {hasProgress(template.id) && (
                                            <span className={styles.taskProgressBadge}>En progreso</span>
                                        )}
                                    </div>
                                    <div className={styles.taskMeta}>
                                        <span className={styles.taskTitle}>{template.title}</span>
                                        <p className={styles.taskStory}>{template.story}</p>
                                        <ExitEditorGuard onExit={() => handleStartTask(template.id)}>
                                            <button
                                                className={styles.taskAction}
                                                disabled={startingTaskId === template.id}
                                                type="button"
                                            >
                                                {startingTaskId === template.id
                                                    ? 'Abriendo…'
                                                    : hasProgress(template.id)
                                                        ? '↻ Continuar'
                                                        : '▶ Empezar'}
                                            </button>
                                        </ExitEditorGuard>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {activeTab === 'projects' && (
                    <div className={styles.footer}>
                        <ExitEditorGuard onExit={onCreateNew}>
                            <button className={styles.footerButtonSecondary} type="button">
                                ➕ Nuevo proyecto
                            </button>
                        </ExitEditorGuard>
                        <ExitEditorGuard onExit={() => onSelectProject(selectedId)}>
                            <button className={styles.footerButtonPrimary} disabled={!selectedId} type="button">
                                📂 Cargar proyecto
                            </button>
                        </ExitEditorGuard>
                    </div>
                )}
            </div>

            {deleteTarget && (
                <ConfirmDeleteModal
                    isDeleting={isDeleting}
                    title={deleteTarget.title}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={confirmDelete}
                />
            )}
        </div>
    );
};

ProjectPicker.propTypes = {
    onClose: PropTypes.func.isRequired,
    onCreateNew: PropTypes.func.isRequired,
    onSelectProject: PropTypes.func.isRequired,
    studentId: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired
};

export default ProjectPicker;
