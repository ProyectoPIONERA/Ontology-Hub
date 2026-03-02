/**
 * Traducido de LabelDescriber.java y StrLiteralDescriber.java
 * Se encarga de la limpieza, síntesis y selección de etiquetas para los términos.
 */

const URL_DECODER = require('querystring');

/**
 * Genera una etiqueta legible a partir de una URI.
 * Ejemplo: "DirectSupervisor" -> "direct supervisor"
 * Ejemplo: "has_component" -> "has component"
 */
exports.synthesizeLabelFromURI = function(uri) {
    if (!uri) return "";

    // 1. Extraer la parte final (localName)
    let label = uri.split(/[#/]/).pop() || "";

    try {
        // 2. Decodificar caracteres URL (como %20)
        label = decodeURIComponent(label);
    } catch (e) {
        // Fallback si la decodificación falla
    }

    return label
        // 3. Reemplazar guiones bajos y medios por espacios
        .replace(/[_-]+/g, ' ')
        // 4. Insertar espacio ante cambios de mayúsculas (CamelCase)
        // Ejemplo: "myProperty" -> "my Property"
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // 5. Convertir mayúsculas aisladas a minúsculas
        // Ejemplo: "My Property" -> "my property"
        .replace(/(?<![A-Z])([A-Z])(?![A-Z])/g, (match) => match.toLowerCase())
        .trim();
};

/**
 * Selecciona la mejor etiqueta disponible basándose en prioridades.
 * Prioridad: rdfs:label > skos:prefLabel > dc:title > Sintetizada
 */
exports.getBestLabel = function(annotations, uri) {
    const priorityPredicates = [
        'http://www.w3.org/2000/01/rdf-schema#label',
        'http://www.w3.org/2004/02/skos/core#prefLabel',
        'http://purl.org/dc/terms/title'
    ];

    // Buscar en las anotaciones extraídas
    for (const predicate of priorityPredicates) {
        // Buscamos la versión sin idioma o la primera que aparezca
        const found = Object.keys(annotations).find(key => key.startsWith(predicate));
        if (found && annotations[found].length > 0) {
            return annotations[found][0];
        }
    }

    // Si no hay ninguna, sintetizar desde la URI
    return exports.synthesizeLabelFromURI(uri);
};