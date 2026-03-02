const { Client } = require('@elastic/elasticsearch');

// Definimos la URL primero para mayor claridad
const esHost = process.env.ELASTIC_SEARCH_HOST ?
    `http://${process.env.ELASTIC_SEARCH_HOST}:9200` :
    'http://localhost:9200';

const client = new Client({
    node: esHost,
    auth: {
        username: process.env.ELASTIC_SEARCH_USER || 'elastic',
        password: process.env.ELASTIC_SEARCH_PASSWORD || 'changeme'
    },
    tls: {
        rejectUnauthorized: false // Esto permite la conexión aunque el certificado sea auto-firmado
    }
});

module.exports = client;