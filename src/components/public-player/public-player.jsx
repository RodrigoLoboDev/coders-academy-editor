import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';

import styles from './public-player.css';

/*
 * Vista pública de solo lectura (Fase 5, docs/scratch-editor-integration.md sección 8) —
 * crear.codersacademy.com.ar/jugar/:projectId, sin login, sin AccessGate. Reemplaza por completo
 * a <PlaygroundApp> cuando la URL matchea /jugar/:id (ver render-gui.jsx).
 *
 * Hace su propio fetch primero (antes de montar el motor pesado de scratch-vm) solo para
 * confirmar que el proyecto existe y está publicado, y para tener el título a mano en el header —
 * <WrappedGui> hace su propio fetch después, independiente, contra el mismo endpoint (vía
 * fetch-project-from-server.js/storage.js, el mismo mecanismo genérico que ya usan los modos
 * alumno/docente). Es un fetch duplicado a propósito: separar "¿existe esto?" de "cargalo en el
 * motor" da un estado de error prolijo (título + mensaje) en vez de que el propio scratch-vm
 * fallback a su comportamiento genérico de error interno.
 */
const PublicPlayer = ({WrappedGui, projectId, onClickLogo}) => {
    const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'not-found'
    const [title, setTitle] = useState(null);

    useEffect(() => {
        fetch(`${process.env.API_URL}/scratch-projects/public/${projectId}`)
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(project => {
                setTitle(project.title);
                setStatus('ready');
            })
            .catch(() => setStatus('not-found'));
    }, [projectId]);

    if (status === 'loading') {
        return (
            <div className={styles.centered}>
                <p className={styles.hint}>Cargando…</p>
            </div>
        );
    }

    if (status === 'not-found') {
        return (
            <div className={styles.centered}>
                <div className={styles.card}>
                    <h1 className={styles.title}>🔍 No encontramos este proyecto</h1>
                    <p className={styles.subtitle}>
                        El link puede estar mal escrito, o el proyecto todavía no fue publicado.
                    </p>
                </div>
            </div>
        );
    }

    const apiScratchProjectsPublicHost = `${process.env.API_URL}/scratch-projects/public`;

    return (
        <div className={styles.playerWrapper}>
            <div className={styles.header}>
                <span className={styles.brand}>🍎 Coders Academy</span>
                <span className={styles.projectTitle}>{title}</span>
            </div>
            <div className={styles.stageArea}>
                <WrappedGui
                    isPlayerOnly
                    canSave={false}
                    projectHost={apiScratchProjectsPublicHost}
                    assetHost={apiScratchProjectsPublicHost}
                    projectId={projectId}
                    onClickLogo={onClickLogo}
                />
            </div>
        </div>
    );
};

PublicPlayer.propTypes = {
    WrappedGui: PropTypes.elementType.isRequired,
    onClickLogo: PropTypes.func,
    projectId: PropTypes.string.isRequired
};

export default PublicPlayer;
