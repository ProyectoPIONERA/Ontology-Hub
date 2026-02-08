const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');
const path = require('path');

const client = new Client({
    node: process.env.ELASTIC_SEARCH_HOST ? `http://${process.env.ELASTIC_SEARCH_HOST}:9200` : 'http://localhost:9200',
    auth: {
        username: process.env.ELASTIC_SEARCH_USER || 'elastic',
        password: process.env.ELASTIC_SEARCH_PASSWORD || 'changeme'
    },
    tls: { rejectUnauthorized: false }
});

const ElasticService = {
    indices: {
        vocabulary: 'lov_vocabulary',
        property: 'lov_property',
        class: 'lov_class',
        datatype: 'lov_datatype',
        instance: 'lov_instance',
        person: 'lov_person',
        organization: 'lov_organization'
    },

    init: async function() {
        const mappingsDir = path.join(__dirname, 'mappings');
        try {
            console.log('--- [Elastic] Iniciando infraestructura ---');

            // 1. Cargar y Limpiar Settings
            const settingsRaw = JSON.parse(fs.readFileSync(path.join(mappingsDir, 'settings.json'), 'utf8'));
            const actualSettings = settingsRaw.settings ? settingsRaw.settings : settingsRaw;

            for (const [key, indexName] of Object.entries(this.indices)) {
                const exists = await client.indices.exists({ index: indexName });

                if (!exists) {
                    const mappingPath = path.join(mappingsDir, `${key}.json`);
                    if (fs.existsSync(mappingPath)) {
                        const mappingRaw = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

                        // 2. Limpiar Mappings: Forzamos la raíz "properties"
                        const actualProperties = mappingRaw.properties ? mappingRaw.properties : mappingRaw;

                        console.log(`[Creando] ${indexName}...`);
                        await client.indices.create({
                            index: indexName,
                            body: {
                                settings: actualSettings,
                                mappings: {
                                    properties: actualProperties
                                }
                            }
                        });
                        console.log(`[OK] ${indexName} configurado.`);
                    }
                }
            }
        } catch (err) {
            console.error('--- [ERROR CRÍTICO EN INIT] ---');
            // Aquí ES nos dirá si hay un error de sintaxis en el JSON
            if (err.meta && err.meta.body) {
                console.error(JSON.stringify(err.meta.body.error, null, 2));
            } else {
                console.error(err.message);
            }
            process.exit(1); // Detenemos el servidor para obligar a leer el error
        }
    },

    async search(type, options) {
        const index = this.indices[type] || `lov_${type.toLowerCase()}`;
        const { queryString, page = 1, pageSize = 10, fields = ["*"], tag, lang } = options;

        const sortField = (type === 'vocabulary') ? "prefix" : "prefixedName.keyword";

        try {
            const response = await client.search({
                index: index,
                from: (page - 1) * pageSize,
                size: pageSize,
                body: {
                    query: {
                        bool: {
                            must: queryString ? {
                                multi_match: { query: queryString, fields: fields, type: "best_fields" }
                            } : { match_all: {} },
                            filter: (tag || lang) ? [
                                ...(tag ? [{ term: { "tags": tag } }] : []),
                                ...(lang ? [{ term: { "langs": lang } }] : [])
                            ] : []
                        }
                    },
                    sort: [{ [sortField]: { order: "asc", unmapped_type: "keyword" } }],
                    aggregations: {
                        tags: { terms: { field: "tags", size: 10 } },
                        langs: { terms: { field: "langs", size: 10 } }
                    }
                }
            });

            return {
                total_results: (typeof response.hits.total === 'object') ? response.hits.total.value : response.hits.total,
                results: response.hits.hits,
                aggregations: response.aggregations
            };
        } catch (error) {
            console.error("--- [ERROR EN SEARCH] ---");
            if (error.meta && error.meta.body) {
                console.error(JSON.stringify(error.meta.body.error, null, 2));
            }
            throw error;
        }
    },

    upsert: async function(type, id, data) {
        const index = this.indices[type] || `lov_${type.toLowerCase()}`;
        try {
            let doc = data.toObject ? data.toObject() : JSON.parse(JSON.stringify(data));
            delete doc._id; delete doc.__v;
            return await client.index({ index, id: id.toString(), document: doc, refresh: true });
        } catch (err) { throw err; }
    }
};

module.exports = { client, ElasticService };