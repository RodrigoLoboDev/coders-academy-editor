import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';

import styles from './project-picker.css';

const formatDate = isoString => new Date(isoString).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short'
});

/*
 * Lista los proyectos ya guardados de un alumno (GET /scratch-projects/:studentId) para elegir
 * continuar uno o empezar uno nuevo — evita que cada entrada al editor arranque siempre en
 * blanco, perdiendo de vista lo ya hecho. Ver docs/scratch-editor-integration.md (monorepo
 * privado, Fase 2, Paso 2.2).
 */
// Fase 5 — el link público (/jugar/:id) vive en el mismo host que el editor: no hace falta una env
// var nueva todavía (el dominio de producción recién se decide en la Fase 7, deploy). En dev,
// window.location.origin ya apunta al puerto correcto del propio webpack-dev-server.
const publicPlayUrl = projectId => `${window.location.origin}/jugar/${projectId}`;

const ProjectPicker = ({studentId, onSelectProject, onCreateNew, onExit}) => {
    const [projects, setProjects] = useState(null);
    const [error, setError] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

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

    return (
        <div className={styles.backdrop}>
            <div className={styles.card}>
                <h1 className={styles.title}>🧑‍💻 Tus proyectos</h1>
                <p className={styles.subtitle}>Elegí uno para seguir editando, o empezá uno nuevo.</p>
                <button className={styles.newButton} type="button" onClick={onCreateNew}>
                    ➕ Crear proyecto nuevo
                </button>
                {error && <p className={styles.hint}>{error}</p>}
                {projects === null && !error && <p className={styles.hint}>Cargando…</p>}
                {projects && projects.length === 0 && (
                    <p className={styles.hint}>Todavía no tenés proyectos guardados.</p>
                )}
                {projects && projects.length > 0 && (
                    <div className={styles.grid}>
                        {projects.map(project => (
                            <div key={project.id} className={styles.projectCard}>
                                <button
                                    className={styles.projectCardMain}
                                    type="button"
                                    onClick={() => onSelectProject(project.id)}
                                >
                                    {project.thumbnailUrl ? (
                                        <img alt="" className={styles.thumb} src={project.thumbnailUrl} />
                                    ) : (
                                        <div className={styles.thumbPlaceholder}>🐱</div>
                                    )}
                                    <span className={styles.projectTitle}>{project.title}</span>
                                    <span className={styles.projectDate}>{formatDate(project.updatedAt)}</span>
                                </button>
                                <div className={styles.projectActions}>
                                    <button
                                        className={styles.publishButton}
                                        disabled={togglingId === project.id}
                                        type="button"
                                        onClick={() => handleTogglePublish(project)}
                                    >
                                        {project.isPublishedToFamily ? '🌐 Publicado' : '🔒 Publicar'}
                                    </button>
                                    {project.isPublishedToFamily && (
                                        <a
                                            className={styles.playLink}
                                            href={publicPlayUrl(project.id)}
                                            rel="noopener noreferrer"
                                            target="_blank"
                                        >
                                            ▶ Ver
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {/* Sesión 32 — antes "No soy yo, cambiar de alumno" (buscaba otro alumno sin
                salir de la sesión). Ahora es una salida completa: vuelve a la pantalla inicial
                de rol (¿sos alumno o docente?), ver handleExitToStart en render-gui.jsx. */}
                <button className={styles.backLink} type="button" onClick={onExit}>
                    🚪 Salir
                </button>
            </div>
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
