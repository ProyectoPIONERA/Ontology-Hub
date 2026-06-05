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
            const settingsRaw = JSON.parse(fs.readFileSync(path.join(mappingsDir, 'settings.json'), 'utf8'));
            const actualSettings = settingsRaw.settings ? settingsRaw.settings : settingsRaw;

            for (const [key, indexName] of Object.entries(this.indices)) {
                const exists = await client.indices.exists({ index: indexName });

                if (!exists) {
                    const mappingPath = path.join(mappingsDir, `${key}.json`);
                    if (fs.existsSync(mappingPath)) {
                        const mappingRaw = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
                        const actualProperties = mappingRaw.properties ? mappingRaw.properties : mappingRaw;

                        console.log(`[Creando] ${indexName}...`);
                        await client.indices.create({
                            index: indexName,
                            body: {
                                settings: actualSettings,
                                mappings: { properties: actualProperties }
                            }
                        });

                        // Espera a que el índice esté listo
                        await client.cluster.health({
                            index: indexName,
                            wait_for_status: 'yellow',
                            timeout: '30s'
                        });

                        console.log(`[OK] ${indexName} configurado y activo.`);
                    }
                } else {
                    console.log(`[Info] ${indexName} ya existe.`);
                }
            }
        } catch (err) {
            console.error('--- [ERROR CRÍTICO EN INIT] ---');
            if (err.meta && err.meta.body) {
                console.error(JSON.stringify(err.meta.body.error, null, 2));
            } else {
                console.error(err.message);
            }
            process.exit(1);
        }
    },

    async search(type, options) {
        let indexName;
        // Si es agente, buscamos en Personas y Organizaciones
        if (type === 'agent') {
            indexName = `${this.indices.person},${this.indices.organization}`;
        } else {
            indexName = this.indices[type] || `lov_${type.toLowerCase()}`;
        }

        const { queryString, page = 1, pageSize = 10, fields = ["*"], tag, lang } = options;
        const tagValues = (typeof tag === "string" ? tag.split(",") : [])
            .map((t) => t.trim())
            .filter(Boolean);
        const langValues = (typeof lang === "string" ? lang.split(",") : [])
            .map((l) => l.trim().toLowerCase())
            .filter(Boolean);

        // Ajuste de campo de ordenamiento dinámico
        let sortField = "name.keyword";
        if (type === 'vocabulary') sortField = "prefix.keyword";
        if (type === 'property' || type === 'class') sortField = "prefixedName.keyword";

        try {
            const response = await client.search({
                index: indexName,
                // CLAVE: No fallar si lov_organization no existe todavía
                ignore_unavailable: true,
                from: (page - 1) * pageSize,
                size: pageSize,
                body: {
                    query: {
                        bool: {
                            must: queryString ? {
                                multi_match: {
                                    query: queryString,
                                    fields: fields,
                                    type: "best_fields"
                                }
                            } : { match_all: {} },
                            filter: (tagValues.length || langValues.length) ? [
                                ...(tagValues.length ? [{ terms: { "tags": tagValues } }] : []),
                                ...(langValues.length ? [{ terms: { "langs": langValues } }] : [])
                            ] : []
                        }
                    },
                    // unmapped_type evita errores 400 si el campo no existe en el Ã­ndice
                    sort: [{ [sortField]: { order: "asc", unmapped_type: "keyword" } }],
                    aggregations: {
                        tags: { terms: { field: "tags", size: 10 } },
                        types: { terms: { field: "type.keyword", size: 10 } },
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
            console.error(`--- [ERROR EN SEARCH (${type})] ---`);
            // Devolver estructura vacía pero compatible con Jade si hay error 404
            if (error.meta && error.meta.statusCode === 404) {
                return {
                    total_results: 0,
                    results: [],
                    aggregations: {
                        tags: { buckets: [] },
                        types: { buckets: [] },
                        langs: { buckets: [] }
                    }
                };
            }
            throw error;
        }
    },

    upsert: async function(type, id, data) {
        const index = this.indices[type] || `lov_${type.toLowerCase()}`;
        try {
            // Convertimos documento de Mongoose a objeto plano
            let doc = data.toObject ? data.toObject() : JSON.parse(JSON.stringify(data));

            if (!doc.type) doc.type = type;

            if (type === 'vocabulary') {
                const langs = new Set();
                if (Array.isArray(doc.titles)) {
                    doc.titles.forEach((t) => {
                        if (t && typeof t.lang === "string" && t.lang.trim()) langs.add(t.lang.trim().toLowerCase());
                    });
                }
                if (Array.isArray(doc.descriptions)) {
                    doc.descriptions.forEach((d) => {
                        if (d && typeof d.lang === "string" && d.lang.trim()) langs.add(d.lang.trim().toLowerCase());
                    });
                }
                if (Array.isArray(doc.versions)) {
                    doc.versions.forEach((v) => {
                        if (!v || !Array.isArray(v.languageIds)) return;
                        v.languageIds.forEach((l) => {
                            if (typeof l === "string" && l.trim() && !/^[a-fA-F0-9]{24}$/.test(l.trim())) langs.add(l.trim().toLowerCase());
                            else if (l && typeof l === "object") {
                                if (typeof l.iso639P1Code === "string" && l.iso639P1Code.trim()) langs.add(l.iso639P1Code.trim().toLowerCase());
                                else if (typeof l.iso639P3PCode === "string" && l.iso639P3PCode.trim()) langs.add(l.iso639P3PCode.trim().toLowerCase());
                                else if (typeof l.label === "string" && l.label.trim()) langs.add(l.label.trim().toLowerCase());
                            }
                        });
                    });
                }
                doc.langs = Array.from(langs);

                if (Array.isArray(doc.titles)) {
                    doc.titles = doc.titles.map(t => (t && typeof t === 'object' && t.value) ? t.value : t);
                }
                if (Array.isArray(doc.descriptions)) {
                    doc.descriptions = doc.descriptions.map(d => (d && typeof d === 'object' && d.value) ? d.value : d);
                }
            }


            if (type === 'property' && doc.localName && typeof doc.localName !== 'object') {
                doc.localName = { ngram: doc.localName };
            } else if (type !== 'property' && doc.localName && typeof doc.localName === 'object' && doc.localName.ngram) {
                doc.localName = doc.localName.ngram;
            }

            delete doc._id;
            delete doc.__v;

            return await client.index({
                index,
                id: id.toString(),
                document: doc,
                refresh: true
            });
        } catch (err) {
            console.error("--- [ERROR EN UPSERT] ---", err);
            throw err;
        }
    },

    delete: async function(index, id) {
        try {
            return await client.delete({
                index,
                id: id.toString(),
                refresh: true
            });
        } catch (err) {
            if (err.meta && err.meta.statusCode === 404) {
                console.warn(`[Elastic] Document not found: ${index}/${id}`);
                return null;
            }
            console.error("[Elastic Delete Error]", err);
            throw err;
        }
    },

    deleteByQuery: async function(indices, query) {
        try {
            // Filter out non-existent indices
            const existingIndices = [];
            for (const index of indices) {
                try {
                    const exists = await client.indices.exists({ index });
                    if (exists) {
                        existingIndices.push(index);
                    } else {
                        console.warn(`[Elastic] Index does not exist, skipping: ${index}`);
                    }
                } catch (e) {
                    console.warn(`[Elastic] Could not check index existence: ${index}`);
                }
            }
            
            if (existingIndices.length === 0) {
                console.warn("[Elastic] No indices found to delete from, skipping Elasticsearch cleanup");
                return null;
            }
            
            console.log(`[Elastic] Deleting from indices: ${existingIndices.join(', ')}`);
            
            return await client.deleteByQuery({
                index: existingIndices,
                refresh: true,
                query: query
            });
        } catch (err) {
            // Don't throw errors - Elasticsearch cleanup is not critical
            // The main MongoDB deletion should always proceed
            console.warn("[Elastic] DeleteByQuery failed, continuing anyway:", err.message);
            return null;
        }
    },

    updateByQuery: async function(indices, script, query) {
        try {
            return await client.updateByQuery({
                index: indices,
                refresh: true,
                script: script,
                query: query
            });
        } catch (err) {
            console.error("[Elastic UpdateByQuery Error]", err);
            throw err;
        }
    }
};

module.exports = { client, ElasticService };
