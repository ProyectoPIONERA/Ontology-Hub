/**
 * Module dependencies.
 */
require('dotenv').config(); // Cargar variables de entorno al inicio
var app = require("./config/app");
const { ElasticService } = require('./app/elastic'); // Importamos el servicio unificado
var http = require("http");

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

    // 1. Ejecutamos la creación de índices y mappings desde el objeto unificado
    await ElasticService.init();

    // 2. Inyectamos el servicio en Express para que esté disponible en los controladores
    // Esto permite usar req.app.get('elasticService') en cualquier parte
    app.set('elasticService', ElasticService);

    console.log('Elasticsearch mappings verificados y servicio inyectado.');

    // 3. Iniciamos el servidor
    server.listen(port, '0.0.0.0', () => {
      console.log("Express server listening on port " + port);
    });

  } catch (err) {
    console.error('Error crítico al iniciar la aplicación:', err);
    // Salimos con error para que orquestadores como Docker o PM2 reinicien el proceso
    process.exit(1);
  }
}

bootstrap();