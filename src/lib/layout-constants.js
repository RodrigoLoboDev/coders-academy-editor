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
    fullSizePaintMinWidth: 1250
};

export {
    BLOCKS_DEFAULT_SCALE,
    STAGE_DISPLAY_SCALES,
    STAGE_DISPLAY_SIZES,
    STAGE_SIZE_MODES
};
