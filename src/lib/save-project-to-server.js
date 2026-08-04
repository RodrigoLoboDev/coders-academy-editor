import storage from '../lib/storage';

/**
 * Guarda el JSON del proyecto contra la API de Coders Academy en vez del servidor de scratch-www
 * (para el que estaba pensado este archivo originalmente — de ahí el nombre y la firma, que se
 * mantienen para no tocar project-saver-hoc.jsx más de lo necesario).
 * @param {?string} projectId - id del proyecto, null/undefined si es nuevo (dispara un POST).
 * @param {string} vmState - el JSON del proyecto (vm.toJSON()), como string.
 * @param {object} params - parámetros del pedido.
 * @property {?string} params.title - título del proyecto.
 * @return {Promise<object>} el proyecto guardado (incluye `id`).
 */
export default function saveProjectToServer (projectId, vmState, params) {
    const creatingProject = projectId === null || typeof projectId === 'undefined';
    const projectJson = JSON.parse(vmState);
    const body = creatingProject ?
        {title: (params && params.title) || 'Proyecto sin título', projectJson} :
        {title: params && params.title, projectJson};

    const url = creatingProject ?
        `${storage.projectHost}/` :
        `${storage.projectHost}/${projectId}`;

    return fetch(url, {
        method: creatingProject ? 'post' : 'patch',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    }).then(response => {
        if (!response.ok) {
            return Promise.reject(response.status);
        }
        return response.json();
    });
}
