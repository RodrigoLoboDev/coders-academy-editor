import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';

import styles from './access-gate.css';

// Sesión de código de acceso: se guarda en sessionStorage (no localStorage) para que sobreviva un
// refresh accidental de la página pero se pida de nuevo si se cierra la pestaña/navegador — el
// código en sí solo es una barrera de producto (uso exclusivo en la academia), no una medida de
// seguridad real: este repo es público (AGPL) y el valor viaja igual en el bundle compilado, y el
// buscador de alumnos (GET /students/search) ya es un endpoint público sin auth. Ver
// docs/scratch-editor-integration.md (monorepo privado) para el porqué completo.
const CODE_SESSION_KEY = 'ca_editor_access_code_ok';

const normalizeCode = value => value.trim().toUpperCase();

const AccessGate = ({onSelectStudent}) => {
    const [step, setStep] = useState(
        () => (sessionStorage.getItem(CODE_SESSION_KEY) === '1' ? 'search' : 'code')
    );
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);

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

    if (step === 'code') {
        return (
            <div className={styles.backdrop}>
                <div className={styles.card}>
                    <h1 className={styles.title}>👋 ¡Hola!</h1>
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
                </div>
            </div>
        );
    }

    return (
        <div className={styles.backdrop}>
            <div className={styles.card}>
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
            </div>
        </div>
    );
};

AccessGate.propTypes = {
    onSelectStudent: PropTypes.func.isRequired
};

export default AccessGate;
