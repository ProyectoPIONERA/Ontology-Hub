/**
 * Module dependencies.
 */

var mongoose = require("mongoose"),
  User = mongoose.model("User"),
  users = require("./users"),
  Agent = mongoose.model("Agent"),
  Vocabulary = mongoose.model("Vocabulary"),
  LogSuggest = mongoose.model("LogSuggest"),
  utils = require("../../lib/utils"),
  _ = require("underscore"),
  async = require("async");

var app_name;
var app_name_shorcut;

exports.configureName = function (an, ans) {
  app_name = an;
  app_name_shorcut = ans;
};

exports.reviewUsersBatch = function (req, res) {
  var deleteArray = JSON.parse(req.body.deleteArray);
  var activateArray = JSON.parse(req.body.activateArray);
  async.each(
    activateArray,
    function (id, callback) {
      User.findOneAndUpdate({ _id: id }, { $set: { activated: true } })
        .then(() => {
          callback();
        })
        .catch((err) => {
          callback(err);
        });
    },
    function (err, result) {
      if (err) {
        return console.log(err);
      }
      async.each(
        deleteArray,
        function (id, cb) {
          User.deleteOne({ _id: id })
            .then(() => {
              cb();
            })
            .catch((err) => {
              cb(err);
            });
        },
        function (err, result) {
          if (err) {
            return console.log(err);
          }
          res.redirect("/edition/lov/");
        }
      );
    }
  );
};

exports.suggestTakeAction = function (req, res) {
  LogSuggest.findOneAndUpdate(
    { _id: req.body.suggId },
    { $set: { reviewedBy: req.user.agent } }
  )
    .then(() => {
      res.redirect("/edition/lov/");
    })
    .catch((err) => {
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
};

exports.suggestUpdateStatus = function (req, res) {
  LogSuggest.findOneAndUpdate(
    { _id: req.body.suggId },
    { $set: { status: req.body.status } }
  )
    .then(() => {
      res.redirect("/edition/lov/");
    })
    .catch((err) => {
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
};

exports.index = function (req, res) {
  Vocabulary.listVocabsForReview(function (err, vocabsForReview) {
    LogSuggest.listActive(function (err, suggests) {
      User.listUsersForReview(function (err, users) {
        Vocabulary.listVocabVersionsToReview(function (
          err,
          vocabsVersionsForReview
        ) {
          res.render("edition", {
            utils: utils,
            users: users,
            suggests: suggests,
            vocabsForReview: vocabsForReview,
            vocabsVersionsForReview: vocabsVersionsForReview,
            auth: req.user,
            app_name_shorcut: app_name_shorcut,
            app_name: app_name,
          });
        });
      });
    });
  });
};
