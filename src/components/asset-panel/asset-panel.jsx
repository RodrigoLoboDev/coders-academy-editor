import React from 'react';

import Box from '../box/box.jsx';
import Selector from './selector.jsx';
import styles from './asset-panel.css';

// Sesión 34 — botones de scratch-paint (Copiar/Pegar/Eliminar, Voltear horizontal/vertical,
// Curvado/Punteado, Mapa de bits/Vector, Deshacer/Rehacer, Agrupar/Desagrupar, adelante/atrás...)
// traen el violeta original de Scratch (#855CD6) pintado adentro del propio archivo .svg, servido
// como data-uri en el `src` de un <img> — a diferencia de los colores de fondo/borde ya resueltos
// en asset-panel.css (clases CSS reales), acá no hay ninguna clase a la que apuntar, es la imagen
// en sí. Como varios de estos íconos combinan el violeta con gris/blanco (ej. copy.svg, paste.svg,
// flip-horizontal.svg) un filtro CSS (hue-rotate) tironea también esos otros colores y los deja
// con un tinte raro — se probó y no queda bien. En cambio, el string del SVG está ahí mismo en el
// `src`, así que se puede reemplazar el hex de forma exacta (texto, no filtro): el violeta queda
// ámbar de marca y el resto de los colores del ícono (gris de las líneas punteadas, blanco del
// symbol) no se tocan.
// Primer intento (revertido acá) buscaba el hex directo en el `src`. Eso fallaba en silencio: el
// `src` real que sirve scratch-paint es `data:image/svg+xml;base64,...` — el XML entero pasa por
// base64, así que el texto "855CD6" nunca aparece literal ahí, hay que decodificar primero
// (atob), reemplazar sobre el XML ya en texto plano, y volver a codificar (btoa). Se deja también
// el chequeo directo sin decodificar por si algún ícono llegara sin base64 (`data:image/svg+xml,`
// a secas, URL-encodeado) — no hace daño, simplemente no encuentra nada y no toca el string.
// MutationObserver porque React vuelve a insertar el <img> original (violeta) cada vez que cambia
// de herramienta — no alcanza con corregirlo una sola vez al montar.
const SCRATCH_PAINT_VIOLET_HEX = '855CD6';
const BRAND_AMBER_HEX = 'FFB02E';
const SVG_BASE64_PREFIX = 'data:image/svg+xml;base64,';

const recolorHex = text => text.replace(new RegExp(SCRATCH_PAINT_VIOLET_HEX, 'gi'), BRAND_AMBER_HEX);
const containsVioletHex = text => text.toUpperCase().indexOf(SCRATCH_PAINT_VIOLET_HEX) !== -1;

const recolorSrc = src => {
    if (src.toLowerCase().startsWith(SVG_BASE64_PREFIX)) {
        const decodedSvg = atob(src.slice(SVG_BASE64_PREFIX.length));
        if (!containsVioletHex(decodedSvg)) return null;
        return SVG_BASE64_PREFIX + btoa(recolorHex(decodedSvg));
    }
    if (!containsVioletHex(src)) return null;
    return recolorHex(src);
};

const recolorIfViolet = img => {
    const src = img.getAttribute('src');
    if (!src) return;
    const recolored = recolorSrc(src);
    if (recolored) img.setAttribute('src', recolored);
};

const recolorExistingIcons = root => {
    root.querySelectorAll('img').forEach(recolorIfViolet);
};

const AssetPanel = props => {
    const wrapperRef = React.useRef(null);

    const setWrapperRef = React.useCallback(node => {
        wrapperRef.current = node;
    }, []);

    React.useEffect(() => {
        const root = wrapperRef.current;
        if (!root) return () => {};

        recolorExistingIcons(root);

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes') {
                    if (mutation.target.tagName === 'IMG') {
                        recolorIfViolet(mutation.target);
                    }
                    return;
                }
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.tagName === 'IMG') {
                        recolorIfViolet(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('img').forEach(recolorIfViolet);
                    }
                });
            });
        });
        observer.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src']
        });

        return () => observer.disconnect();
    }, []);

    return (
        <Box
            className={styles.wrapper}
            componentRef={setWrapperRef}
        >
            <Selector
                className={styles.selector}
                {...props}
            />
            <Box className={styles.detailArea}>
                {props.children}
            </Box>
        </Box>
    );
};

AssetPanel.propTypes = {
    ...Selector.propTypes
};

export default AssetPanel;
