// services/elasticService.js

class ElasticService {
    constructor(client) {
        this.client = client;
        // Mapa maestro de los 9 índices
        this.indices = {
            vocabulary: 'lov_vocabulary',
            properties: 'lov_properties',
            classes:    'lov_classes',
            agents:     'lov_agents',
            datatypes:  'lov_datatypes',
            schemes:    'lov_schemes',
            prefixes:   'lov_prefixes',
            tags:       'lov_tags',
            langs:      'lov_langs'
        };
    }

    /**
     * MÉTODO DE BÚSQUEDA COMPLETO
     */
    async search(type, params) {
        const indexName = this.indices[type];
        if (!indexName) throw new Error(`Índice no configurado para: ${type}`);

        // Extraemos parámetros con valores por defecto
        const {
            queryString,
            page = 1,
            pageSize = 15,
            tag,
            lang,
            tagLimit = 10,
            langLimit = 10,
            fields = []
        } = params;

        // 1. Construcción de filtros (usando .keyword para evitar errores de fielddata)
        let filterArray = [];
        if (tag && tag !== 'null') {
            tag.split(',').forEach(t => filterArray.push({ term: { "tags.keyword": t.trim() } }));
        }
        if (lang && lang !== 'null') {
            lang.split(',').forEach(l => filterArray.push({ term: { "langs.keyword": l.trim() } }));
        }

        // 2. Definición del cuerpo de la query (DSL moderno)
        const queryBody = {
            from: (page - 1) * pageSize,
            size: pageSize,
            query: {
                bool: {
                    must: queryString ? {
                        multi_match: {
                            query: queryString,
                            type: "best_fields",
                            fields: fields
                        }
                    } : { match_all: {} },
                    filter: filterArray
                }
            },
            sort: queryString ? [{ _score: { order: "desc" } }] : [{ "prefix.keyword": { order: "asc" } }],
            aggregations: {
                tags: { terms: { field: "tags.keyword", size: parseInt(tagLimit) } },
                langs: { terms: { field: "langs.keyword", size: parseInt(langLimit) } }
            }
        };

        try {
            // 3. Ejecución en Elasticsearch
            const response = await this.client.search({
                index: indexName,
                body: queryBody
            });

            // 4. Normalización para Jade (Evita el error 'Cannot read property tag of undefined')
            return {
                total_results: typeof response.hits.total === 'object' ? response.hits.total.value : response.hits.total,
                results: response.hits.hits, // Mantenemos el formato original que espera tu controlador (.hits[i]._source)
                aggregations: response.aggregations || {},
                filters: {
                    tag: tag || null,
                    lang: lang || null
                },
                page: page,
                page_size: pageSize,
                queryString: queryString
            };

        } catch (error) {
            console.error(`[ElasticService Error]:`, error);
            throw error;
        }
    }

    /**
     * MÉTODOS CRUD ADICIONALES
     */
    async getById(type, id) {
        return await this.client.get({ index: this.indices[type], id });
    }

    async upsert(type, id, data) {
        return await this.client.index({
            index: this.indices[type],
            id: id,
            body: data,
            refresh: true
        });
    }

    async delete(type, id) {
        return await this.client.delete({ index: this.indices[type], id });
    }
}

module.exports = ElasticService;