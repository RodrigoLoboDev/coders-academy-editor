/*
 * 21/11/2026 — lógica pura de la vista previa (etiquetas og:) de /jugar/:id. La usa api/jugar.js (la
 * función de Vercel) y la prueba test/unit/api/jugar-meta.test.js. El prefijo `_` es a propósito:
 * Vercel convierte en endpoint todo archivo de api/ salvo los que empiezan con guion bajo.
 *
 * Por qué existe: el sitio es una app que se arma en el navegador (un solo index.html para todas las
 * rutas), y los bots de WhatsApp o las redes no ejecutan JavaScript — sin esto todos los proyectos
 * se ven con el mismo título genérico y sin imagen.
 *
 * SEGURIDAD: el título lo escribe el alumno. TODO lo que viene de la API se escapa (escapeHtml)
 * antes de entrar al HTML; si no, un título con `"><script>` quedaría inyectado en la página de
 * cualquiera que abra el link. El nombre del alumno NO se usa acá a propósito (decisión de
 * Rodrigo del 21/11/2026): la vista previa se guarda en la caché de WhatsApp y de las redes.
 */

const SITE_URL = 'https://crear.codersacademy.com.ar';
const SITE_NAME = 'Coders Academy';
const DEFAULT_TITLE = 'Coders Academy — Crear';
const DEFAULT_DESCRIPTION =
    'Mirá este proyecto creado por un alumno de Coders Academy. ¡Jugalo desde el celular o la compu!';
// og-image de la landing (PNG 1200x630 con la marca): respaldo para proyectos sin miniatura.
const DEFAULT_IMAGE = 'https://www.codersacademy.com.ar/og-image';
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;
const MAX_TITLE_LENGTH = 90;

// cuid de Prisma: letras y números, nunca barras ni puntos (el id va a un fetch y a una URL).
const PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// Transformación de Cloudinary: 1200x630 con relleno azul oscuro (c_pad: no recorta el escenario),
// JPEG liviano (la miniatura original es un PNG de ~270 KB, al límite de lo que acepta WhatsApp).
const CLOUDINARY_TRANSFORM = `w_${IMAGE_WIDTH},h_${IMAGE_HEIGHT},c_pad,b_rgb:0f1629,f_jpg,q_auto`;
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/image\/upload\/)(v\d+\/.+)$/;

/**
 * Escapa un texto para usarlo dentro de un atributo o del contenido de una etiqueta HTML.
 * @param {*} value - lo que sea; se convierte a texto.
 * @return {string} el texto escapado.
 */
const escapeHtml = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Deja el título en una sola línea, sin espacios de más y con un largo razonable para una tarjeta.
 * @param {*} title - título del proyecto tal como llega de la API.
 * @return {string} título limpio (vacío si no hay uno usable).
 */
const cleanTitle = title => {
    if (typeof title !== 'string') return '';
    const oneLine = title.replace(/\s+/g, ' ').trim();
    return oneLine.length > MAX_TITLE_LENGTH ? `${oneLine.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…` : oneLine;
};

/**
 * URL de la imagen de la vista previa: la miniatura del proyecto pasada por Cloudinary a 1200x630.
 * Si el proyecto no tiene miniatura, o no es una URL de Cloudinary conocida, el respaldo de marca.
 * @param {*} thumbnailUrl - `thumbnailUrl` del proyecto.
 * @return {string} URL absoluta https.
 */
const buildImageUrl = thumbnailUrl => {
    const match = typeof thumbnailUrl === 'string' && CLOUDINARY_UPLOAD.exec(thumbnailUrl);
    return match ? `${match[1]}${CLOUDINARY_TRANSFORM}/${match[2]}` : DEFAULT_IMAGE;
};

/**
 * Arma las etiquetas del <head> para un proyecto (o las genéricas si no se pudo traer).
 * @param {string} projectId - id ya validado con PROJECT_ID_PATTERN (o '' si no era válido).
 * @param {?{title: string, thumbnailUrl: ?string}} project - datos de la API, o null.
 * @return {{title: string, tags: string}} el <title> de la pestaña y el HTML de las etiquetas.
 */
const buildMeta = (projectId, project) => {
    const projectTitle = project ? cleanTitle(project.title) : '';
    const shareTitle = projectTitle || DEFAULT_TITLE;
    const pageTitle = projectTitle ? `${projectTitle} — ${SITE_NAME}` : DEFAULT_TITLE;
    const image = buildImageUrl(project && projectTitle ? project.thumbnailUrl : null);
    const imageAlt = projectTitle ? `Captura del proyecto ${projectTitle}` : `${SITE_NAME} — Crear`;
    const url = project && projectTitle && PROJECT_ID_PATTERN.test(projectId) ?
        `${SITE_URL}/jugar/${projectId}` : null;

    const e = escapeHtml;
    const lines = [
        `<meta name="description" content="${e(DEFAULT_DESCRIPTION)}">`,
        '<meta property="og:type" content="website">',
        `<meta property="og:site_name" content="${e(SITE_NAME)}">`,
        '<meta property="og:locale" content="es_AR">',
        url ? `<meta property="og:url" content="${e(url)}">` : '',
        `<meta property="og:title" content="${e(shareTitle)}">`,
        `<meta property="og:description" content="${e(DEFAULT_DESCRIPTION)}">`,
        `<meta property="og:image" content="${e(image)}">`,
        `<meta property="og:image:width" content="${IMAGE_WIDTH}">`,
        `<meta property="og:image:height" content="${IMAGE_HEIGHT}">`,
        `<meta property="og:image:alt" content="${e(imageAlt)}">`,
        '<meta name="twitter:card" content="summary_large_image">',
        `<meta name="twitter:title" content="${e(shareTitle)}">`,
        `<meta name="twitter:description" content="${e(DEFAULT_DESCRIPTION)}">`,
        `<meta name="twitter:image" content="${e(image)}">`
    ];
    return {title: pageTitle, tags: lines.filter(Boolean).join('\n    ')};
};

/**
 * Inserta las etiquetas en el index.html de la app y reemplaza su <title>. Los reemplazos se hacen
 * con una función (no con un texto) para que un `$&` o `$1` en el título del alumno no se interprete.
 * @param {string} html - index.html construido por webpack.
 * @param {{title: string, tags: string}} meta - resultado de buildMeta.
 * @return {string} el HTML con la vista previa.
 */
const injectMeta = (html, meta) => html
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(meta.title)}</title>`)
    .replace('</head>', () => `    ${meta.tags}\n  </head>`);

module.exports = {
    DEFAULT_DESCRIPTION,
    DEFAULT_IMAGE,
    PROJECT_ID_PATTERN,
    SITE_URL,
    buildImageUrl,
    buildMeta,
    cleanTitle,
    escapeHtml,
    injectMeta
};
