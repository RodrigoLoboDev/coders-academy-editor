import storage from './storage';

/**
 * Trae un proyecto completo de la API de Coders Academy y lo prepara para vm.loadProject().
 * No usa el mecanismo genérico storage.load(AssetType.Project, ...) porque nuestra API devuelve
 * el proyecto completo (título, thumbnail, lista de assets) en vez de solo el JSON crudo — mismo
 * criterio que save-project-to-server.js, que ya bypasea storage.store() para el tipo Project.
 * @param {string} projectId - id del proyecto a cargar.
 * @return {Promise<string>} - el projectJson como string, listo para vm.loadProject().
 */
export default function fetchProjectFromServer (projectId) {
    return fetch(`${storage.projectHost}/${projectId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`No se pudo cargar el proyecto (${response.status})`);
            }
            return response.json();
        })
        .then(project => {
            // Mapa md5 -> url de Cloudinary, para que getAssetGetConfig resuelva costumes/sonidos
            // propios del proyecto sin necesitar un endpoint de "traer asset por id" aparte.
            const assetMap = new Map();
            (project.assets || []).forEach(asset => {
                assetMap.set(asset.md5, asset.cloudinaryUrl);
            });
            storage.setAssetMap(assetMap);
            return JSON.stringify(project.projectJson);
        });
}
