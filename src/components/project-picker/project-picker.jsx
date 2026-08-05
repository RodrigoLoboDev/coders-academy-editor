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
const ProjectPicker = ({studentId, onSelectProject, onCreateNew, onChangeStudent}) => {
    const [projects, setProjects] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`${process.env.API_URL}/scratch-projects/${studentId}`)
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(setProjects)
            .catch(() => setError('No se pudieron cargar tus proyectos.'));
    }, [studentId]);

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
                            <button
                                key={project.id}
                                className={styles.projectCard}
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
                        ))}
                    </div>
                )}
                <button className={styles.backLink} type="button" onClick={onChangeStudent}>
                    No soy yo, cambiar de alumno
                </button>
            </div>
        </div>
    );
};

ProjectPicker.propTypes = {
    onChangeStudent: PropTypes.func.isRequired,
    onCreateNew: PropTypes.func.isRequired,
    onSelectProject: PropTypes.func.isRequired,
    studentId: PropTypes.string.isRequired
};

export default ProjectPicker;
