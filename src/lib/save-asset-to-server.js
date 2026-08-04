import storage from './storage';

const ASSET_TYPE_NAMES = {
    ImageBitmap: 'costume',
    ImageVector: 'costume',
    Sound: 'sound'
};

/**
 * Sube un asset (costume/sound) nuevo/modificado a la API de Coders Academy.
 * No usa storage.store() — nuestra ruta necesita el projectId en el path (recién se conoce
 * después de guardar el proyecto, ver el reorden en project-saver-hoc.jsx) y scratch-vm manda el
 * binario crudo en el body del POST, no un formulario multipart.
 * @param {string} projectId - id del proyecto ya guardado (nunca null/undefined acá).
 * @param {object} asset - el Asset de scratch-storage a subir (assetType, dataFormat, data).
 * @return {Promise} resuelve cuando el asset quedó guardado.
 */
export default function saveAssetToServer (projectId, asset) {
    const assetType = ASSET_TYPE_NAMES[asset.assetType.name] || 'costume';
    const url = `${storage.assetHost}/${projectId}/assets/${assetType}`;
    return fetch(url, {
        method: 'post',
        headers: {'Content-Type': asset.assetType.contentType},
        body: asset.data
    }).then(response => {
        if (!response.ok) {
            throw new Error(`No se pudo subir el asset (${response.status})`);
        }
        return response.json();
    });
}
