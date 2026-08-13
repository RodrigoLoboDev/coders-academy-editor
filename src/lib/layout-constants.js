import keyMirror from 'keymirror';

/**
 * Names for each state of the stage size toggle
 * @enum {string}
 */
const STAGE_SIZE_MODES = keyMirror({
    /**
     * The "large stage" button is pressed; the user would like a large stage.
     */
    large: null,

    /**
     * The "small stage" button is pressed; the user would like a small stage.
     */
    small: null
});

/**
 * Names for each stage render size
 * @enum {string}
 */
const STAGE_DISPLAY_SIZES = keyMirror({
    /**
     * Large stage with wide browser
     */
    large: null,

    /**
     * Large stage with narrow browser
     */
    largeConstrained: null,

    /**
     * Small stage (ignores browser width)
     */
    small: null
});

// zoom level to start with
// Sesión 34 — mismo factor ×1.308 (+30.8%) que el resto de esta ronda (0.65rem→0.85rem de la
// letra de categorías), aplicado acá para que los bloques (en la paleta y en el workspace) crezcan
// en la misma proporción que todo lo demás. Antes se había probado subir esto sin un criterio
// concreto y se revirtió — esta vez sí hay una proporción documentada detrás.
const BLOCKS_DEFAULT_SCALE = 0.88;

const STAGE_DISPLAY_SCALES = {};
STAGE_DISPLAY_SCALES[STAGE_DISPLAY_SIZES.large] = 1; // large mode, wide browser (standard)
STAGE_DISPLAY_SCALES[STAGE_DISPLAY_SIZES.largeConstrained] = 0.85; // large mode but narrow browser
STAGE_DISPLAY_SCALES[STAGE_DISPLAY_SIZES.small] = 0.5; // small mode, regardless of browser size

export default {
    standardStageWidth: 480,
    standardStageHeight: 360,
    fullSizeMinWidth: 1096,
    fullSizePaintMinWidth: 1250,

    // 12/08/2026 — scratch-gui original solo decide el tamaño del stage mirando el ANCHO de
    // ventana (fullSizeMinWidth de arriba). En una netbook de pantalla chica (11", ej. las del
    // aula) el ancho puede sobrar pero el ALTO no: el stage se queda fijo en 360px (o 306px en
    // modo "constrained") y como la lista de sprites vive debajo en la misma columna flex, le
    // queda casi sin alto — apenas se le ven las cabezas. Estos dos umbrales agregan el alto a
    // la cuenta (ver resolveStageSize en screen-utils.js y su uso en gui.jsx):
    //   - por debajo de fullSizeMinHeight: nunca usar el stage "large" (360px), cae a
    //     "largeConstrained" (306px) aunque el ancho alcance.
    //   - por debajo de constrainedMinHeight: ni siquiera "largeConstrained" deja lugar
    //     razonable para la lista de sprites — se achica automáticamente a "small" (180px),
    //     sin que el docente/alumno tenga que tocar el botón manual de tamaño de stage.
    fullSizeMinHeight: 720,
    constrainedMinHeight: 560
};

export {
    BLOCKS_DEFAULT_SCALE,
    STAGE_DISPLAY_SCALES,
    STAGE_DISPLAY_SIZES,
    STAGE_SIZE_MODES
};
