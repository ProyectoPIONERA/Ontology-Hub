var utils = require("../../lib/utils");
var fs = require("fs");
var http = require("http");
var questionAnswerExamples = require("../../lib/questionAnswerExamples");
var mongoose = require("mongoose");
var LogQA = mongoose.model("LogQA");

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
exports.search = function (req, res) {
  if (req.query.q && req.query.q.length > 1) {
    var command =
      "/home/sergio/anaconda3/envs/env2/bin/python /home/sergio/qa4lov/src/webapp/main.py --html --q '" +
      req.query.q +
      "'";
    var exec = require("child_process").exec;
    child = exec(command, function (error, stdout, stderr) {
      if (error !== null) {
        console.log("exec error: " + error);
      }

      var log = new LogQA({
        query: req.query.q,
        date: new Date(),
        isQuestionProcessed: stdout.lastIndexOf("Sorry. I don't", 0) !== 0,
        isResultEmpty: stdout.lastIndexOf("Sorry. I am", 0) === 0,
      });
      log
        .save()
        .then(() => {
          console.log("LogQA saved");
        })
        .catch((err) => {
          console.log(err);
        });
      res.render("qa/index", {
        QAExamples: questionAnswerExamples,
        question: req.query.q,
        stdout: stdout,
        stderr: stderr,
        utils: utils,
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
  } else {
    res.render("qa/index", {
      QAExamples: questionAnswerExamples,
      utils: utils,
      app_name_shorcut: app_name_shorcut,
      app_name: app_name,
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
