import storage from './storage';

/**
 * Trae un proyecto completo de la API de Coders Academy y lo prepara para vm.loadProject().
 * No usa el mecanismo genérico storage.load(AssetType.Project, ...) porque nuestra API devuelve
 * el proyecto completo (título, thumbnail, lista de assets) en vez de solo el JSON crudo — mismo
 * criterio que save-project-to-server.js, que ya bypasea storage.store() para el tipo Project.
 * @param {string} projectId - id del proyecto a cargar.
 * @return {Promise<{projectJson: string, title: string}>} - el projectJson como string, listo
 *   para vm.loadProject(), junto con el título real guardado en el servidor.
 */
export default function fetchProjectFromServer (projectId) {
    const headers = storage.authToken ? {Authorization: `Bearer ${storage.authToken}`} : {};
    return fetch(`${storage.projectHost}/${projectId}`, {headers})
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
            // 31/08/2026 — bug real reportado en producción, y confirmado destructivo: este método
            // solo devolvía el projectJson y descartaba `project.title`. Como nada más en la cadena
            // (ProjectFetcherHOC → reducers) conocía el título real, el input de título quedaba en
            // lo que hubiera antes en Redux (típicamente "Proyecto sin título"), y esa etiqueta
            // volvía a mandarse al servidor en el siguiente guardado (project-saver-hoc.jsx usa
            // reduxProjectTitle como fallback), PISANDO el nombre real guardado — ej. "ATRAPA BITS"
            // pasaba a llamarse "Proyecto sin título" en la base con solo reabrir y guardar una vez.
            // Ver project-fetcher-hoc.jsx, que ahora despacha setProjectTitle con este valor.
            return {
                projectJson: JSON.stringify(project.projectJson),
                title: project.title
            };
        });
}
