const SET_FULL_SCREEN = 'scratch-gui/mode/SET_FULL_SCREEN';
const SET_PLAYER = 'scratch-gui/mode/SET_PLAYER';
const SET_PLAYER_VIEWPORT = 'scratch-gui/mode/SET_PLAYER_VIEWPORT';

const initialState = {
    showBranding: false,
    isFullScreen: false,
    isPlayerOnly: false,
    hasEverEnteredEditor: true,
    // 21/11/2026 — "ANCHOxALTO" de la ventana en la vista pública /jugar/:id (ver
    // player-viewport-watcher.jsx). Solo sirve para que el Stage se vuelva a dibujar al girar el
    // celular o cambiar el tamaño de la ventana: el tamaño real lo lee getStageDimensions de window.
    playerViewport: ''
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_FULL_SCREEN:
        return Object.assign({}, state, {
            isFullScreen: action.isFullScreen
        });
    case SET_PLAYER:
        return Object.assign({}, state, {
            isPlayerOnly: action.isPlayerOnly,
            hasEverEnteredEditor: state.hasEverEnteredEditor || !action.isPlayerOnly
        });
    case SET_PLAYER_VIEWPORT:
        return Object.assign({}, state, {
            playerViewport: action.playerViewport
        });
    default:
        return state;
    }
};

const setFullScreen = function (isFullScreen) {
    return {
        type: SET_FULL_SCREEN,
        isFullScreen: isFullScreen
    };
};
const setPlayer = function (isPlayerOnly) {
    return {
        type: SET_PLAYER,
        isPlayerOnly: isPlayerOnly
    };
};

const setPlayerViewport = function (playerViewport) {
    return {
        type: SET_PLAYER_VIEWPORT,
        playerViewport: playerViewport
    };
};

export {
    reducer as default,
    initialState as modeInitialState,
    setFullScreen,
    setPlayer,
    setPlayerViewport
};
