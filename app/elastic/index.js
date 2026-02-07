const { Client } = require('@elastic/elasticsearch');

// Cargamos la conexión directamente aquí
const client = new Client({
    node: process.env.ELASTIC_SEARCH_HOST ? `http://${process.env.ELASTIC_SEARCH_HOST}:9200` : 'http://localhost:9200',
    auth: {
        username: process.env.ELASTIC_SEARCH_USER || 'elastic',
        password: process.env.ELASTIC_SEARCH_PASSWORD || 'changeme'
    },
    tls: { rejectUnauthorized: false }
});

const ElasticService = {
    sync: async (type, doc) => {
        const indexName = `lov_${type.toLowerCase()}`;
        try {
            const data = doc.toObject ? doc.toObject() : JSON.parse(JSON.stringify(doc));
            const { _id, __v, ...documentBody } = data;

            await client.index({
                index: indexName,
                id: _id.toString(),
                document: documentBody,
                refresh: 'wait_for'
            });
            console.log(`[Elastic] Sincronizado con éxito: ${indexName}`);
        } catch (err) {
            console.error(`[Elastic Error] Error en sync:`, err.message);
        }
    }
};

module.exports = ElasticService;