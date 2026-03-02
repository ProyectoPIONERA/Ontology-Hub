const N3 = require('n3');
const fs = require('fs');
const labelService = require('./labelService');

/**
 * Servicio principal de extracción
 */
exports.extractAllTerms = async function(filePath) {
    const parser = new N3.Parser();
    const store = new N3.Store();

    return new Promise((resolve, reject) => {
        // Usamos stream para soportar archivos RDF grandes sin saturar la RAM
        const stream = fs.createReadStream(filePath);

        parser.parse(stream, (error, quad) => {
            if (error) return reject(new Error(`Error parseando RDF: ${error.message}`));

            if (quad) {
                store.add(quad);
            } else {
                // Clasificación basada en la lógica de VocabularyTermExtractor.java
                const results = {
                    classes: extractByCategory(store, [
                        'http://www.w3.org/2002/07/owl#Class',
                        'http://www.w3.org/2000/01/rdf-schema#Class'
                    ], 'class'),

                    properties: extractByCategory(store, [
                        'http://www.w3.org/2002/07/owl#ObjectProperty',
                        'http://www.w3.org/2002/07/owl#DatatypeProperty',
                        'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property',
                        'http://www.w3.org/2002/07/owl#AnnotationProperty'
                    ], 'property'),

                    datatypes: extractByCategory(store, [
                        'http://www.w3.org/2000/01/rdf-schema#Datatype'
                    ], 'datatype'),

                    individuals: extractByCategory(store, [
                        'http://www.w3.org/2002/07/owl#NamedIndividual'
                    ], 'individual')
                };

                resolve(results);
            }
        });
    });
};

/**
 * Filtra el store de N3 por tipos específicos
 */
function extractByCategory(store, typeIris, categoryName) {
    const foundTerms = [];
    const seenUris = new Set();

    typeIris.forEach(typeIri => {
        const subjects = store.getSubjects('http://www.w3.org/1999/02/22-rdf-syntax-ns#type', typeIri);

        subjects.forEach(subject => {
            if (seenUris.has(subject.id)) return;
            seenUris.add(subject.id);

            foundTerms.push(describeResource(subject.id, categoryName, store));
        });
    });

    return foundTerms;
}

/**
 * Extrae la metadata detallada de cada recurso (Equivale a TermDescriber.java)
 */
function describeResource(uri, type, store) {
    const description = {
        uri: uri,
        type: type,
        localName: uri.split(/[#/]/).pop(),
        label: null,
        comment: null,
        annotations: {}
    };

    const quads = store.getQuads(uri, null, null);

    quads.forEach(quad => {
        const predicate = quad.predicate.id;
        const object = quad.object;

        if (object.termType === 'Literal') {
            const value = object.value;
            const lang = object.language ? `@${object.language}` : "";
            const key = `${predicate}${lang}`;

            // Guardamos todas las anotaciones para StrLiteralDescriber
            if (!description.annotations[key]) description.annotations[key] = [];
            description.annotations[key].push(value);

            // Prioridad para el comentario (rdfs:comment o dc:description)
            if ((predicate.endsWith('comment') || predicate.endsWith('description')) && !description.comment) {
                description.comment = value;
            }
        }
    });

    // USAMOS EL SERVICIO EXTERNO:
    // getBestLabel ya decide si usar rdfs:label, skos, dc:title o sintetizar.
    description.label = labelService.getBestLabel(description.annotations, uri);

    return description;
}