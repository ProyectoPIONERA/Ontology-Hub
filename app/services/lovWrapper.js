/**
 * Traducido de LOVWrapper.java y TermDescriber.java
 * Este servicio "envuelve" los términos con la metadata del vocabulario.
 */

exports.wrap = function(term, vocabDoc) {
    // 1. Limpieza de la metadata del vocabulario (como hacía Java)
    // Extraemos solo lo necesario para no engordar los índices de términos
    const vocabInfo = {
        uri: vocabDoc.uri || vocabDoc.isDefinedBy,
        prefix: vocabDoc.prefix,
        titles: vocabDoc.titles || [],
        tags: vocabDoc.tags || []
    };

    // 2. Construcción del documento final para Elasticsearch
    // Seguimos el esquema de VocidexDocument
    const wrappedDoc = {
        uri: term.uri,
        type: term.type, // 'class', 'property', 'datatype', 'individual'

        // prefixedName: 'prefix:localName' (Clave para visualización rápida)
        prefixedName: vocabDoc.prefix ? `${vocabDoc.prefix}:${term.localName}` : term.localName,

        localName: {
            ngram: term.localName // El mapeo 'ngram' se define en el index template de ES
        },

        // Metadata básica
        label: term.label,
        comment: term.comment,

        // Campos de idioma y anotaciones dinámicas extraídas del RDF
        // Se esparcen las anotaciones (ej: "http://.../label@en": ["Value"])
        ...term.annotations,

        // Inyección del objeto Vocabulary (Vital para los filtros del buscador)
        vocabulary: vocabInfo,

        // Etiquetas heredadas del vocabulario
        tags: vocabDoc.tags || [],

        // Inicialización de métricas (LOVTermMetricsDescriber.java)
        // Se ponen a 0 para que el script de scoring Painless no falle con nulos
        metrics: {
            occurrencesInVocabularies: 0,
            occurrencesInDatasets: 0,
            reusedByVocabularies: 0,
            reusedByDatasets: 0
        }
    };

    return wrappedDoc;
};