/*
 * Sesión 34 — los colores de categoría (primary/secondary/tertiary/quaternary) de cada bloque se
 * igualaron a los de `../default/index.js`: a pedido explícito del usuario, los bloques en sí NO
 * cambian entre modo claro/oscuro, solo los fondos (workspace/toolbox/flyout) y el texto. Antes
 * el tema "dark" que trae scratch-gui de fábrica sí recoloreaba cada categoría a un tono casi
 * negro (ej. motion.primary pasaba de "#4C97FF" a "#0F1E33") — eso quedó descartado acá.
 */
const blockColors = {
    motion: {
        primary: '#4C97FF',
        secondary: '#4280D7',
        tertiary: '#3373CC',
        quaternary: '#3373CC'
    },
    looks: {
        primary: '#9966FF',
        secondary: '#855CD6',
        tertiary: '#774DCB',
        quaternary: '#774DCB'
    },
    sounds: {
        primary: '#CF63CF',
        secondary: '#C94FC9',
        tertiary: '#BD42BD',
        quaternary: '#BD42BD'
    },
    control: {
        primary: '#FFAB19',
        secondary: '#EC9C13',
        tertiary: '#CF8B17',
        quaternary: '#CF8B17'
    },
    event: {
        primary: '#FFBF00',
        secondary: '#E6AC00',
        tertiary: '#CC9900',
        quaternary: '#CC9900'
    },
    sensing: {
        primary: '#5CB1D6',
        secondary: '#47A8D1',
        tertiary: '#2E8EB8',
        quaternary: '#2E8EB8'
    },
    pen: {
        primary: '#0fBD8C',
        secondary: '#0DA57A',
        tertiary: '#0B8E69',
        quaternary: '#0B8E69'
    },
    operators: {
        primary: '#59C059',
        secondary: '#46B946',
        tertiary: '#389438',
        quaternary: '#389438'
    },
    data: {
        primary: '#FF8C1A',
        secondary: '#FF8000',
        tertiary: '#DB6E00',
        quaternary: '#DB6E00'
    },
    data_lists: {
        primary: '#FF661A',
        secondary: '#FF5500',
        tertiary: '#E64D00',
        quaternary: '#E64D00'
    },
    more: {
        primary: '#FF6680',
        secondary: '#FF4D6A',
        tertiary: '#FF3355',
        quaternary: '#FF3355'
    },
    // Igual que default (#FFFFFF) — antes era un blanco 70% opaco, la única diferencia real entre
    // ambos temas era esta línea ya que los bloques quedan idénticos.
    text: '#FFFFFF',
    // textField/textFieldText: el cuadrito editable dentro de un bloque (ej. el "10" de "mover 10
    // pasos") — a pedido del usuario, siempre fondo blanco y letra oscura, igual que default,
    // nunca el gris oscuro que traía el tema "dark" de fábrica. Mismo criterio que el resto de
    // "los bloques no cambian": esto es parte del bloque, no del fondo del workspace.
    textFieldText: '#575E75',
    // Sesión 34 (paso 2) — tonos alineados a los de mBlock (analizados pixel a pixel desde una
    // captura real, ver docs/scratch-editor-integration.md): panel base #1F1F1F, superficie
    // elevada/interactiva #363636. Antes era #121212/#4C4C4C, un gris ligeramente distinto sin
    // relación con ninguna referencia concreta.
    workspace: '#1f1f1f',
    toolboxSelected: '#363636',
    toolboxText: '#E5E5E5',
    toolbox: '#1f1f1f',
    flyout: '#1f1f1f',
    textField: '#FFFFFF',
    menuHover: 'rgba(255, 255, 255, 0.3)'
};

const extensions = {};

export {
    blockColors,
    extensions
};
