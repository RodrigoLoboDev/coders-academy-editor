import storage from './storage';

/**
 * Sube el thumbnail (snapshot del escenario) de un proyecto ya guardado.
 * @param {string} projectId - id del proyecto ya guardado.
 * @param {Blob} blob - PNG del snapshot (ver dataURItoBlob en project-saver-hoc.jsx).
 * @return {Promise} resuelve cuando el thumbnail quedó guardado.
 */
export default function saveThumbnailToServer (projectId, blob) {
    const url = `${storage.projectHost}/${projectId}/thumbnail`;
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'image/png',
            ...(storage.authToken && {Authorization: `Bearer ${storage.authToken}`})
        },
        body: blob
    }).then(response => {
        if (!response.ok) {
            throw new Error(`No se pudo subir el thumbnail (${response.status})`);
        }
        return response.json();
    });
}
