import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';

import styles from './access-gate.css';

// Sesión de código de acceso: se guarda en sessionStorage (no localStorage) para que sobreviva un
// refresh accidental de la página pero se pida de nuevo si se cierra la pestaña/navegador — el
// código en sí solo es una barrera de producto (uso exclusivo en la academia), no una medida de
// seguridad real: este repo es público (AGPL) y el valor viaja igual en el bundle compilado, y el
// buscador de alumnos (GET /students/search) ya es un endpoint público sin auth. Ver
// docs/scratch-editor-integration.md (monorepo privado) para el porqué completo.
//
// El docente NO pasa por este código — ver handleChooseTeacher más abajo. Decisión tomada con el
// usuario (06/08/2026): pensando en una mejora futura del código de alumno (rotativo, con
// vencimiento por clase, creado desde /admin), atar al docente a "el código de hoy" no tendría
// sentido — un docente arma/edita plantillas en cualquier momento, no solo durante una clase en
// curso, y ya tiene una barrera real (login) que un código compartido no mejora en nada.
const CODE_SESSION_KEY = 'ca_editor_access_code_ok';

const normalizeCode = value => value.trim().toUpperCase();

// Sesión 34 — mismo motivo visual que <FloatingBackground> en apps/web/apps/actividades: íconos
// de marca flotando suavemente sobre el fondo, en emoji (no SVG con lucide-react) para no sumar
// una dependencia nueva a este fork — el resto del editor ya es fuertemente emoji (🎒🍎🔒🌐), así
// que encaja con el lenguaje visual existente en vez de desentonar.
const FLOATING_ICONS = [
    {emoji: '🚀', left: '8%', top: '18%', size: 36, delay: 0},
    {emoji: '⭐', left: '88%', top: '22%', size: 31, delay: 0.6},
    {emoji: '🎮', left: '10%', top: '76%', size: 36, delay: 1.8},
    {emoji: '✨', left: '82%', top: '72%', size: 29, delay: 0.9},
    {emoji: '🔷', left: '68%', top: '10%', size: 26, delay: 1.2}
];

const FloatingBackground = () => (
    <React.Fragment>
        {FLOATING_ICONS.map(({emoji, left, top, size, delay}, i) => (
            <span
                key={i}
                className={styles.floatingIcon}
                style={{
                    left,
                    top,
                    fontSize: size,
                    animationDuration: `${3 + delay}s`,
                    animationDelay: `${delay}s`
                }}
            >
                {emoji}
            </span>
        ))}
    </React.Fragment>
);

// Mascota JEN, mismo diseño que <RobotSVG> (apps/web/apps/landing) — portado a mano porque este
// fork corre en React 16 (sin `useId`, agregado recién en React 18): un id fijo alcanza porque
// nunca hay más de una instancia montada a la vez en esta pantalla.
const RobotMascot = ({armsUp}) => (
    <svg className={styles.robot} height={112} viewBox="0 0 120 120" width={112}>
        <defs>
            <linearGradient id="caEditorRobotGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#8A95FF" />
                <stop offset="1" stopColor="#6C7BFF" />
            </linearGradient>
        </defs>
        <line stroke="#FFB02E" strokeLinecap="round" strokeWidth="3" x1="60" x2="60" y1="30" y2="16" />
        <circle cx="60" cy="13" fill="#FFB02E" r="5" />
        <rect
            fill="#6C7BFF"
            height="26"
            rx="6"
            transform={armsUp ? 'rotate(-28 20 57)' : undefined}
            width="12"
            x="14"
            y={armsUp ? 44 : 60}
        />
        <rect
            fill="#6C7BFF"
            height="26"
            rx="6"
            transform={armsUp ? 'rotate(28 100 57)' : undefined}
            width="12"
            x="94"
            y={armsUp ? 44 : 60}
        />
        <rect
            fill="url(#caEditorRobotGrad)"
            height="60"
            rx="18"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
            width="68"
            x="26"
            y="30"
        />
        <rect fill="#10173A" height="34" rx="13" width="52" x="34" y="40" />
        <circle cx="49" cy="56" fill="#5BE7F0" r="6" />
        <circle cx="71" cy="56" fill="#5BE7F0" r="6" />
        <circle cx="51" cy="54" fill="#fff" r="1.8" />
        <circle cx="73" cy="54" fill="#fff" r="1.8" />
        {armsUp ? (
            <path d="M50 66q10 9 20 0" fill="none" stroke="#5BE7F0" strokeLinecap="round" strokeWidth="3" />
        ) : (
            <path d="M52 66q8 6 16 0" fill="none" stroke="#5BE7F0" strokeLinecap="round" strokeWidth="3" />
        )}
        <rect fill="#6C7BFF" height="10" rx="4" width="12" x="40" y="90" />
        <rect fill="#6C7BFF" height="10" rx="4" width="12" x="68" y="90" />
    </svg>
);

RobotMascot.propTypes = {
    armsUp: PropTypes.bool
};

const AccessGate = ({onSelectStudent, onTeacherLogin}) => {
    const [step, setStep] = useState('role');
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);

    const [teacherEmail, setTeacherEmail] = useState('');
    const [teacherPassword, setTeacherPassword] = useState('');
    const [teacherError, setTeacherError] = useState(null);
    const [teacherLoading, setTeacherLoading] = useState(false);

    const handleChooseStudent = () => {
        // Si ya pasó el código en esta misma pestaña/sesión, no se lo vuelve a pedir.
        setStep(sessionStorage.getItem(CODE_SESSION_KEY) === '1' ? 'search' : 'code');
    };

    const handleCodeSubmit = e => {
        e.preventDefault();
        if (normalizeCode(code) === normalizeCode(process.env.ACCESS_CODE || '')) {
            sessionStorage.setItem(CODE_SESSION_KEY, '1');
            setCodeError(null);
            setStep('search');
        } else {
            setCodeError('Código incorrecto. Pedile el código a tu profe.');
        }
    };

    const handleTeacherSubmit = e => {
        e.preventDefault();
        setTeacherLoading(true);
        setTeacherError(null);
        fetch(`${process.env.API_URL}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: teacherEmail.trim(), password: teacherPassword})
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(({token, user}) => {
                if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
                    setTeacherError('Esta cuenta no tiene permisos de docente.');
                    return;
                }
                onTeacherLogin(token, user);
            })
            .catch(() => setTeacherError('Email o contraseña incorrectos.'))
            .finally(() => setTeacherLoading(false));
    };

    useEffect(() => {
        if (step !== 'search' || query.trim().length < 2) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        setSearchError(null);
        const timeoutId = setTimeout(() => {
            fetch(`${process.env.API_URL}/students/search?q=${encodeURIComponent(query.trim())}`)
                .then(response => {
                    if (!response.ok) throw new Error(response.status);
                    return response.json();
                })
                .then(students => setResults(students))
                .catch(() => setSearchError('No se pudo buscar. Probá de nuevo.'))
                .finally(() => setIsSearching(false));
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [query, step]);

    if (step === 'role') {
        return (
            <div className={styles.backdrop}>
                <FloatingBackground />
                <div className={styles.card}>
                    <RobotMascot armsUp />
                    <p className={styles.eyebrow}>Coders Academy</p>
                    <h1 className={styles.title}>¡Hola! 👋</h1>
                    <p className={styles.subtitle}>¿Sos alumno o docente?</p>
                    <button className={styles.button} type="button" onClick={handleChooseStudent}>
                        🎒 Soy alumno
                    </button>
                    <button className={styles.buttonSecondary} type="button" onClick={() => setStep('teacherLogin')}>
                        🍎 Soy docente
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'code') {
        return (
            <div className={styles.backdrop}>
                <FloatingBackground />
                <div className={styles.card}>
                    <RobotMascot />
                    <p className={styles.eyebrow}>Acceso alumno</p>
                    <h1 className={styles.title}>¡Hola! 👋</h1>
                    <p className={styles.subtitle}>Ingresá el código que te dio tu profe.</p>
                    <form onSubmit={handleCodeSubmit}>
                        <input
                            autoFocus
                            className={styles.input}
                            placeholder="Código de acceso"
                            type="text"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                        />
                        <button className={styles.button} disabled={code.trim().length === 0} type="submit">
                            Entrar
                        </button>
                    </form>
                    {codeError && <p className={styles.error}>{codeError}</p>}
                    <button className={styles.backLink} type="button" onClick={() => setStep('role')}>
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'teacherLogin') {
        return (
            <div className={styles.backdrop}>
                <FloatingBackground />
                <div className={styles.card}>
                    <RobotMascot />
                    <p className={styles.eyebrow}>Portal docente</p>
                    <h1 className={styles.title}>🍎 Ingreso docente</h1>
                    <p className={styles.subtitle}>Usá tu mismo usuario del panel de Coders Academy.</p>
                    <form onSubmit={handleTeacherSubmit}>
                        <input
                            autoFocus
                            className={styles.input}
                            placeholder="Email"
                            type="email"
                            value={teacherEmail}
                            onChange={e => setTeacherEmail(e.target.value)}
                        />
                        <input
                            className={styles.input}
                            placeholder="Contraseña"
                            style={{marginTop: 10}}
                            type="password"
                            value={teacherPassword}
                            onChange={e => setTeacherPassword(e.target.value)}
                        />
                        <button
                            className={styles.button}
                            disabled={teacherLoading || !teacherEmail.trim() || !teacherPassword}
                            type="submit"
                        >
                            {teacherLoading ? 'Ingresando…' : 'Ingresar'}
                        </button>
                    </form>
                    {teacherError && <p className={styles.error}>{teacherError}</p>}
                    <button className={styles.backLink} type="button" onClick={() => setStep('role')}>
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.backdrop}>
            <FloatingBackground />
            <div className={styles.card}>
                <RobotMascot />
                <p className={styles.eyebrow}>Buscar alumno</p>
                <h1 className={styles.title}>🔍 ¿Quién sos?</h1>
                <p className={styles.subtitle}>Buscá tu nombre completo.</p>
                <input
                    autoFocus
                    className={styles.input}
                    placeholder="Nombre y apellido"
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                {isSearching && <p className={styles.hint}>Buscando…</p>}
                {searchError && <p className={styles.error}>{searchError}</p>}
                {results.length > 0 && (
                    <div className={styles.resultsList}>
                        {results.map(student => (
                            <button
                                key={student.id}
                                className={styles.resultItem}
                                type="button"
                                onClick={() => onSelectStudent(student.id, student.firstName)}
                            >
                                {student.firstName} {student.lastName}
                            </button>
                        ))}
                    </div>
                )}
                {!isSearching && query.trim().length >= 2 && results.length === 0 && !searchError && (
                    <p className={styles.hint}>No encontramos a nadie con ese nombre.</p>
                )}
                <button className={styles.backLink} type="button" onClick={() => setStep('role')}>
                    Volver
                </button>
            </div>
        </div>
    );
};

AccessGate.propTypes = {
    onSelectStudent: PropTypes.func.isRequired,
    onTeacherLogin: PropTypes.func.isRequired
};

export default AccessGate;
