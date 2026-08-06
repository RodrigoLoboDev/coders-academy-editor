import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';

import styles from './template-picker.css';

const formatDate = isoString => new Date(isoString).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short'
});

// Lienzo vacío mínimo (solo Stage, sin sprites ni sonidos) — arranque real de una plantilla nueva.
// A diferencia del alumno, el docente no parte del gato/proyecto default embebido (ese vive solo
// localmente vía storage.js, pensado para SHOWING_WITHOUT_ID, no para crear un registro real de
// entrada) — acá la plantilla ya existe como fila real desde el vamos, así que el JSON inicial se
// arma a mano, mínimo pero válido.
// Bug real encontrado probando: un Stage con costumes:[] (sin ningún fondo) hace que scratch-vm
// tire "Non-ascii character in FixedAsciiString" al cargarlo — mensaje engañoso (viene de
// scratch-sb1-converter, formato viejísimo), la causa real es currentCostume:0 apuntando a un
// array vacío. Fix: usar el mismo fondo blanco default que trae scratch-gui (mismo assetId que
// default-project/project-data.js), que ya resuelve bien contra el CDN de Scratch vía el fallback
// de getAssetGetConfig en storage.js — no hace falta subir un asset propio para esto.
const blankTemplateProjectJson = () => ({
    targets: [{
        isStage: true,
        name: 'Stage',
        variables: {},
        lists: {},
        broadcasts: {},
        blocks: {},
        comments: {},
        currentCostume: 0,
        costumes: [{
            assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
            name: 'backdrop1',
            md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
            dataFormat: 'svg',
            rotationCenterX: 240,
            rotationCenterY: 180
        }],
        sounds: [],
        volume: 100,
        layerOrder: 0,
        tempo: 60,
        videoTransparency: 50,
        videoState: 'on',
        textToSpeechLanguage: null
    }],
    monitors: [],
    extensions: [],
    meta: {semver: '3.0.0', vm: '2.3.0', agent: ''}
});

const NewTemplateForm = ({onCreate, onCancel, creating, error}) => {
    const [title, setTitle] = useState('');
    const [story, setStory] = useState('');
    const [objective, setObjective] = useState('');

    const handleSubmit = e => {
        e.preventDefault();
        onCreate({title: title.trim(), story: story.trim(), objective: objective.trim()});
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="template-title">Título</label>
            <input
                autoFocus
                className={styles.input}
                id="template-title"
                placeholder="Ej: El rescate del robot"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
            />
            <label className={styles.label} htmlFor="template-story">Relato (el juego, la historia, el cuento)</label>
            <textarea
                className={styles.textarea}
                id="template-story"
                placeholder="Ej: Un robot quedó atrapado en una cueva y necesita tu ayuda para salir."
                value={story}
                onChange={e => setStory(e.target.value)}
            />
            <label className={styles.label} htmlFor="template-objective">Objetivo / misión</label>
            <textarea
                className={styles.textarea}
                id="template-objective"
                placeholder="Ej: Programá al robot para que llegue hasta la salida sin chocar con las paredes."
                value={objective}
                onChange={e => setObjective(e.target.value)}
            />
            <button
                className={styles.newButton}
                disabled={creating || !title.trim() || !story.trim() || !objective.trim()}
                type="submit"
            >
                {creating ? 'Creando…' : '✅ Crear y empezar a armarla'}
            </button>
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.backLink} type="button" onClick={onCancel}>
                Cancelar
            </button>
        </form>
    );
};

NewTemplateForm.propTypes = {
    creating: PropTypes.bool.isRequired,
    error: PropTypes.string,
    onCancel: PropTypes.func.isRequired,
    onCreate: PropTypes.func.isRequired
};

// Paso 4.5 — panel de asignación por plantilla: comisión completa (alumnos activos de esa
// comisión, resuelto server-side, ver ScratchTemplatesService.assign) o alumno individual por
// nombre (mismo buscador debounced que access-gate.jsx). Vive en un modal propio en vez de una
// página nueva de /admin — la plantilla y su asignación son un flujo exclusivo del docente dentro
// del propio editor, no del panel admin del monorepo.
const AssignPanel = ({token, templateId, templateTitle, onClose}) => {
    const [commissions, setCommissions] = useState(null);
    const [commissionsError, setCommissionsError] = useState(null);
    const [selectedCommissionId, setSelectedCommissionId] = useState('');

    const [assignments, setAssignments] = useState(null);
    const [assignmentsError, setAssignmentsError] = useState(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState(null);
    const [assignSuccess, setAssignSuccess] = useState(null);

    const authHeaders = {Authorization: `Bearer ${token}`};

    const loadAssignments = () => {
        fetch(`${process.env.API_URL}/admin/scratch-templates/${templateId}/assignments`, {
            headers: authHeaders
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(setAssignments)
            .catch(() => setAssignmentsError('No se pudieron cargar las asignaciones.'));
    };

    useEffect(() => {
        fetch(`${process.env.API_URL}/commissions`, {headers: authHeaders})
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(setCommissions)
            .catch(() => setCommissionsError('No se pudieron cargar las comisiones.'));
        loadAssignments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateId]);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        const timeoutId = setTimeout(() => {
            fetch(`${process.env.API_URL}/students/search?q=${encodeURIComponent(query.trim())}`)
                .then(response => {
                    if (!response.ok) throw new Error(response.status);
                    return response.json();
                })
                .then(setResults)
                .catch(() => setResults([]))
                .finally(() => setIsSearching(false));
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const doAssign = body => {
        setAssigning(true);
        setAssignError(null);
        setAssignSuccess(null);
        fetch(`${process.env.API_URL}/admin/scratch-templates/${templateId}/assign`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', ...authHeaders},
            body: JSON.stringify(body)
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(result => {
                setAssignSuccess(`Asignado a ${result.count} alumno${result.count === 1 ? '' : 's'}.`);
                loadAssignments();
            })
            .catch(() => setAssignError('No se pudo asignar.'))
            .finally(() => setAssigning(false));
    };

    const handleAssignCommission = () => {
        if (!selectedCommissionId) return;
        doAssign({commissionId: selectedCommissionId});
    };

    const handleAssignStudent = student => {
        doAssign({studentIds: [student.id]});
        setQuery('');
        setResults([]);
    };

    const handleRemoveAssignment = assignmentId => {
        fetch(`${process.env.API_URL}/admin/scratch-template-assignments/${assignmentId}`, {
            method: 'DELETE',
            headers: authHeaders
        })
            .then(() => loadAssignments())
            .catch(() => setAssignmentsError('No se pudo quitar la asignación.'));
    };

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.card} onClick={e => e.stopPropagation()}>
                <h1 className={styles.title}>👥 Asignar</h1>
                <p className={styles.subtitle}>{templateTitle}</p>

                <label className={styles.label} htmlFor="assign-commission">Por comisión</label>
                {commissionsError && <p className={styles.error}>{commissionsError}</p>}
                {commissions && (
                    <>
                        <select
                            className={styles.input}
                            id="assign-commission"
                            value={selectedCommissionId}
                            onChange={e => setSelectedCommissionId(e.target.value)}
                        >
                            <option value="">Elegí una comisión…</option>
                            {commissions.map(commission => (
                                <option key={commission.id} value={commission.id}>{commission.name}</option>
                            ))}
                        </select>
                        <button
                            className={styles.newButton}
                            disabled={assigning || !selectedCommissionId}
                            style={{marginBottom: 20}}
                            type="button"
                            onClick={handleAssignCommission}
                        >
                            Asignar a toda la comisión
                        </button>
                    </>
                )}

                <label className={styles.label} htmlFor="assign-student">Por alumno individual</label>
                <input
                    className={styles.input}
                    id="assign-student"
                    placeholder="Buscá por nombre y apellido"
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                {isSearching && <p className={styles.hint}>Buscando…</p>}
                {results.length > 0 && (
                    <div className={styles.resultsList}>
                        {results.map(student => (
                            <button
                                key={student.id}
                                className={styles.resultItem}
                                disabled={assigning}
                                type="button"
                                onClick={() => handleAssignStudent(student)}
                            >
                                {student.firstName} {student.lastName}
                            </button>
                        ))}
                    </div>
                )}

                {assignError && <p className={styles.error}>{assignError}</p>}
                {assignSuccess && <p className={styles.success}>{assignSuccess}</p>}

                <p className={styles.label} style={{marginTop: 20}}>Ya asignada a</p>
                {assignmentsError && <p className={styles.error}>{assignmentsError}</p>}
                {assignments === null && !assignmentsError && <p className={styles.hint}>Cargando…</p>}
                {assignments && assignments.length === 0 && (
                    <p className={styles.hint}>Todavía no está asignada a nadie.</p>
                )}
                {assignments && assignments.length > 0 && (
                    <div className={styles.assignmentsList}>
                        {assignments.map(assignment => (
                            <div key={assignment.id} className={styles.assignmentRow}>
                                <span>
                                    {assignment.student.firstName} {assignment.student.lastName}
                                    {assignment.commission && ` · ${assignment.commission.name}`}
                                </span>
                                <button
                                    className={styles.removeButton}
                                    type="button"
                                    onClick={() => handleRemoveAssignment(assignment.id)}
                                >
                                    Quitar
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button className={styles.backLink} type="button" onClick={onClose}>
                    Cerrar
                </button>
            </div>
        </div>
    );
};

AssignPanel.propTypes = {
    onClose: PropTypes.func.isRequired,
    templateId: PropTypes.string.isRequired,
    templateTitle: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired
};

/*
 * Selector de plantillas para el docente — análogo a ProjectPicker, pero contra
 * /admin/scratch-templates (requiere token de docente/admin) en vez de /scratch-projects/:studentId.
 */
const TemplatePicker = ({token, onSelectTemplate, onLogout}) => {
    const [templates, setTemplates] = useState(null);
    const [error, setError] = useState(null);
    const [creatingNew, setCreatingNew] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [assigningTemplate, setAssigningTemplate] = useState(null);

    useEffect(() => {
        fetch(`${process.env.API_URL}/admin/scratch-templates`, {
            headers: {Authorization: `Bearer ${token}`}
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(setTemplates)
            .catch(() => setError('No se pudieron cargar las plantillas.'));
    }, [token]);

    const handleCreate = ({title, story, objective}) => {
        setSubmitting(true);
        setCreateError(null);
        fetch(`${process.env.API_URL}/admin/scratch-templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({title, story, objective, projectJson: blankTemplateProjectJson()})
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(template => onSelectTemplate(template.id))
            .catch(() => setCreateError('No se pudo crear la plantilla.'))
            .finally(() => setSubmitting(false));
    };

    if (creatingNew) {
        return (
            <div className={styles.backdrop}>
                <div className={styles.card}>
                    <h1 className={styles.title}>🍎 Nueva plantilla</h1>
                    <p className={styles.subtitle}>Completá el título, el relato y la misión — después armás el proyecto en el editor.</p>
                    <NewTemplateForm
                        creating={submitting}
                        error={createError}
                        onCancel={() => setCreatingNew(false)}
                        onCreate={handleCreate}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.backdrop}>
            <div className={styles.card}>
                <h1 className={styles.title}>🍎 Tus plantillas</h1>
                <p className={styles.subtitle}>Elegí una para seguir armándola, o creá una nueva.</p>
                <button className={styles.newButton} type="button" onClick={() => setCreatingNew(true)}>
                    ➕ Crear plantilla nueva
                </button>
                {error && <p className={styles.error}>{error}</p>}
                {templates === null && !error && <p className={styles.hint}>Cargando…</p>}
                {templates && templates.length === 0 && (
                    <p className={styles.hint}>Todavía no hay plantillas.</p>
                )}
                {templates && templates.length > 0 && (
                    <div className={styles.grid}>
                        {templates.map(template => (
                            <div key={template.id} className={styles.templateCard}>
                                <button
                                    className={styles.templateCardMain}
                                    type="button"
                                    onClick={() => onSelectTemplate(template.id)}
                                >
                                    {template.thumbnailUrl ? (
                                        <img alt="" className={styles.thumb} src={template.thumbnailUrl} />
                                    ) : (
                                        <div className={styles.thumbPlaceholder}>🍎</div>
                                    )}
                                    <span className={styles.templateTitle}>{template.title}</span>
                                    <span className={styles.templateStory}>{template.story}</span>
                                    <span className={styles.templateStory}>{formatDate(template.updatedAt)}</span>
                                </button>
                                <button
                                    className={styles.assignButton}
                                    type="button"
                                    onClick={() => setAssigningTemplate(template)}
                                >
                                    👥 Asignar
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <button className={styles.backLink} type="button" onClick={onLogout}>
                    Cerrar sesión
                </button>
            </div>
            {assigningTemplate && (
                <AssignPanel
                    templateId={assigningTemplate.id}
                    templateTitle={assigningTemplate.title}
                    token={token}
                    onClose={() => setAssigningTemplate(null)}
                />
            )}
        </div>
    );
};

TemplatePicker.propTypes = {
    onLogout: PropTypes.func.isRequired,
    onSelectTemplate: PropTypes.func.isRequired,
    token: PropTypes.string.isRequired
};

// exportado para reuso/tests puntuales del skeleton de proyecto en blanco
export {blankTemplateProjectJson};
export default TemplatePicker;
