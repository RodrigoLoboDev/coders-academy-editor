import {ScratchStorage} from 'scratch-storage';

import defaultProject from './default-project';

// scratch-storage intenta primero un Worker (FetchWorkerTool) para pedir assets, y recién si eso
// falla cae a fetch() normal (FetchTool) — ninguna de las dos clases está exportada públicamente
// desde el paquete, así que no se puede forzar el fallback importándolas. En nuestro entorno el
// worker nunca responde (ni resuelve ni rechaza, sin ningún request de red visible siquiera) y
// cuelga cualquier cosa que use el mecanismo genérico de assets para siempre — encontrado
// probando "agregar sprite de la biblioteca", que se quedaba sin hacer nada y sin error.
// Reemplazo mínimo con fetch() directo, mismo patrón que ya usan con éxito
// fetch-project-from-server.js/save-asset-to-server.js.
class SimpleFetchTool {
    get isGetSupported () {
        return true;
    }
    get (reqConfig) {
        const {url, ...options} = typeof reqConfig === 'string' ? {url: reqConfig} : reqConfig;
        return fetch(url, Object.assign({method: 'GET'}, options)).then(result => {
            if (result.ok) return result.arrayBuffer().then(b => new Uint8Array(b));
            if (result.status === 404) return null;
            return Promise.reject(result.status);
        });
    }
    get isSendSupported () {
        return true;
    }
    send (reqConfig) {
        const {url, withCredentials, ...options} = reqConfig;
        return fetch(url, Object.assign({credentials: withCredentials ? 'include' : 'omit'}, options)).then(response => {
            if (response.ok) return response.text();
            return Promise.reject(response.status);
        });
    }
}

/**
 * Wrapper for ScratchStorage which adds default web sources.
 * @todo make this more configurable
 */
class Storage extends ScratchStorage {
    constructor () {
        super();
        this.webHelper.assetTool = new SimpleFetchTool();
        this.webHelper.projectTool = new SimpleFetchTool();
        this.cacheDefaultProject();
        // md5 -> url de Cloudinary, poblado por fetch-project-from-server.js antes de que vm
        // resuelva los costumes/sonidos de un proyecto cargado. Ver getAssetGetConfig más abajo.
        this.assetMap = new Map();
        // md5 -> url de Cloudinary de los assets institucionales compartidos (Fase 3), poblado una
        // sola vez al levantar el editor (fetch-shared-scratch-assets.js) — independiente del
        // proyecto que esté abierto, a diferencia de assetMap de arriba.
        this.sharedAssetMap = new Map();
    }
    setAssetMap (map) {
        this.assetMap = map;
    }
    setSharedAssetMap (map) {
        this.sharedAssetMap = map;
    }
    addOfficialScratchWebStores () {
        this.addWebStore(
            [this.AssetType.Project],
            this.getProjectGetConfig.bind(this),
            this.getProjectCreateConfig.bind(this),
            this.getProjectUpdateConfig.bind(this)
        );
        this.addWebStore(
            [this.AssetType.ImageVector, this.AssetType.ImageBitmap, this.AssetType.Sound],
            this.getAssetGetConfig.bind(this),
            // We set both the create and update configs to the same method because
            // storage assumes it should update if there is an assetId, but the
            // asset store uses the assetId as part of the create URI.
            this.getAssetCreateConfig.bind(this),
            this.getAssetCreateConfig.bind(this)
        );
        this.addWebStore(
            [this.AssetType.Sound],
            asset => `static/extension-assets/scratch3_music/${asset.assetId}.${asset.dataFormat}`
        );
    }
    setProjectHost (projectHost) {
        this.projectHost = projectHost;
    }
    setProjectToken (projectToken) {
        this.projectToken = projectToken;
    }
    getProjectGetConfig (projectAsset) {
        const path = `${this.projectHost}/${projectAsset.assetId}`;
        const qs = this.projectToken ? `?token=${this.projectToken}` : '';
        return path + qs;
    }
    getProjectCreateConfig () {
        return {
            url: `${this.projectHost}/`,
            withCredentials: true
        };
    }
    getProjectUpdateConfig (projectAsset) {
        return {
            url: `${this.projectHost}/${projectAsset.assetId}`,
            withCredentials: true
        };
    }
    setAssetHost (assetHost) {
        this.assetHost = assetHost;
    }
    getAssetGetConfig (asset) {
        // Primero, assets propios del proyecto actual (dibujos/sonidos que subió el alumno) —
        // resuelve por md5 contra el mapa que dejó fetch-project-from-server.js. Nuestra API no
        // tiene (ni necesita) un endpoint "traer asset por id", esos se sirven directo desde
        // Cloudinary.
        const ownUrl = this.assetMap.get(asset.assetId);
        if (ownUrl) return ownUrl;
        // Segundo, biblioteca institucional compartida de Coders Academy (Fase 3) — sprites/
        // fondos/sonidos propios subidos desde /admin/scratch-assets, resueltos igual por md5.
        const sharedUrl = this.sharedAssetMap.get(asset.assetId);
        if (sharedUrl) return sharedUrl;
        // Si no es nuestro, es de la biblioteca integrada de sprites/disfraces/sonidos — el
        // scratch-gui original NUNCA la bundlea localmente, siempre la pide en vivo a los
        // servidores de Scratch (esto ya pasaba antes de todos nuestros cambios, no es algo nuevo
        // que agregamos). Bug encontrado probando: al apuntar todo el storage a nuestra propia
        // API, este fallback se rompió sin querer y agregar un sprite de la biblioteca dejaba de
        // funcionar en silencio.
        return `https://assets.scratch.mit.edu/internalapi/asset/${asset.assetId}.${asset.dataFormat}/get/`;
    }
    getAssetCreateConfig (asset) {
        return {
            // There is no such thing as updating assets, but storage assumes it
            // should update if there is an assetId, and the asset store uses the
            // assetId as part of the create URI. So, force the method to POST.
            // Then when storage finds this config to use for the "update", still POSTs
            method: 'post',
            url: `${this.assetHost}/${asset.assetId}.${asset.dataFormat}`,
            withCredentials: true
        };
    }
    setTranslatorFunction (translator) {
        this.translator = translator;
        this.cacheDefaultProject();
    }
    cacheDefaultProject () {
        const defaultProjectAssets = defaultProject(this.translator);
        defaultProjectAssets.forEach(asset => this.builtinHelper._store(
            this.AssetType[asset.assetType],
            this.DataFormat[asset.dataFormat],
            asset.data,
            asset.id
        ));
    }
}

const storage = new Storage();

export default storage;
