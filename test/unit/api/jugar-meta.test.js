/* eslint-env jest */
import {
    DEFAULT_DESCRIPTION,
    DEFAULT_IMAGE,
    PROJECT_ID_PATTERN,
    buildImageUrl,
    buildMeta,
    cleanTitle,
    escapeHtml,
    injectMeta
} from '../../../api/_jugar-meta';

// 21/11/2026 — vista previa (og:) de /jugar/:id. Lo más importante: el título lo escribe el alumno,
// así que nada de lo que viene de la API puede entrar sin escapar al HTML de la página.
const THUMB = 'https://res.cloudinary.com/ded6mtfom/image/upload/v1795268799/scratch-projects/abc123/xyz.png';
const INDEX_HTML = '<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset="UTF-8">\n' +
    '    <title>Coders Academy — Crear</title>\n  </head>\n  <body></body>\n</html>';

describe('escapeHtml', () => {
    test('escapa los 5 caracteres que rompen HTML', () => {
        expect(escapeHtml('<a href="x" onclick=\'y\'>&</a>')).toBe(
            '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
        );
    });
});

describe('cleanTitle', () => {
    test('una sola línea y sin espacios de más', () => {
        expect(cleanTitle('  Mi   juego\n\ngenial ')).toBe('Mi juego genial');
    });

    test('recorta un título larguísimo con puntos suspensivos', () => {
        const clean = cleanTitle('a'.repeat(300));
        expect(clean.length).toBe(90);
        expect(clean.endsWith('…')).toBe(true);
    });

    test('lo que no es texto da vacío', () => {
        expect(cleanTitle(null)).toBe('');
        expect(cleanTitle(undefined)).toBe('');
        expect(cleanTitle({})).toBe('');
    });
});

describe('PROJECT_ID_PATTERN', () => {
    test('acepta un cuid y rechaza lo que podría alterar una URL', () => {
        expect(PROJECT_ID_PATTERN.test('cmwqgdl5h001a01swpbf6ikbv')).toBe(true);
        ['', '../etc', 'a/b', 'a?b=1', 'a b', 'a.b', 'x'.repeat(65)].forEach(id =>
            expect(PROJECT_ID_PATTERN.test(id)).toBe(false));
    });
});

describe('buildImageUrl', () => {
    test('la miniatura de Cloudinary pasa a 1200x630 JPEG sin recortar', () => {
        expect(buildImageUrl(THUMB)).toBe(
            'https://res.cloudinary.com/ded6mtfom/image/upload/' +
            'w_1200,h_630,c_pad,b_rgb:0f1629,f_jpg,q_auto/v1795268799/scratch-projects/abc123/xyz.png'
        );
    });

    test('sin miniatura, o con una URL que no es de Cloudinary, usa la imagen de la marca', () => {
        expect(buildImageUrl(null)).toBe(DEFAULT_IMAGE);
        expect(buildImageUrl('')).toBe(DEFAULT_IMAGE);
        expect(buildImageUrl('https://evil.example/x.png')).toBe(DEFAULT_IMAGE);
        expect(buildImageUrl('javascript:alert(1)')).toBe(DEFAULT_IMAGE);
    });
});

describe('buildMeta', () => {
    test('un proyecto real: su título, su miniatura y la descripción fija', () => {
        const {title, tags} = buildMeta('abc123', {title: 'FLAPPY BIRD F.G - Mobile', thumbnailUrl: THUMB});
        expect(title).toBe('FLAPPY BIRD F.G - Mobile — Coders Academy');
        expect(tags).toContain('<meta property="og:title" content="FLAPPY BIRD F.G - Mobile">');
        expect(tags).toContain(`<meta property="og:description" content="${DEFAULT_DESCRIPTION}">`);
        expect(tags).toContain('w_1200,h_630,c_pad');
        expect(tags).toContain('<meta property="og:url" content="https://crear.codersacademy.com.ar/jugar/abc123">');
        expect(tags).toContain('<meta name="twitter:card" content="summary_large_image">');
        expect(tags).toContain('<meta property="og:image:width" content="1200">');
    });

    test('no usa el nombre del alumno aunque llegue en los datos', () => {
        const {tags} = buildMeta('abc123', {title: 'Mi juego', thumbnailUrl: THUMB, authorFirstName: 'Sofía'});
        expect(tags).not.toContain('Sofía');
    });

    test('un título con HTML queda escapado en todas las etiquetas y en el <title>', () => {
        const evil = '"><script>alert(1)</script>';
        const meta = buildMeta('abc123', {title: evil, thumbnailUrl: THUMB});
        const html = injectMeta(INDEX_HTML, meta);
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('"><');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    test('sin proyecto (no existe, no está publicado o la API falló): etiquetas genéricas', () => {
        const {title, tags} = buildMeta('abc123', null);
        expect(title).toBe('Coders Academy — Crear');
        expect(tags).toContain('<meta property="og:title" content="Coders Academy — Crear">');
        expect(tags).toContain(`content="${DEFAULT_IMAGE}"`);
        expect(tags).not.toContain('og:url');
    });

    test('proyecto sin miniatura: imagen de la marca pero con su título', () => {
        const {tags} = buildMeta('abc123', {title: 'Sin foto', thumbnailUrl: null});
        expect(tags).toContain('<meta property="og:title" content="Sin foto">');
        expect(tags).toContain(`<meta property="og:image" content="${DEFAULT_IMAGE}">`);
    });

    test('un título vacío o de solo espacios cuenta como sin proyecto', () => {
        expect(buildMeta('abc123', {title: '   ', thumbnailUrl: THUMB}).title).toBe('Coders Academy — Crear');
    });
});

describe('injectMeta', () => {
    test('reemplaza el <title> y agrega las etiquetas antes de </head>', () => {
        const html = injectMeta(INDEX_HTML, buildMeta('abc123', {title: 'Mi juego', thumbnailUrl: THUMB}));
        expect(html).toContain('<title>Mi juego — Coders Academy</title>');
        expect(html).not.toContain('<title>Coders Academy — Crear</title>');
        expect(html.indexOf('og:title')).toBeLessThan(html.indexOf('</head>'));
        expect(html).toContain('<body></body>');
    });

    test('un título con $& o $1 no se interpreta como patrón de reemplazo', () => {
        const html = injectMeta(INDEX_HTML, buildMeta('abc123', {title: 'Precio $& $1 $$', thumbnailUrl: null}));
        expect(html).toContain('<title>Precio $&amp; $1 $$ — Coders Academy</title>');
    });
});
