import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';

import styles from './template-picker.css';
import AccessCodePanel from '../access-code-panel/access-code-panel.jsx';
import ExitEditorGuard from '../exit-editor-guard/exit-editor-guard.jsx';

const formatDate = isoString => new Date(isoString).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short'
});

// 13/08/2026 — la "misión" del docente pasó de un textarea libre a una lista de pasos
// (1., 2., 3.…) que el docente arma agregando/quitando ítems — pensado para instrucciones paso a
// paso ("programá al robot para que gire", "después que avance", ...), que antes quedaban todas
// amontonadas en un solo párrafo. Usado por EditInfoPanel — único lugar donde se edita relato/
// misión desde 14/08/2026 (ver comentario de TemplatePicker más abajo sobre el nuevo flujo de
// creación).
//
// El dato sigue viajando como un string plano al backend, sin tocar el schema: cada paso se une
// con "\n" al guardar (buildObjectiveText más abajo) y se vuelve a separar al leer (acá y en
// TaskBanner, que es donde lo lee el alumno) — evita una migración de columna por un cambio que es
// puramente de UI/UX.
const buildObjectiveText = items => items.map(step => step.trim()).filter(Boolean).join('\n');

const parseObjectiveText = text => {
    const steps = text ? text.split('\n').map(step => step.trim()).filter(Boolean) : [];
    return steps.length > 0 ? steps : [''];
};

const ObjectiveListEditor = ({items, onChange}) => {
    const updateStep = (index, value) => {
        const next = [...items];
        next[index] = value;
        onChange(next);
    };

    const removeStep = index => {
        if (items.length === 1) {
            onChange(['']);
            return;
        }
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className={styles.objectiveList}>
            {items.map((step, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={index} className={styles.objectiveItem}>
                    <span className={styles.objectiveItemNumber}>{index + 1}</span>
                    <input
                        className={styles.objectiveItemInput}
                        placeholder={`Paso ${index + 1}`}
                        type="text"
                        value={step}
                        onChange={e => updateStep(index, e.target.value)}
                    />
                    <button
                        className={styles.objectiveItemRemove}
                        disabled={items.length === 1 && !step}
                        title="Quitar paso"
                        type="button"
                        onClick={() => removeStep(index)}
                    >
                        ✕
                    </button>
                </div>
            ))}
            <button
                className={styles.addStepButton}
                type="button"
                onClick={() => onChange([...items, ''])}
            >
                ➕ Agregar paso
            </button>
        </div>
    );
};

ObjectiveListEditor.propTypes = {
    items: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired
};

// Fase 4 del plan (docs/plan-fases-scratch-plataforma.md, monorepo privado) — submenú "⋮" con
// asignar/renombrar/eliminar, mismo patrón que ProjectMenu de project-picker.css/jsx. "Asignar"
// vivía como botón (👥) suelto al lado de este menú — el usuario pidió que entre acá adentro
// junto con las otras dos acciones, en vez de quedar como acción rápida separada.
// Fase 5 — "📝 Editar info" suma acá (título/relato/objetivo + vista previa, ver EditInfoPanel más
// abajo) — nombre distinto a propósito del botón "✏️ Editar plantilla" del footer (ese abre el
// editor de bloques/disfraces de la plantilla en sí, esto edita solo el texto que lee el alumno).
const TemplateMenu = ({onClose, onAssign, onEditInfo, onRename, onDelete}) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = e => {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [onClose]);

    return (
        <div ref={menuRef} className={styles.templateMenu} onMouseDown={e => e.stopPropagation()}>
            <button className={styles.templateMenuItem} type="button" onClick={onAssign}>
                👥 Asignar
            </button>
            <button className={styles.templateMenuItem} type="button" onClick={onEditInfo}>
                📝 Editar info
            </button>
            <button className={styles.templateMenuItem} type="button" onClick={onRename}>
                ✏️ Renombrar
            </button>
            <button className={styles.templateMenuItemDanger} type="button" onClick={onDelete}>
                🗑️ Eliminar
            </button>
        </div>
    );
};

TemplateMenu.propTypes = {
    onAssign: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onEditInfo: PropTypes.func.isRequired,
    onRename: PropTypes.func.isRequired
};

const ConfirmDeleteModal = ({title, isDeleting, onCancel, onConfirm}) => (
    <div className={styles.panelBackdrop} onMouseDown={onCancel}>
        <div className={styles.panelCard} onMouseDown={e => e.stopPropagation()}>
            <h2 className={styles.panelTitle}>🗑️ ¿Eliminar esta plantilla?</h2>
            <p className={styles.panelSubtitle}>
                <strong>{title}</strong> se va a borrar para siempre, junto con sus asignaciones. Los proyectos
                de alumnos ya clonados de esta plantilla NO se borran — quedan como están. Esta acción no se
                puede deshacer.
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
                    {isDeleting ? 'Borrando…' : 'Sí, eliminar'}
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

// Fase 5 del plan (docs/plan-fases-scratch-plataforma.md, monorepo privado) — panel de edición de
// título/relato/objetivo. Tenía una vista previa en vivo acá abajo (reusando TaskBanner, la misma
// franja que ve el alumno en la Fase 4) — se sacó a pedido del usuario: el formulario de arriba ya
// muestra el texto completo sin truncar, la franja achicada no aportaba nada que no se viera ya.
const EditInfoPanel = ({token, template, onClose, onSaved}) => {
    const [title, setTitle] = useState(template.title);
    // 14/08/2026 — story/objective ahora pueden venir null (una plantilla creada desde el editor
    // nace solo con el título, sin pasar por este panel) — value=null en un input/textarea
    // controlado tira warning de React, || '' lo resuelve sin cambiar el comportamiento cuando sí
    // hay texto.
    const [story, setStory] = useState(template.story || '');
    const [objectiveItems, setObjectiveItems] = useState(parseObjectiveText(template.objective));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const objectiveText = buildObjectiveText(objectiveItems);
    const hasChanges = title.trim() !== template.title ||
        story.trim() !== (template.story || '') ||
        objectiveText !== (template.objective || '');

    const handleSave = () => {
        const nextTitle = title.trim();
        const nextStory = story.trim();
        if (!nextTitle || !nextStory || !objectiveText) {
            setError('Título, relato y al menos un paso de la misión son obligatorios.');
            return;
        }
        setSaving(true);
        setError(null);
        fetch(`${process.env.API_URL}/admin/scratch-templates/${template.id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
            body: JSON.stringify({title: nextTitle, story: nextStory, objective: objectiveText})
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(updated => {
                onSaved(updated);
                onClose();
            })
            .catch(() => {
                setError('No se pudo guardar. Probá de nuevo.');
                setSaving(false);
            });
    };

    return (
        <div className={styles.panelBackdrop} onMouseDown={onClose}>
            <div className={styles.panelCard} onMouseDown={e => e.stopPropagation()}>
                <h2 className={styles.panelTitle}>📝 Editar info</h2>
                <p className={styles.panelSubtitle}>
                    Título, relato y objetivo — lo que el alumno va a leer en la franja de la tarea.
                </p>

                <label className={styles.label} htmlFor="edit-title">Título</label>
                <input
                    className={styles.input}
                    id="edit-title"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />
                <label className={styles.label} htmlFor="edit-story">
                    Relato (el juego, la historia, el cuento)
                </label>
                <textarea
                    className={styles.textarea}
                    id="edit-story"
                    value={story}
                    onChange={e => setStory(e.target.value)}
                />
                <label className={styles.label}>Objetivo / misión (paso a paso)</label>
                <ObjectiveListEditor items={objectiveItems} onChange={setObjectiveItems} />

                {error && <p className={styles.error}>{error}</p>}
                <button
                    className={styles.newButton}
                    disabled={saving || !hasChanges}
                    type="button"
                    onClick={handleSave}
                >
                    {saving ? 'Guardando…' : '💾 Guardar cambios'}
                </button>
                <button className={styles.backLink} type="button" onClick={onClose}>
                    Cancelar
                </button>
            </div>
        </div>
    );
};

EditInfoPanel.propTypes = {
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func.isRequired,
    template: PropTypes.shape({
        id: PropTypes.string.isRequired,
        objective: PropTypes.string,
        story: PropTypes.string,
        title: PropTypes.string.isRequired
    }).isRequired,
    token: PropTypes.string.isRequired
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

    // Fase 3 del plan (docs/plan-fases-scratch-plataforma.md, monorepo) — asignar a un curso
    // entero es un vínculo vivo: cualquier comisión de ese curso (actual o futura) y por lo tanto
    // cualquier alumno de esas comisiones ya queda con acceso, sin volver a tocar nada acá.
    const [courses, setCourses] = useState(null);
    const [coursesError, setCoursesError] = useState(null);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    // Un curso puede tener comisiones de más de un rango de edad (ej. 6-10 y 11-15 del mismo
    // curso) — filtro opcional para que "todo el curso" no sea demasiado amplio en una plantilla
    // pensada para una sola franja etaria. Las opciones salen de las comisiones reales de ese
    // curso (mismo string que Commission.ageGroup), no de una lista fija — evita typos que
    // rompan el match por igualdad exacta del lado del backend.
    const [selectedAgeGroup, setSelectedAgeGroup] = useState('');

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
        // GET /courses es público (lo consume apps/landing sin login) — mismo criterio que ya
        // usa el selector de curso del form de comisiones en apps/web, se reusa acá en vez de
        // duplicar un endpoint nuevo.
        fetch(`${process.env.API_URL}/courses`)
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(setCourses)
            .catch(() => setCoursesError('No se pudieron cargar los cursos.'));
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
                // Fase 3 — el backend ya no expande comisión/curso a alumnos individuales (vínculo
                // vivo), así que "count" dejó de tener sentido para esos dos casos: la respuesta
                // ahora es {studentCount, commissionAssigned, courseAssigned}.
                if (result.courseAssigned) {
                    setAssignSuccess('Asignado a todo el curso — alumnos actuales y futuros.');
                } else if (result.commissionAssigned) {
                    setAssignSuccess('Asignado a toda la comisión — alumnos actuales y futuros.');
                } else {
                    setAssignSuccess(`Asignado a ${result.studentCount} alumno${result.studentCount === 1 ? '' : 's'}.`);
                }
                loadAssignments();
            })
            .catch(() => setAssignError('No se pudo asignar.'))
            .finally(() => setAssigning(false));
    };

    const handleAssignCourse = () => {
        if (!selectedCourseId) return;
        doAssign({courseId: selectedCourseId, ageGroup: selectedAgeGroup || undefined});
    };

    // Rangos de edad reales entre las comisiones del curso elegido — no una lista fija, para que
    // el valor matchee exacto contra Commission.ageGroup del lado del backend.
    const ageGroupOptions = selectedCourseId && commissions
        ? [...new Set(
            commissions
                .filter(commission => commission.courseId === selectedCourseId)
                .map(commission => commission.ageGroup)
        )]
        : [];

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
        <div className={styles.panelBackdrop} onMouseDown={onClose}>
            <div className={styles.panelCard} onMouseDown={e => e.stopPropagation()}>
                <h2 className={styles.panelTitle}>👥 Asignar</h2>
                <p className={styles.panelSubtitle}>{templateTitle}</p>

                <label className={styles.label} htmlFor="assign-course">Por curso (recomendado)</label>
                {coursesError && <p className={styles.error}>{coursesError}</p>}
                {courses && (
                    <>
                        <select
                            className={styles.select}
                            id="assign-course"
                            value={selectedCourseId}
                            onChange={e => {
                                setSelectedCourseId(e.target.value);
                                setSelectedAgeGroup('');
                            }}
                        >
                            <option value="">Elegí un curso…</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>{course.title}</option>
                            ))}
                        </select>
                        {selectedCourseId && ageGroupOptions.length > 0 && (
                            <select
                                className={styles.select}
                                id="assign-course-age-group"
                                value={selectedAgeGroup}
                                onChange={e => setSelectedAgeGroup(e.target.value)}
                            >
                                <option value="">Todas las edades del curso</option>
                                {ageGroupOptions.map(ageGroup => (
                                    <option key={ageGroup} value={ageGroup}>Solo {ageGroup} años</option>
                                ))}
                            </select>
                        )}
                        <button
                            className={styles.newButton}
                            disabled={assigning || !selectedCourseId}
                            style={{marginBottom: 4}}
                            type="button"
                            onClick={handleAssignCourse}
                        >
                            {selectedAgeGroup ? `Asignar a ${selectedAgeGroup} años del curso` : 'Asignar a todo el curso'}
                        </button>
                    </>
                )}

                <label className={styles.label} htmlFor="assign-commission">Por comisión puntual</label>
                {commissionsError && <p className={styles.error}>{commissionsError}</p>}
                {commissions && (
                    <>
                        <select
                            className={styles.select}
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
                            style={{marginBottom: 4}}
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

                <p className={styles.label}>Ya asignada a</p>
                {assignmentsError && <p className={styles.error}>{assignmentsError}</p>}
                {assignments === null && !assignmentsError && <p className={styles.hint}>Cargando…</p>}
                {assignments && assignments.length === 0 && (
                    <p className={styles.hint}>Todavía no está asignada a nadie.</p>
                )}
                {assignments && assignments.length > 0 && (
                    <div className={styles.assignmentsList}>
                        {assignments.map(assignment => (
                            <div key={assignment.id} className={styles.assignmentRow}>
                                {/* Fase 3 — assignment.scope distingue las tres formas de
                                asignación: STUDENT (fila individual, como siempre),
                                COMMISSION/COURSE (vínculo vivo, ScratchTemplateGroupAssignment —
                                no tienen .student, es a nivel comisión/curso entero). */}
                                <span>
                                    {assignment.scope === 'COURSE' && (
                                        `🎓 ${assignment.ageGroup ? `${assignment.ageGroup} años de` : 'Todo el'} curso: ${assignment.course.title}`
                                    )}
                                    {assignment.scope === 'COMMISSION' && `👥 Toda la comisión: ${assignment.commission.name}`}
                                    {assignment.scope === 'STUDENT' && (
                                        <>
                                            {assignment.student.firstName} {assignment.student.lastName}
                                        </>
                                    )}
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
 * Selector de plantillas para el docente — mismo tratamiento visual que ProjectPicker (sesión 34).
 * 14/08/2026 — dejó de ser una pantalla propia (ruta /docente/plantillas): ahora es un modal que
 * se superpone SOBRE el editor sin salir de él (ver "Ajustes" en render-gui.jsx), con el editor
 * de fondo semi-visible detrás (backdrop translúcido/difuminado, ver template-picker.css). Por
 * eso "onClose" (antes "onLogout") ya no cierra sesión — cerrar sesión ahora vive en el menú de
 * Ajustes, separado; acá "cerrar" es solo ocultar este modal y volver a ver el editor, con la ✕ o
 * el nuevo botón "Cancelar" del footer, los dos hacen lo mismo.
 *
 * "Crear plantilla nueva" se sacó — para eso ya está "Archivo → Nuevo" del propio editor (mismo
 * mecanismo nativo de scratch-gui que ya existía, en vez de duplicar un flujo de creación
 * separado). Una plantilla nueva nace sin id ni story/objective; el primer guardado (blur/Enter
 * en el campo de título, o "Guardar ahora") la crea de verdad contra la API — ver
 * EditorTitleAutosave en render-gui.jsx. Relato y misión se completan después, si se quiere,
 * únicamente desde "Editar info" en el menú "⋮" de una plantilla ya guardada — nunca en la
 * creación.
 */
const TemplatePicker = ({token, onSelectTemplate, onClose}) => {
    const [templates, setTemplates] = useState(null);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [assigningTemplate, setAssigningTemplate] = useState(null);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAccessCode, setShowAccessCode] = useState(false);

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

    const startRename = template => {
        setOpenMenuId(null);
        setRenamingId(template.id);
        setRenameValue(template.title);
    };

    const submitRename = template => {
        const nextTitle = renameValue.trim();
        setRenamingId(null);
        if (!nextTitle || nextTitle === template.title) return;
        // Optimista, mismo criterio que project-picker.jsx: se ve el nombre nuevo de inmediato,
        // sin esperar la respuesta del PATCH.
        setTemplates(prev => prev.map(t => (t.id === template.id ? {...t, title: nextTitle} : t)));
        fetch(`${process.env.API_URL}/admin/scratch-templates/${template.id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
            body: JSON.stringify({title: nextTitle})
        }).catch(() => setError('No se pudo renombrar la plantilla. Probá de nuevo.'));
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        fetch(`${process.env.API_URL}/admin/scratch-templates/${deleteTarget.id}`, {
            method: 'DELETE',
            headers: {Authorization: `Bearer ${token}`}
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
                setSelectedId(prev => (prev === deleteTarget.id ? null : prev));
                setDeleteTarget(null);
            })
            .catch(() => setError('No se pudo eliminar la plantilla. Probá de nuevo.'))
            .finally(() => setIsDeleting(false));
    };

    const filteredTemplates = templates
        ? templates.filter(t => t.title.toLowerCase().includes(query.trim().toLowerCase()))
        : null;

    return (
        <div className={styles.backdrop}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.searchWrap}>
                            <span className={styles.searchIcon}>🔍</span>
                            <input
                                className={styles.searchInput}
                                placeholder="Buscar plantilla…"
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                        </div>
                        {/* Fase 6 del plan (docs/plan-fases-scratch-plataforma.md) — reemplaza el
                        ACCESS_CODE fijo compilado en el bundle público por un código rotativo que
                        el docente genera acá mismo. Ver AccessCodePanel. */}
                        <button className={styles.accessCodeButton} type="button" onClick={() => setShowAccessCode(true)}>
                            🔑 Código de la clase
                        </button>
                    </div>
                    <h1 className={styles.title}>Mis plantillas</h1>
                    <button className={styles.closeButton} type="button" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className={styles.content}>
                    {error && <p className={styles.hint}>{error}</p>}
                    {templates === null && !error && <p className={styles.hint}>Cargando…</p>}
                    {templates && templates.length === 0 && (
                        <p className={styles.hint}>Todavía no hay plantillas.</p>
                    )}
                    {filteredTemplates && filteredTemplates.length === 0 && templates.length > 0 && (
                        <p className={styles.hint}>No encontramos ninguna plantilla con ese nombre.</p>
                    )}
                    {filteredTemplates && filteredTemplates.length > 0 && (
                        <div className={styles.grid}>
                            {filteredTemplates.map(template => (
                                <div
                                    key={template.id}
                                    className={
                                        template.id === selectedId
                                            ? `${styles.templateCard} ${styles.templateCardSelected}`
                                            : styles.templateCard
                                    }
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedId(template.id)}
                                    onDoubleClick={() => onSelectTemplate(template.id)}
                                >
                                    <div className={styles.thumbWrap}>
                                        {template.thumbnailUrl ? (
                                            <img alt="" className={styles.thumb} src={template.thumbnailUrl} />
                                        ) : (
                                            <div className={styles.thumbPlaceholder}>🍎</div>
                                        )}
                                    </div>
                                    <div className={styles.meta}>
                                        <div className={styles.metaText}>
                                            {renamingId === template.id ? (
                                                <input
                                                    autoFocus
                                                    className={styles.renameInput}
                                                    type="text"
                                                    value={renameValue}
                                                    onBlur={() => submitRename(template)}
                                                    onChange={e => setRenameValue(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') submitRename(template);
                                                        if (e.key === 'Escape') setRenamingId(null);
                                                    }}
                                                />
                                            ) : (
                                                <span className={styles.templateTitle}>{template.title}</span>
                                            )}
                                            <span className={styles.templateStory}>
                                                {formatDate(template.updatedAt)}
                                            </span>
                                        </div>
                                        <div className={styles.menuAnchor}>
                                            <button
                                                className={styles.menuButton}
                                                type="button"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === template.id ? null : template.id);
                                                }}
                                            >
                                                ⋮
                                            </button>
                                            {openMenuId === template.id && (
                                                <TemplateMenu
                                                    onAssign={() => {
                                                        setOpenMenuId(null);
                                                        setAssigningTemplate(template);
                                                    }}
                                                    onClose={() => setOpenMenuId(null)}
                                                    onDelete={() => {
                                                        setOpenMenuId(null);
                                                        setDeleteTarget(template);
                                                    }}
                                                    onEditInfo={() => {
                                                        setOpenMenuId(null);
                                                        setEditingTemplate(template);
                                                    }}
                                                    onRename={() => startRename(template)}
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
                    <button className={styles.footerButtonSecondary} type="button" onClick={onClose}>
                        Cancelar
                    </button>
                    {/* Cambiar de plantilla mientras se está editando otra puede perder cambios sin
                    guardar del proyecto abierto atrás — mismo guardián que ya protege "Mis
                    plantillas"/"Cerrar sesión" en render-gui.jsx (guarda/descarta antes de
                    seguir). */}
                    <ExitEditorGuard onExit={() => onSelectTemplate(selectedId)}>
                        <button className={styles.footerButtonPrimary} disabled={!selectedId} type="button">
                            ✏️ Editar plantilla
                        </button>
                    </ExitEditorGuard>
                </div>
            </div>

            {assigningTemplate && (
                <AssignPanel
                    templateId={assigningTemplate.id}
                    templateTitle={assigningTemplate.title}
                    token={token}
                    onClose={() => setAssigningTemplate(null)}
                />
            )}

            {deleteTarget && (
                <ConfirmDeleteModal
                    isDeleting={isDeleting}
                    title={deleteTarget.title}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={confirmDelete}
                />
            )}

            {editingTemplate && (
                <EditInfoPanel
                    template={editingTemplate}
                    token={token}
                    onClose={() => setEditingTemplate(null)}
                    onSaved={updated => setTemplates(prev => prev.map(t => (t.id === updated.id ? updated : t)))}
                />
            )}

            {showAccessCode && <AccessCodePanel token={token} onClose={() => setShowAccessCode(false)} />}
        </div>
    );
};

TemplatePicker.propTypes = {
    onClose: PropTypes.func.isRequired,
    onSelectTemplate: PropTypes.func.isRequired,
    token: PropTypes.string.isRequired
};

export default TemplatePicker;
