var utils = require("../../lib/utils");
var dagre = require("dagre");
var fs = require("fs");
var file = __dirname + "../../../public/test.json";
var http = require("http");

var mongoose = require("mongoose"),
  LogSearch = mongoose.model("LogSearch");

var app_name;
var app_name_shorcut;

exports.configureName = function (an, ans) {
  app_name = an;
  app_name_shorcut = ans;
};

/* **********************
  ENTRYPOINT FUNCTIONS
********************** */
/**
 * Full text search used by the search UI
 */
exports.search = function (req, res, esclient) {
  if (req.query.q) {
    var kws = req.query.q.split(";");
    if (kws.length > 1) {

      var options = {
        hostname: "localhost",
        port: 8181,
        path: "/vocreco/rest/reco?q=" + req.query.q,
      };
      http.get(options, function (response) {
        var bodyChunks = [];
        response.on("data", function (d) {
          bodyChunks.push(d);
        }); // Continuously update stream with data
        response.on("end", function () {
          var body = Buffer.concat(bodyChunks);
          res.render("searchMulti/index", {
            utils: utils,
            dagre: dagre,
            results: JSON.parse(body),
            app_name_shorcut: app_name_shorcut,
            app_name: app_name,
          });
        });
      });
    } else {
      res.render("searchMulti/index", {
        utils: utils,
        dagre: dagre,
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    }
  } else {
    res.render("searchMulti/index", {
      utils: utils,
      dagre: dagre,
      app_name_shorcut: app_name_shorcut,
      app_name: app_name,
    });
  }
};

/**
 * Full text search used by the API
 */
exports.apiSearch = function (req, res, esclient) {
  if (!req.query.q) {
    //control that q param is present
    return standardBadRequestHandler(
      req,
      res,
      "Query parameter missing. Syntax: ?q=querytext"
    );
  } else {
    var options = {
      hostname: "localhost",
      port: 8181,
      path: "/vocreco/rest/reco?q=" + req.query.q,
    };
    http.get(options, function (response) {
      var bodyChunks = [];
      response.on("data", function (d) {
        bodyChunks.push(d);
      }); // Continuously update stream with data
      response.on("end", function () {
        var err = null;
        var body = Buffer.concat(bodyChunks);
        var log = new LogSearch({
          searchWords: req.query.q,
          searchURL: req.originalUrl,
          date: new Date(),
          category: "termMultiSearch",
          method: "api",
        });
        log.save(function (err) {
          if (err) console.log(err);
        });
        return standardCallback(req, res, err, body);
      });
    });
  }
};

/* ************
  FUNCTIONS
************ */

/* return a notification of a bad request */
function standardBadRequestHandler(req, res, helpText) {
  res.set("Content-Type", "text/plain");
  return res.send(400, helpText);
}

/* depending on result, send the appropriate response code */
function standardCallback(req, res, err, results) {
  if (err != null) {
    return res.send(500, err);
  } else if (!(results != null)) {
    return res.send(404, "API returned no results");
  } else {
    return res.send(200, results);
  }
}
