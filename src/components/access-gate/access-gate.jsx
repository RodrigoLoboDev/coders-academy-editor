import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';

import styles from './access-gate.css';
import {getCodeSessionCode, isCodeSessionValid, saveCodeSession} from '../../lib/editor-access-code-session';

// Fase 6 del plan (docs/plan-fases-scratch-plataforma.md, monorepo privado) — código de acceso
// ROTATIVO, verificado contra la API (POST /editor-access-code/verify), reemplaza el ACCESS_CODE
// fijo compilado en el bundle. Hallazgo de la auditoría de seguridad que motivó el cambio: al ser
// este repo público (AGPL), el valor fijo (con su fallback hardcodeado en webpack.config.js)
// quedaba visible en el código fuente para cualquiera. Ahora el docente genera un código nuevo
// desde el editor (TemplatePicker → "Código de la clase"), con vencimiento editable — sigue siendo
// una barrera de producto, no reemplaza el buscador de alumnos público sin auth, pero ya no es "de
// conocimiento público en GitHub" ni fijo para siempre.
//
// Se sigue guardando la sesión en sessionStorage (no localStorage) para que sobreviva un refresh
// accidental de la página pero se pida de nuevo si se cierra la pestaña/navegador — más el
// vencimiento propio del código, que fuerza a pedirlo de nuevo aunque la pestaña siga abierta (ver
// AccessCodeWatcher en render-gui.jsx).
//
// El docente NO pasa por este código — un docente arma/edita plantillas en cualquier momento, no
// solo durante una clase en curso, y ya tiene una barrera real (login) que un código compartido no
// mejora en nada.

const normalizeCode = value => value.trim().toUpperCase();

// 14/08/2026 — reemplaza a <RobotMascot> (la mascota JEN, compartida con apps/actividades). Un
// alumno que ya usaba el reproductor de actividades y pasó a este editor comentó "profe, ¿no es
// el mismo?" al ver el mismo robot acá — aunque las dos apps son de la misma academia, cada una
// necesita su propia identidad visual para que el cambio de app se sienta como tal. En su lugar,
// la misma marca del favicon (`</>` sobre fondo indigo, ver design/favicon-source.html). `size`
// permite reusarlo tanto como isotipo grande (pantallas viejas) como en el lockup chico de marca
// de este rediseño (junto al wordmark "Coders Academy").
const EditorMark = ({size}) => (
    <svg height={size} viewBox="0 0 120 120" width={size}>
        <defs>
            <linearGradient id="caEditorMarkGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#8A95FF" />
                <stop offset="1" stopColor="#6C7BFF" />
            </linearGradient>
        </defs>
        <rect fill="url(#caEditorMarkGrad)" height="120" rx="26" width="120" />
        <text
            dominantBaseline="central"
            fill="#ffffff"
            fontFamily="'SF Mono', 'Roboto Mono', Consolas, Menlo, monospace"
            fontSize="58"
            fontWeight="800"
            letterSpacing="-4"
            stroke="#ffffff"
            strokeWidth="1"
            textAnchor="middle"
            x="60"
            y="63"
        >
            {'</>'}
        </text>
    </svg>
);

EditorMark.propTypes = {
    size: PropTypes.number
};

EditorMark.defaultProps = {
    size: 40
};

// Íconos de mostrar/ocultar contraseña — mismo criterio "profesional, sin emoji" del resto de
// este rediseño (14/08/2026): trazo simple (Feather/Lucide "eye"/"eye-off"), no un 👁️ de emoji.
const EyeIcon = () => (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = () => (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <line x1="1" x2="23" y1="1" y2="23" />
    </svg>
);

// 14/08/2026 — reescrito de punta a punta a pedido del usuario: antes eran 4 pantallas completas
// que se reemplazaban una a otra (role → code/teacherLogin → search); ahora es una sola pantalla
// de dos columnas — izquierda con la marca y la lista de rol (siempre visible, sin "Volver"
// porque nunca desaparece), derecha con el contenido según lo que se eligió a la izquierda. Menos
// emoji/tiles grandes, más el lenguaje de una herramienta de trabajo que de una app para jugar.
const AccessGate = ({onSelectStudent, onTeacherLogin}) => {
    const [role, setRole] = useState(null);

    // Alumno — paso 1: código de clase (se saltea si ya está vigente en esta pestaña).
    const [codeVerified, setCodeVerified] = useState(isCodeSessionValid());
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState(null);
    const [codeSubmitting, setCodeSubmitting] = useState(false);

    // Alumno — paso 2: buscar y elegir (ya no entra automático al elegir de la lista, ver
    // selectedStudent + handleConfirmEnter).
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [entering, setEntering] = useState(false);
    const [selectError, setSelectError] = useState(null);

    // Docente — email + contraseña.
    const [teacherEmail, setTeacherEmail] = useState('');
    const [teacherPassword, setTeacherPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [teacherError, setTeacherError] = useState(null);
    const [teacherLoading, setTeacherLoading] = useState(false);

    const handleSelectRole = nextRole => {
        setRole(nextRole);
    };

    const handleCodeSubmit = e => {
        e.preventDefault();
        setCodeSubmitting(true);
        setCodeError(null);
        fetch(`${process.env.API_URL}/editor-access-code/verify`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({code: normalizeCode(code)})
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(({valid, expiresAt}) => {
                if (!valid) {
                    setCodeError('Código incorrecto o vencido. Pedíselo a tu profe.');
                    return;
                }
                saveCodeSession(normalizeCode(code), expiresAt);
                setCodeVerified(true);
            })
            .catch(() => setCodeError('No se pudo verificar el código. Probá de nuevo.'))
            .finally(() => setCodeSubmitting(false));
    };

    // Elegir un resultado ya no entra directo — solo lo marca como seleccionado. El fetch real
    // (POST /editor-student-auth/:id, pide token de sesión propio del alumno) pasa a
    // handleConfirmEnter, disparado por el botón "Ingresar" explícito.
    const handlePickResult = student => {
        setSelectError(null);
        setSelectedStudent(student);
    };

    const handleConfirmEnter = () => {
        if (!selectedStudent) return;
        setSelectError(null);
        setEntering(true);
        fetch(`${process.env.API_URL}/editor-student-auth/${selectedStudent.id}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({accessCode: getCodeSessionCode()})
        })
            .then(response => {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(({token}) => onSelectStudent(selectedStudent.id, selectedStudent.firstName, token))
            .catch(() => setSelectError('No se pudo iniciar la sesión. Probá de nuevo.'))
            .finally(() => setEntering(false));
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
        if (role !== 'student' || !codeVerified || query.trim().length < 2) {
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
    }, [query, role, codeVerified]);

    // Cambiar la búsqueda descarta la selección previa — evita confirmar "Ingresar" sobre un
    // alumno que ya no está en la lista visible.
    const handleQueryChange = value => {
        setQuery(value);
        setSelectedStudent(null);
    };

    const renderRightColumn = () => {
        if (role === null) {
            return (
                <p className={styles.placeholder}>Elegí una opción para continuar</p>
            );
        }

        if (role === 'student' && !codeVerified) {
            return (
                <div className={styles.panelForm}>
                    <h2 className={styles.panelHeading}>Código de clase</h2>
                    <p className={styles.panelSubtext}>Ingresá el código que te dio tu profe para continuar.</p>
                    <form onSubmit={handleCodeSubmit}>
                        <input
                            autoFocus
                            className={`${styles.input} ${styles.inputCode}`}
                            placeholder="Código de acceso"
                            type="text"
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase())}
                        />
                        <button
                            className={styles.button}
                            disabled={codeSubmitting || code.trim().length === 0}
                            type="submit"
                        >
                            {codeSubmitting ? 'Verificando…' : 'Continuar'}
                        </button>
                    </form>
                    {codeError && <p className={styles.error}>{codeError}</p>}
                </div>
            );
        }

        if (role === 'student' && codeVerified) {
            return (
                <div className={styles.panelForm}>
                    <h2 className={styles.panelHeading}>Buscá tu nombre</h2>
                    <p className={styles.panelSubtext}>Elegí tu nombre de la lista y tocá Ingresar.</p>
                    <input
                        autoFocus
                        className={styles.input}
                        placeholder="Nombre y apellido"
                        type="text"
                        value={query}
                        onChange={e => handleQueryChange(e.target.value)}
                    />
                    {isSearching && <p className={styles.hint}>Buscando…</p>}
                    {searchError && <p className={styles.error}>{searchError}</p>}
                    {selectError && <p className={styles.error}>{selectError}</p>}
                    {results.length > 0 && (
                        <div className={styles.resultsList}>
                            {results.map(student => (
                                <button
                                    key={student.id}
                                    className={
                                        selectedStudent && selectedStudent.id === student.id
                                            ? `${styles.resultItem} ${styles.resultItemSelected}`
                                            : styles.resultItem
                                    }
                                    type="button"
                                    onClick={() => handlePickResult(student)}
                                >
                                    {student.firstName} {student.lastName}
                                </button>
                            ))}
                        </div>
                    )}
                    {!isSearching && query.trim().length >= 2 && results.length === 0 && !searchError && (
                        <p className={styles.hint}>No encontramos a nadie con ese nombre.</p>
                    )}
                    <button
                        className={styles.button}
                        disabled={!selectedStudent || entering}
                        type="button"
                        onClick={handleConfirmEnter}
                    >
                        {entering ? 'Ingresando…' : 'Ingresar'}
                    </button>
                </div>
            );
        }

        // role === 'teacher'
        return (
            <div className={styles.panelForm}>
                <h2 className={styles.panelHeading}>Iniciar sesión</h2>
                <p className={styles.panelSubtext}>Usá tu mismo usuario del panel de Coders Academy.</p>
                <form onSubmit={handleTeacherSubmit}>
                    <input
                        autoFocus
                        className={styles.input}
                        placeholder="Email"
                        type="email"
                        value={teacherEmail}
                        onChange={e => setTeacherEmail(e.target.value)}
                    />
                    <div className={styles.passwordWrap}>
                        <input
                            className={styles.input}
                            placeholder="Contraseña"
                            type={showPassword ? 'text' : 'password'}
                            value={teacherPassword}
                            onChange={e => setTeacherPassword(e.target.value)}
                        />
                        <button
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            className={styles.passwordToggle}
                            type="button"
                            onClick={() => setShowPassword(prev => !prev)}
                        >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>
                    <button
                        className={styles.button}
                        disabled={teacherLoading || !teacherEmail.trim() || !teacherPassword}
                        type="submit"
                    >
                        {teacherLoading ? 'Ingresando…' : 'Ingresar'}
                    </button>
                </form>
                {teacherError && <p className={styles.error}>{teacherError}</p>}
            </div>
        );
    };

    return (
        <div className={styles.backdrop}>
            <div className={styles.layout}>
                <div className={styles.leftCol}>
                    <div className={styles.brandRow}>
                        <EditorMark size={40} />
                        <span className={styles.brandName}>Coders Academy</span>
                    </div>
                    <h1 className={styles.heading}>
                        Bienvenido a <span className={styles.headingAccent}>Crear</span>
                    </h1>
                    <p className={styles.tagline}>Programá tus propios juegos y animaciones ✨</p>
                    <nav className={styles.roleList}>
                        <button
                            className={role === 'student' ? `${styles.roleItem} ${styles.roleItemActive}` : styles.roleItem}
                            type="button"
                            onClick={() => handleSelectRole('student')}
                        >
                            <span className={styles.roleArrow}>→</span> Alumno
                        </button>
                        <button
                            className={role === 'teacher' ? `${styles.roleItem} ${styles.roleItemActive}` : styles.roleItem}
                            type="button"
                            onClick={() => handleSelectRole('teacher')}
                        >
                            <span className={styles.roleArrow}>→</span> Docente
                        </button>
                    </nav>
                </div>
                <div className={styles.rightCol}>
                    {renderRightColumn()}
                </div>
            </div>
        </div>
    );
};

AccessGate.propTypes = {
    onSelectStudent: PropTypes.func.isRequired,
    onTeacherLogin: PropTypes.func.isRequired
};

export default AccessGate;
