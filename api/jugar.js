/*
 * 21/11/2026 — función de Vercel que atiende /jugar/:id (ver vercel.json) para que el link se vea
 * bien al pegarlo en WhatsApp o redes: devuelve el mismo index.html de la app con las etiquetas
 * og:/twitter: del proyecto (título, miniatura, descripción fija). Para una persona no cambia nada:
 * recibe el mismo HTML y la app arranca igual. Toda la lógica de las etiquetas, el escape de lo que
 * escribe el alumno y la imagen está en _jugar-meta.js (con tests).
 *
 * Nunca debe romper la página: si la API tarda, falla, o el proyecto no existe o no está publicado,
 * se devuelven las etiquetas genéricas (como si no existiera esta función).
 */
const {PROJECT_ID_PATTERN, SITE_URL, buildMeta, injectMeta} = require('./_jugar-meta');

const API_URL = process.env.API_URL || 'https://coders-academy-api.onrender.com/api/v1';
// Si la API de Render está dormida, un bot no espera: mejor la vista previa genérica que ninguna.
const API_TIMEOUT_MS = 3000;
const INDEX_TIMEOUT_MS = 4000;

const fetchWithTimeout = (url, timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, {signal: controller.signal}).finally(() => clearTimeout(timer));
};

// Solo trae lo que la vista previa necesita (título y miniatura). `authorFirstName` también llega
// en esta respuesta pública, pero a propósito no se usa: el nombre del alumno no va en la vista previa.
const fetchProject = async projectId => {
    try {
        const response = await fetchWithTimeout(`${API_URL}/scratch-projects/public/${projectId}`, API_TIMEOUT_MS);
        if (!response.ok) return null;
        const project = await response.json();
        return {title: project.title, thumbnailUrl: project.thumbnailUrl};
    } catch {
        return null;
    }
};

module.exports = async (req, res) => {
    const projectId = String((req.query && req.query.id) || '');

    let html;
    try {
        // /index.html es un archivo estático real: no pasa por la regla de /jugar/:id (no hay bucle).
        const indexResponse = await fetchWithTimeout(`${SITE_URL}/index.html`, INDEX_TIMEOUT_MS);
        if (!indexResponse.ok) throw new Error(indexResponse.status);
        html = await indexResponse.text();
    } catch {
        res.status(502).send('No se pudo cargar la página. Probá de nuevo en unos segundos.');
        return;
    }

    const project = PROJECT_ID_PATTERN.test(projectId) ? await fetchProject(projectId) : null;
    const output = injectMeta(html, buildMeta(projectId, project));

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Con datos del proyecto se guarda 5 minutos (y se sirve el viejo mientras se renueva); si cayó
    // al respaldo genérico, solo 30 segundos para que un fallo pasajero de la API no se quede pegado.
    res.setHeader(
        'Cache-Control',
        project ? 'public, s-maxage=300, stale-while-revalidate=86400' : 'public, s-maxage=30'
    );
    res.status(200).send(output);
};
