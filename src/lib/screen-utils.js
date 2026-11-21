import layout, {STAGE_DISPLAY_SCALES, STAGE_SIZE_MODES, STAGE_DISPLAY_SIZES} from '../lib/layout-constants';

/**
 * @typedef {object} StageDimensions
 * @property {int} height - the height to be used for the stage in the current situation.
 * @property {int} width - the width to be used for the stage in the current situation.
 * @property {number} scale - the scale factor from the stage's default size to its current size.
 * @property {int} heightDefault - the height of the stage in its default (large) size.
 * @property {int} widthDefault - the width of the stage in its default (large) size.
 */

const STAGE_DIMENSION_DEFAULTS = {
    // referencing css/units.css,
    // spacingBorderAdjustment = 2 * $full-screen-top-bottom-margin +
    //   2 * $full-screen-border-width
    fullScreenSpacingBorderAdjustment: 12,
    // referencing css/units.css,
    // menuHeightAdjustment = $stage-menu-height
    menuHeightAdjustment: 44,
    // 21/11/2026 — vista pública /jugar/:id (STAGE_DISPLAY_SIZES.playerLarge, ver layout-constants.js
    // y getPlayerLayout más abajo). Espacio que public-player.css reserva alrededor del escenario en
    // cada disposición; mantener en sync con ese archivo y con stage-header.css (.player-controls*).
    playerMargin: 16, // aire alrededor del escenario (el borde de 1px del stage queda dentro)
    playerControlsSize: 64, // fila (o columna) de bandera verde + stop: 3rem de botón + 8px de aire por lado
    playerStackHeaderHeight: 44, // vertical: barra del logo
    playerStackInfoHeight: 160, // vertical: tarjeta con título, alumno y compartir
    playerDesktopBarHeight: 64, // escritorio: barra de arriba con logo, título, alumno y compartir
    playerSidePanelWidth: 208, // celular horizontal: columna con logo, título, alumno y compartir
    // Un celular horizontal mide como mucho ~430px de alto; una tablet o notebook, bastante más.
    playerSideMaxHeight: 500
};

/**
 * Resolve the current GUI and browser state to an actual stage size enum value.
 * @param {STAGE_SIZE_MODES} stageSizeMode - the state of the stage size toggle button.
 * @param {boolean} isFullSize - true if the window is large enough (width AND height) for the
 *   large stage at its full size.
 * @param {boolean} hasEnoughHeight - true if the window is tall enough for even the constrained
 *   stage to leave room for the sprite pane below it. Defaults to true so existing call sites
 *   that don't pass it (e.g. tests) keep the old width-only behavior.
 * @return {STAGE_DISPLAY_SIZES} - the stage size enum value we should use in this situation.
 */
const resolveStageSize = (stageSizeMode, isFullSize, hasEnoughHeight = true) => {
    if (stageSizeMode === STAGE_SIZE_MODES.small) {
        return STAGE_DISPLAY_SIZES.small;
    }
    // 12/08/2026 — pantalla muy baja (ej. netbooks de 11" del aula): ni el stage "constrained"
    // deja lugar razonable para la lista de sprites debajo. Se achica solo, sin que haga falta
    // tocar el toggle manual de tamaño de stage (ese sigue funcionando igual, ver el check de
    // stageSizeMode arriba).
    if (!hasEnoughHeight) {
        return STAGE_DISPLAY_SIZES.small;
    }
    if (isFullSize) {
        return STAGE_DISPLAY_SIZES.large;
    }
    return STAGE_DISPLAY_SIZES.largeConstrained;
};

/**
 * Disposición de la vista pública /jugar/:id según el tamaño de la ventana (21/11/2026):
 * - 'stack': ventana más alta que ancha (celular o tablet en vertical): escenario de punta a punta,
 *   y debajo los controles y la tarjeta con el título, el alumno y compartir. El escenario es 4:3,
 *   así que acá manda el ANCHO y lo que sobra queda arriba y abajo.
 * - 'side': ventana apaisada y baja (celular en horizontal): el escenario ocupa todo el alto y las
 *   bandas de los costados llevan los controles y el título/alumno/compartir.
 * - 'desktop': ventana apaisada y alta (notebook, tablet en horizontal): barra de arriba con todo
 *   el texto y escenario grande debajo.
 * Usada tanto por getPlayerStageSize (abajo) como por public-player.jsx (clase de la disposición).
 * @param {number} width - ancho de la ventana (window.innerWidth).
 * @param {number} height - alto de la ventana (window.innerHeight).
 * @return {string} 'stack' | 'side' | 'desktop'
 */
const getPlayerLayout = (width, height) => {
    if (width <= height) return 'stack';
    if (height <= STAGE_DIMENSION_DEFAULTS.playerSideMaxHeight) return 'side';
    return 'desktop';
};

/**
 * Tamaño del escenario en la vista pública /jugar/:id para una ventana dada (siempre 4:3). Función
 * pura, separada de getStageDimensions para poder probarla con tamaños de celulares reales.
 * @param {number} width - ancho de la ventana.
 * @param {number} height - alto de la ventana.
 * @return {{width: number, height: number}} - tamaño sin redondear.
 */
const getPlayerStageSize = (width, height) => {
    const d = STAGE_DIMENSION_DEFAULTS;
    const layout = getPlayerLayout(width, height);
    let stageWidth;
    let stageHeight;

    if (layout === 'stack') {
        stageWidth = width - d.playerMargin;
        stageHeight = stageWidth * 0.75;
        const maxHeight = height - d.playerStackHeaderHeight - d.playerControlsSize - d.playerStackInfoHeight;
        // Con muy poco alto disponible se achica (con un piso, para no llegar a 0), nunca desborda a lo ancho.
        if (stageHeight > maxHeight) stageHeight = Math.max(maxHeight, 90);
        stageWidth = stageHeight + (stageHeight / 3);
    } else if (layout === 'side') {
        stageHeight = height - d.playerMargin;
        stageWidth = stageHeight + (stageHeight / 3);
        const maxWidth = width - d.playerSidePanelWidth - d.playerControlsSize - d.playerMargin;
        if (stageWidth > maxWidth) {
            stageWidth = maxWidth;
            stageHeight = stageWidth * 0.75;
        }
    } else {
        stageHeight = height - d.playerDesktopBarHeight - d.playerControlsSize - (2 * d.playerMargin);
        stageWidth = stageHeight + (stageHeight / 3);
        if (stageWidth > width - (2 * d.playerMargin)) {
            stageWidth = width - (2 * d.playerMargin);
            stageHeight = stageWidth * 0.75;
        }
    }

    return {width: stageWidth, height: stageHeight};
};

/**
 * Retrieve info used to determine the actual stage size based on the current GUI and browser state.
 * @param {STAGE_DISPLAY_SIZES} stageSize - the current fully-resolved stage size.
 * @param {boolean} isFullScreen - true if full-screen mode is enabled.
 * @return {StageDimensions} - an object describing the dimensions of the stage.
 */
const getStageDimensions = (stageSize, isFullScreen) => {
    const stageDimensions = {
        heightDefault: layout.standardStageHeight,
        widthDefault: layout.standardStageWidth,
        height: 0,
        width: 0,
        scale: 0
    };

    if (isFullScreen) {
        stageDimensions.height = window.innerHeight -
            STAGE_DIMENSION_DEFAULTS.menuHeightAdjustment -
            STAGE_DIMENSION_DEFAULTS.fullScreenSpacingBorderAdjustment;

        stageDimensions.width = stageDimensions.height + (stageDimensions.height / 3);

        if (stageDimensions.width > window.innerWidth) {
            stageDimensions.width = window.innerWidth;
            stageDimensions.height = stageDimensions.width * .75;
        }

        stageDimensions.scale = stageDimensions.width / stageDimensions.widthDefault;
    } else if (stageSize === STAGE_DISPLAY_SIZES.playerLarge) {
        // Vista pública /jugar/:id: el tamaño depende de la disposición (ver getPlayerLayout). Sin
        // piso de 480x360: achicar de más en una ventana muy baja es preferible a desbordar la
        // pantalla (con el piso, un celular angosto en vertical quedaba desbordado y descentrado).
        const playerSize = getPlayerStageSize(window.innerWidth, window.innerHeight);
        stageDimensions.width = playerSize.width;
        stageDimensions.height = playerSize.height;
        stageDimensions.scale = stageDimensions.width / stageDimensions.widthDefault;
    } else {
        stageDimensions.scale = STAGE_DISPLAY_SCALES[stageSize];
        stageDimensions.height = stageDimensions.scale * stageDimensions.heightDefault;
        stageDimensions.width = stageDimensions.scale * stageDimensions.widthDefault;
    }

    // Round off dimensions to prevent resampling/blurriness
    stageDimensions.height = Math.round(stageDimensions.height);
    stageDimensions.width = Math.round(stageDimensions.width);

    return stageDimensions;
};

/**
 * Take a pair of sizes for the stage (a target height and width and a default height and width),
 * calculate the ratio between them, and return a CSS transform to scale to that ratio.
 * @param {object} sizeInfo An object containing dimensions of the target and default stage sizes.
 * @param {number} sizeInfo.width The target width
 * @param {number} sizeInfo.height The target height
 * @param {number} sizeInfo.widthDefault The default width
 * @param {number} sizeInfo.heightDefault The default height
 * @returns {object} the CSS transform
 */
const stageSizeToTransform = ({width, height, widthDefault, heightDefault}) => {
    const scaleX = width / widthDefault;
    const scaleY = height / heightDefault;
    if (scaleX === 1 && scaleY === 1) {
        // Do not set a transform if the scale is 1 because
        // it messes up `position: fixed` elements like the context menu.
        return;
    }
    return {transform: `scale(${scaleX},${scaleY})`};
};

export {
    getPlayerLayout,
    getPlayerStageSize,
    getStageDimensions,
    resolveStageSize,
    stageSizeToTransform
};
