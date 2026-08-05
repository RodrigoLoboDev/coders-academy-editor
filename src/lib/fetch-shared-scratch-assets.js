import storage from './storage';

let cachedAssets = null;

/**
 * Trae la biblioteca institucional de Coders Academy (sprites/fondos/sonidos subidos desde
 * /admin/scratch-assets) y puebla storage.sharedAssetMap para que se puedan resolver por md5 al
 * agregarlos desde el selector. Se cachea en memoria — no cambia durante una sesión del editor, y
 * varios selectores (sprite/fondo/sonido) la piden por separado.
 * @return {Promise<Array>} lista cruda de SharedScratchAsset activos.
 */
export default function fetchSharedScratchAssets () {
    if (cachedAssets) return Promise.resolve(cachedAssets);
    return fetch(`${process.env.API_URL}/scratch-assets/shared`)
        .then(response => {
            if (!response.ok) throw new Error(`No se pudo cargar la biblioteca institucional (${response.status})`);
            return response.json();
        })
        .then(assets => {
            const map = new Map();
            assets.forEach(asset => map.set(asset.md5, asset.cloudinaryUrl));
            storage.setSharedAssetMap(map);
            cachedAssets = assets;
            return assets;
        })
        .catch(() => []);
}
