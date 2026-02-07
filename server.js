/**
 * Module dependencies.
 */
var app = require("./config/app");
const initElastic = require('./app/elastic/mappingManager');
var http = require("http");
require('dotenv').config();
console.log('Connecting to MongoDB with:', process.env.MONGO_DB_CONNECTION_STRING);
/**
 * Set default timezone in London
 */
process.env.TZ = "Europe/London";

/**
 * Get port from environment and store in Express.
 */
var port = process.env.PORT || 3333;
app.set("port", port);

/**
 * Create HTTP server.
 */
var server = http.createServer(app);

// Función de arranque controlada
async function bootstrap() {
  try {
    console.log('Esperando configuración de Elasticsearch...');

    // Ejecutamos la creación de índices y mappings
    await initElastic();

    console.log('Elasticsearch mappings verificados.');

    server.listen(port, '0.0.0.0', () => {
      console.log("Express server listening on port " + port);
    });

  } catch (err) {
    console.error('Error crítico al iniciar Elasticsearch:', err);
    // Decisión de arquitectura: ¿Debe el server caerse si Elastic no conecta?
    // Generalmente sí, para que Docker lo reinicie.
    process.exit(1);
  }
}

bootstrap();