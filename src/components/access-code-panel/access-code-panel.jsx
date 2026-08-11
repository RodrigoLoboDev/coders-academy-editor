import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';

import styles from './access-code-panel.css';

const formatCountdown = (expiresAt, now) => {
    const msLeft = new Date(expiresAt).getTime() - now;
    if (msLeft <= 0) return 'vencido';
    const totalMin = Math.floor(msLeft / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatClockTime = expiresAt => new Date(expiresAt).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
});

/*
 * Fase 6 del plan (docs/plan-fases-scratch-plataforma.md, monorepo privado) — reemplaza el
 * ACCESS_CODE fijo compilado en el bundle público de este repo (hallazgo de la auditoría de
 * seguridad: ese valor quedaba visible en el código fuente público) por un código rotativo que el
 * docente genera acá mismo, con vencimiento editable — mismo formato que los códigos de actividad
 * (3 letras + 3 números). Un alumno con sesión abierta cuando el código vence se desloguea solo
 * (ver AccessCodeWatcher en render-gui.jsx).
 */
const AccessCodePanel = ({token, onClose}) => {
    const [current, setCurrent] = useState(undefined); // undefined = cargando, null = sin código activo
    const [error, setError] = useState(null);
    const [duration, setDuration] = useState(180);
    const [generating, setGenerating] = useState(false);
    const [now, setNow] = useState(Date.now());
    // Bug real encontrado probando en producción: el panel se puede cerrar (✕/backdrop/"Cerrar")
    // mientras el fetch inicial o el de "Generar" siguen en vuelo — sin este guard, el .then()
    // llama setState sobre un componente ya desmontado ("memory leak" que tira React en la
    // consola). No cancela el fetch en sí (no hace falta, es liviano), solo evita actuar sobre su
    // resultado si ya no estamos montados.
    const isMountedRef = useRef(true);
    useEffect(() => () => {
        isMountedRef.current = false;
    }, []);

    const authHeaders = {Authorization: `Bearer ${token}`};

    useEffect(() => {
        fetch(`${process.env.API_URL}/admin/editor-access-code`, {headers: authHeaders})
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(data => {
                if (isMountedRef.current) setCurrent(data);
            })
            .catch(() => {
                if (isMountedRef.current) setError('No se pudo cargar el código actual.');
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(intervalId);
    }, []);

    const handleGenerate = () => {
        setGenerating(true);
        setError(null);
        fetch(`${process.env.API_URL}/admin/editor-access-code`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', ...authHeaders},
            body: JSON.stringify({durationMinutes: Number(duration)})
        })
            .then(async response => {
                const body = await response.json().catch(() => null);
                if (!response.ok) {
                    // Bug real encontrado probando: con una duración fuera de rango (ej. menos de
                    // 5 minutos) la API rechaza con 400 y un mensaje claro
                    // ("La duración tiene que ser... entre 5 y 1440 minutos"), pero acá se
                    // descartaba y se mostraba siempre el mismo genérico — el docente no tenía
                    // forma de saber qué estaba mal. Ahora se usa el mensaje real cuando viene.
                    throw new Error((body && body.message) || 'No se pudo generar el código.');
                }
                return body;
            })
            .then(data => {
                if (isMountedRef.current) setCurrent(data);
            })
            .catch(err => {
                if (isMountedRef.current) setError(err.message || 'No se pudo generar el código. Probá de nuevo.');
            })
            .finally(() => {
                if (isMountedRef.current) setGenerating(false);
            });
    };

    // Mismo rango que valida EditorAccessCodeService.generate del lado de la API — se chequea acá
    // también para deshabilitar el botón antes de gastar un pedido que sabemos que va a rechazar.
    const durationNumber = Number(duration);
    const isDurationValid = Number.isInteger(durationNumber) && durationNumber >= 5 && durationNumber <= 1440;

    return (
        <div className={styles.panelBackdrop} onMouseDown={onClose}>
            <div className={styles.panelCard} onMouseDown={e => e.stopPropagation()}>
                <h2 className={styles.panelTitle}>🔑 Código de la clase</h2>
                <p className={styles.panelSubtitle}>
                    Los alumnos lo usan para entrar al editor. Al vencer, se borra solo y quien esté adentro se
                    desloguea automáticamente.
                </p>

                {error && <p className={styles.error}>{error}</p>}

                {current === undefined && !error && <p className={styles.hint}>Cargando…</p>}

                {current !== undefined && (
                    <div className={styles.currentCode}>
                        {current ? (
                            <React.Fragment>
                                <span className={styles.codeValue}>{current.code}</span>
                                <span className={styles.codeExpiry}>
                                    Vence a las {formatClockTime(current.expiresAt)}
                                    {' '}({formatCountdown(current.expiresAt, now)})
                                </span>
                            </React.Fragment>
                        ) : (
                            <span className={styles.hint}>No hay ningún código activo ahora mismo.</span>
                        )}
                    </div>
                )}

                <label className={styles.label} htmlFor="access-code-duration">Duración (minutos)</label>
                <input
                    className={styles.input}
                    id="access-code-duration"
                    min={5}
                    max={1440}
                    type="number"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                />
                {!isDurationValid && <p className={styles.error}>Tiene que ser un número entero entre 5 y 1440.</p>}

                <button
                    className={styles.newButton}
                    disabled={generating || !isDurationValid}
                    type="button"
                    onClick={handleGenerate}
                >
                    {generating ? 'Generando…' : '🔑 Generar código nuevo'}
                </button>
                <button className={styles.backLink} type="button" onClick={onClose}>
                    Cerrar
                </button>
            </div>
        </div>
    );
};

AccessCodePanel.propTypes = {
    onClose: PropTypes.func.isRequired,
    token: PropTypes.string.isRequired
};

export default AccessCodePanel;
