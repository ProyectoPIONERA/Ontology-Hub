/**
 * Module dependencies.
 */
var app = require("./config/app");
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

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, '0.0.0.0', () => {
  console.log("Express server listening on port " + port);
});
