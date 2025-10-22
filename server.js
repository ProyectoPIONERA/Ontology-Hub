/**
 * Module dependencies.
 */
var app = require("./config/app");
var http = require("http");

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

server.listen(port, () => {
  console.log("Express server listening on port " + port);
});
