/**
 * Module dependencies.
 */
var mongoose = require("mongoose"),
  LogSearch = mongoose.model("LogSearch"),
  LogSparql = mongoose.model("LogSparql"),
  LogClickEvent = mongoose.model("LogClickEvent"),
  LogQueryEvent = mongoose.model("LogQueryEvent"),
  LogClickVocEvent = mongoose.model("LogClickVocEvent"),
  LogQueryVocEvent = mongoose.model("LogQueryVocEvent"),
  utils = require("../../lib/utils");

var app_name;
var app_name_shorcut;

exports.configureName = function (an, ans) {
  app_name = an;
  app_name_shorcut = ans;
};

/**
 * LOG SPARQL API
 */
exports.apiSPARQL = function (req, res) {
  LogSparql.list(function (err, logs) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    return standardCallback(req, res, err, logs);
  });
};

/**
 * LOG Click Event
 */
exports.clickEvent = function (req, res) {
  //store log in DB
  var log = new LogClickEvent({
    date: req.query.date,
    sessionId: req.query.sess,
    clickedTerm: req.query.term,
  });
  log
    .save()
    .then(() => {
      res.send(200, "");
    })
    .catch((err) => {
      console.log(err);
    });
  return;
};

/**
 * LOG Click Vocabulary Event
 */
exports.clickVocEvent = function (req, res) {
  //store log in DB
  var log = new LogClickVocEvent({
    date: req.query.date,
    sessionId: req.query.sessionId,
    clickedVoc: req.query.voc,
  });
  log
    .save()
    .then(() => {
      return res.send(200, "");
    })
    .catch((err) => {
      console.log(err);
    });
};

/**
 * LOG Query Event
 */
exports.queryEvent = function (req, res) {
  //store log in DB
  var log = new LogQueryEvent({
    date: req.query.date,
    sessionId: req.query.sessionId,
    searchWords: req.query.searchWords,
    filterTypes: req.query.filterTypes,
    filterTags: req.query.filterTags,
    filterVocs: req.query.filterVocs,
    page: req.query.page,
    nbResults: req.query.nbResults,
    results: req.query.results,
  });
  log
    .save()
    .then(() => {
      return res.send(200, "");
    })
    .catch((err) => {
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
};

/**
 * LOG Query Vocabulary Event
 */
exports.queryVocEvent = function (req, res) {
  //store log in DB
  var log = new LogQueryVocEvent({
    date: req.query.date,
    sessionId: req.query.sessionId,
    searchWords: req.query.searchWords,
    filterTags: req.query.filterTags,
    filterLangs: req.query.filterLangs,
    page: req.query.page,
    nbResults: req.query.nbResults,
    results: req.query.results,
  });
  log
    .save()
    .then(() => {
      return res.send(200, "");
    })
    .catch((err) => {
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
};

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
