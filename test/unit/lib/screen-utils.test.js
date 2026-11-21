/* eslint-env jest */
import {getPlayerLayout, getPlayerStageSize, getStageDimensions} from '../../../src/lib/screen-utils';
import {STAGE_DISPLAY_SIZES} from '../../../src/lib/layout-constants';

// 21/11/2026 — vista pública /jugar/:id. Tamaños reales de pantallas (ancho x alto de la ventana).
const IPHONE_SE_PORTRAIT = [375, 667];
const IPHONE_PORTRAIT = [390, 844];
const ANDROID_PORTRAIT = [360, 640];
const IPHONE_LANDSCAPE = [844, 390];
const IPHONE_SE_LANDSCAPE = [667, 375];
const ANDROID_LANDSCAPE = [740, 360];
const TABLET_PORTRAIT = [768, 1024];
const TABLET_LANDSCAPE = [1024, 768];
const NETBOOK = [1366, 768];
const SMALL_NETBOOK = [1024, 600];

describe('getPlayerLayout', () => {
    test('vertical: stack', () => {
        [IPHONE_SE_PORTRAIT, IPHONE_PORTRAIT, ANDROID_PORTRAIT, TABLET_PORTRAIT].forEach(([w, h]) =>
            expect(getPlayerLayout(w, h)).toBe('stack'));
    });

    test('celular en horizontal: side', () => {
        [IPHONE_LANDSCAPE, IPHONE_SE_LANDSCAPE, ANDROID_LANDSCAPE].forEach(([w, h]) =>
            expect(getPlayerLayout(w, h)).toBe('side'));
    });

    test('notebook y tablet en horizontal: desktop', () => {
        [TABLET_LANDSCAPE, NETBOOK, SMALL_NETBOOK].forEach(([w, h]) =>
            expect(getPlayerLayout(w, h)).toBe('desktop'));
    });

    test('ventana cuadrada cuenta como vertical', () => {
        expect(getPlayerLayout(600, 600)).toBe('stack');
    });
});

describe('getPlayerStageSize', () => {
    const all = [
        IPHONE_SE_PORTRAIT, IPHONE_PORTRAIT, ANDROID_PORTRAIT, IPHONE_LANDSCAPE, IPHONE_SE_LANDSCAPE,
        ANDROID_LANDSCAPE, TABLET_PORTRAIT, TABLET_LANDSCAPE, NETBOOK, SMALL_NETBOOK
    ];

    test('siempre 4:3 y nunca más ancho ni más alto que la ventana', () => {
        all.forEach(([w, h]) => {
            const size = getPlayerStageSize(w, h);
            expect(size.width / size.height).toBeCloseTo(4 / 3, 5);
            expect(size.width).toBeLessThanOrEqual(w);
            expect(size.height).toBeLessThanOrEqual(h);
        });
    });

    test('vertical: el escenario ocupa el ancho (menos el aire) y deja lugar a controles y tarjeta', () => {
        const [w, h] = IPHONE_PORTRAIT;
        const size = getPlayerStageSize(w, h);
        expect(size.width).toBe(w - 18);
        // lo que queda debajo del escenario alcanza para barra del logo + controles + tarjeta
        expect(h - size.height).toBeGreaterThanOrEqual(44 + 64 + 160);
    });

    test('vertical con poco alto: se achica en vez de desbordar', () => {
        const size = getPlayerStageSize(360, 400);
        expect(size.width).toBeLessThan(360 - 18);
        expect(size.height).toBeGreaterThan(0);
    });

    test('celular horizontal: el escenario usa todo el alto y deja lugar a la columna lateral', () => {
        const [w, h] = IPHONE_LANDSCAPE;
        const size = getPlayerStageSize(w, h);
        expect(size.height).toBe(h - 18);
        expect(w - size.width).toBeGreaterThanOrEqual(208 + 64);
    });

    test('celular horizontal angosto: la columna lateral manda y el escenario se achica', () => {
        const [w, h] = IPHONE_SE_LANDSCAPE;
        const size = getPlayerStageSize(w, h);
        expect(w - size.width).toBeGreaterThanOrEqual(208 + 64);
        expect(size.height).toBeLessThan(h - 18);
    });

    test('desktop: aprovecha el alto debajo de la barra y de los controles', () => {
        const [w, h] = NETBOOK;
        const size = getPlayerStageSize(w, h);
        expect(size.height).toBe(h - 64 - 64 - 36);
    });
});

describe('getStageDimensions con playerLarge', () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    afterEach(() => {
        window.innerWidth = originalWidth;
        window.innerHeight = originalHeight;
    });

    test('lee el tamaño de la ventana y redondea', () => {
        [window.innerWidth, window.innerHeight] = IPHONE_PORTRAIT;
        const dims = getStageDimensions(STAGE_DISPLAY_SIZES.playerLarge, false);
        expect(dims.width).toBe(372);
        expect(dims.height).toBe(Math.round(372 * 0.75));
        expect(dims.scale).toBeCloseTo(372 / 480, 5);
    });

    test('el editor normal no cambia: large sigue siendo 480x360', () => {
        const dims = getStageDimensions(STAGE_DISPLAY_SIZES.large, false);
        expect(dims.width).toBe(480);
        expect(dims.height).toBe(360);
    });
});
