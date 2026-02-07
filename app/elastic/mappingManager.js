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
async function initElastic() {
    const mappingsDir = path.join(__dirname, 'mappings');

    // 1. Cargar Settings Globales
    const settings = JSON.parse(fs.readFileSync(path.join(mappingsDir, 'settings.json'), 'utf8'));

    // Lista de tus 9 archivos (nombres de los archivos JSON)
    const indices = [
        'class', 'datatype', 'individual', 'instance',
        'organization', 'person', 'property', 'vocabulary'
    ];

    console.log('--- Verificando Índices en Elasticsearch ---');

    for (const name of indices) {
        const indexName = `lov_${name}`; // Prefijo para mantener la esencia de LOV

        try {
            // Verificamos si el índice ya existe
            const exists = await client.indices.exists({ index: indexName });

            if (!exists) {
                console.log(`[Creando] ${indexName}...`);
                const mappingData = JSON.parse(fs.readFileSync(path.join(mappingsDir, `${name}.json`), 'utf8'));

                await client.indices.create({
                    index: indexName,
                    body: {
                        settings: settings.settings,
                        mappings: mappingData
                    }
                });
                console.log(`[OK] Índice ${indexName} creado con éxito.`);
            } else {
                console.log(`[Existente] ${indexName} ya está configurado.`);
            }
        } catch (err) {
            console.error(`[Error] Falló la verificación de ${indexName}:`, err.meta?.body?.error || err);
        }
    }
    console.log('--- Finalizada inicialización de Elasticsearch ---');
}

module.exports = initElastic;