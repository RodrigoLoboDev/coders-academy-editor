import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';

import styles from './task-banner.css';

/*
 * Fase 4 del plan (docs/plan-fases-scratch-plataforma.md, monorepo privado) — franja fija arriba
 * del editor con el título/relato/objetivo de la tarea asignada que el alumno tiene abierta.
 * Solo se muestra cuando el proyecto abierto viene de una plantilla (sourceTemplateId), ver
 * StudentEditorRoute en render-gui.jsx — un proyecto libre no la muestra.
 *
 * Altura fija a propósito (ver $task-banner-height en units.css, que gui.css resta del alto
 * disponible): "ver más" abre un popover superpuesto en vez de empujar el layout del editor hacia
 * abajo, así el cálculo de altura del stage/bloques no depende de cuánto texto tenga la tarea.
 */
const TaskBanner = ({title, story, objective}) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);

    // 13/08/2026 — la "misión" del docente pasó de un textarea libre a una lista de pasos (ver
    // ObjectiveListEditor en template-picker.jsx). El dato sigue viajando como un string plano
    // (sin tocar el backend): cada paso separado por "\n", unido ahí al guardar. Acá se vuelve a
    // separar para mostrarlo como <ol>/<li> real. Compatible con plantillas viejas guardadas antes
    // de este cambio (un solo párrafo sin "\n") — se ven como una lista de un solo paso.
    const objectiveSteps = objective
        ? objective.split('\n').map(step => step.trim()).filter(Boolean)
        : [];

    useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = e => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) setIsOpen(false);
        };
        const handleEscape = e => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    return (
        <div className={styles.banner}>
            <span className={styles.badge}>🎯 Tarea</span>
            <span className={styles.title}>{title}</span>
            {story && <span className={styles.storyPreview}>— {story}</span>}
            <div className={styles.popoverAnchor} ref={popoverRef}>
                <button
                    className={styles.toggleButton}
                    type="button"
                    onClick={() => setIsOpen(prev => !prev)}
                >
                    {isOpen ? 'Ocultar ▲' : 'Ver más ▾'}
                </button>
                {isOpen && (
                    <div className={styles.popover}>
                        <h2 className={styles.popoverTitle}>{title}</h2>
                        {story && (
                            <div className={styles.popoverSection}>
                                <h3 className={styles.popoverLabel}>📖 La historia</h3>
                                <p className={styles.popoverText}>{story}</p>
                            </div>
                        )}
                        {objectiveSteps.length > 0 && (
                            <div className={styles.popoverSection}>
                                <h3 className={styles.popoverLabel}>🎯 Tu misión</h3>
                                <ol className={styles.popoverObjectiveList}>
                                    {objectiveSteps.map((step, index) => (
                                        // eslint-disable-next-line react/no-array-index-key
                                        <li key={index}>{step}</li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

TaskBanner.propTypes = {
    objective: PropTypes.string,
    story: PropTypes.string,
    title: PropTypes.string.isRequired
};

export default TaskBanner;
