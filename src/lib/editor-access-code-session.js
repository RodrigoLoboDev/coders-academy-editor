/*
 * Fase 6 del plan (docs/plan-fases-scratch-plataforma.md, monorepo privado) — sesión del código de
 * acceso rotativo (reemplaza el ACCESS_CODE fijo compilado en el bundle). Compartido entre
 * access-gate.jsx (guarda la sesión al validar el código contra la API) y render-gui.jsx
 * (AccessCodeWatcher, desloguea sola cuando vence) — un solo lugar para la clave de sessionStorage
 * y el formato guardado, para que los dos lados no se puedan desincronizar.
 */
const CODE_SESSION_KEY = 'ca_editor_access_code_ok';

export const saveCodeSession = expiresAt => {
    sessionStorage.setItem(CODE_SESSION_KEY, JSON.stringify({expiresAt}));
};

export const clearCodeSession = () => {
    sessionStorage.removeItem(CODE_SESSION_KEY);
};

const readCodeSession = () => {
    try {
        const raw = sessionStorage.getItem(CODE_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const isCodeSessionValid = () => {
    const session = readCodeSession();
    if (!session || !session.expiresAt) return false;
    return new Date(session.expiresAt).getTime() > Date.now();
};

/**
 * Milisegundos hasta que venza la sesión del código, o `null` si no hay sesión guardada. Puede
 * devolver un número negativo/cero si ya venció — quien llama decide qué hacer con eso.
 */
export const codeSessionMsRemaining = () => {
    const session = readCodeSession();
    if (!session || !session.expiresAt) return null;
    return new Date(session.expiresAt).getTime() - Date.now();
};
