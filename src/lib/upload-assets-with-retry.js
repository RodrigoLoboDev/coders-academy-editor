/*
 * 01/09/2026 — bug real reportado en producción y reproducido en vivo: guardar un proyecto con
 * varios sonidos/disfraces nuevos (ej. recién cargado desde un .sb3) a veces fallaba con
 * "No se ha podido crear/guardar el proyecto" — el proyecto SÍ se creaba del lado de la API, pero
 * uno de los assets fallaba al subir con un 500. Confirmado interceptando los fetch reales: de 8
 * sonidos subidos en paralelo (project-saver-hoc.jsx los manda todos juntos con Promise.all), 2
 * volvían "500 Internal server error" — la API de Coders Academy sube audio a Cloudinary bajo
 * `resource_type: 'video'`, que en la mayoría de los planes de Cloudinary tiene un límite de
 * subidas concurrentes más bajo que el de imágenes; mandar 6-8 sonidos al mismo tiempo lo supera.
 * No es nada que se pueda arreglar del lado del editor (el límite es de la cuenta de Cloudinary),
 * pero SÍ se puede evitar disparar esa cantidad de requests simultáneos y, si uno falla de forma
 * transitoria, reintentarlo antes de tirar todo el guardado abajo.
 */

/**
 * Espera `ms` milisegundos.
 * @param {number} ms - milisegundos a esperar.
 * @return {Promise<void>} resuelve pasado ese tiempo.
 */
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sube un único asset, reintentando hasta `retries` veces extra con backoff lineal si falla.
 * @param {*} asset - el asset a subir (se le pasa tal cual a `uploadOne`).
 * @param {function(*): Promise} uploadOne - sube un único asset; debe rechazar si falla.
 * @param {number} retries - reintentos adicionales (además del primer intento).
 * @param {number} retryDelayMs - demora base entre reintentos (crece linealmente).
 * @return {Promise<void>} resuelve si el asset terminó subiendo bien, o rechaza tras agotar los
 *   reintentos.
 */
const uploadOneWithRetry = (asset, uploadOne, retries, retryDelayMs) => {
    const attempt = attemptNumber =>
        uploadOne(asset).catch(err => {
            if (attemptNumber >= retries) throw err;
            return wait(retryDelayMs * (attemptNumber + 1)).then(() => attempt(attemptNumber + 1));
        });
    return attempt(0);
};

/**
 * Sube una lista de assets contra `uploadOne(asset)` con como máximo `concurrency` requests en
 * vuelo a la vez (un pool de "workers" que van tomando de una cola en común, no lotes fijos — así
 * un asset que tarda más no bloquea a los demás), reintentando cada uno hasta `retries` veces
 * extra con backoff antes de darse por vencido. Si el asset sigue fallando después de todos los
 * reintentos, el error se propaga tal cual (mismo comportamiento de antes: el guardado completo se
 * considera fallido y el alumno ve el aviso de siempre).
 * @param {Array} assets - lista de assets de scratch-vm/scratch-storage a subir.
 * @param {function(*): Promise} uploadOne - sube un único asset; debe rechazar si falla.
 * @param {object} [options] - opciones de subida.
 * @param {number} [options.concurrency=3] - máximo de subidas en vuelo al mismo tiempo.
 * @param {number} [options.retries=2] - reintentos adicionales por asset (además del primer intento).
 * @param {number} [options.retryDelayMs=400] - demora base entre reintentos (crece linealmente).
 * @return {Promise<void>} resuelve cuando todos los assets subieron bien, o rechaza con el primer
 *   error que agotó sus reintentos.
 */
const uploadAssetsWithRetry = (assets, uploadOne, {
    concurrency = 3,
    retries = 2,
    retryDelayMs = 400
} = {}) => {
    const queue = assets.slice();
    const workerCount = Math.max(1, Math.min(concurrency, queue.length));
    const runWorker = () => {
        const next = queue.shift();
        if (!next) return Promise.resolve();
        return uploadOneWithRetry(next, uploadOne, retries, retryDelayMs).then(runWorker);
    };
    const workers = [];
    for (let i = 0; i < workerCount; i++) {
        workers.push(runWorker());
    }
    return Promise.all(workers);
};

export default uploadAssetsWithRetry;
