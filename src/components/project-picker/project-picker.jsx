import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';

import styles from './project-picker.css';

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
 */
const ProjectPicker = ({studentId, onSelectProject, onCreateNew, onExit}) => {
    const [projects, setProjects] = useState(null);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetch(`${process.env.API_URL}/scratch-projects/${studentId}`)
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(setProjects)
            .catch(() => setError('No se pudieron cargar tus proyectos.'));
    }, [studentId]);

    const handleTogglePublish = project => {
        setOpenMenuId(null);
        setTogglingId(project.id);
        fetch(`${process.env.API_URL}/scratch-projects/${studentId}/${project.id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
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
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title: nextTitle})
        }).catch(() => setError('No se pudo renombrar el proyecto. Probá de nuevo.'));
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        fetch(`${process.env.API_URL}/scratch-projects/${studentId}/${deleteTarget.id}`, {method: 'DELETE'})
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
                    <h1 className={styles.title}>Mis proyectos</h1>
                    <button className={styles.closeButton} type="button" onClick={onExit}>
                        ✕
                    </button>
                </div>

                <div className={styles.content}>
                    {error && <p className={styles.hint}>{error}</p>}
                    {projects === null && !error && <p className={styles.hint}>Cargando…</p>}
                    {projects && projects.length === 0 && (
                        <p className={styles.hint}>Todavía no tenés proyectos guardados.</p>
                    )}
                    {filteredProjects && filteredProjects.length === 0 && projects.length > 0 && (
                        <p className={styles.hint}>No encontramos ningún proyecto con ese nombre.</p>
                    )}
                    {filteredProjects && filteredProjects.length > 0 && (
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
                </div>

                <div className={styles.footer}>
                    <button className={styles.footerButtonPrimary} type="button" onClick={onCreateNew}>
                        ➕ Nuevo proyecto
                    </button>
                    <button
                        className={styles.footerButtonSecondary}
                        disabled={!selectedId}
                        type="button"
                        onClick={() => onSelectProject(selectedId)}
                    >
                        📂 Cargar proyecto
                    </button>
                </div>
            </div>

            {/* Sesión 32 — antes "No soy yo, cambiar de alumno" (buscaba otro alumno sin salir de
            la sesión). Ahora es una salida completa: vuelve a la pantalla inicial de rol (¿sos
            alumno o docente?), ver handleExitToStart en render-gui.jsx — botón X del header. */}

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
    onCreateNew: PropTypes.func.isRequired,
    onExit: PropTypes.func.isRequired,
    onSelectProject: PropTypes.func.isRequired,
    studentId: PropTypes.string.isRequired
};

export default ProjectPicker;
