/**
 * Module dependencies.
 */

var mongoose = require("mongoose"),
  Agent = mongoose.model("Agent"),
  Vocabulary = mongoose.model("Vocabulary"),
  LogSearch = mongoose.model("LogSearch"),
  utils = require("../../lib/utils"),
  _ = require("underscore");

var app_name;
var app_name_shorcut;

exports.configureName = function (an, ans) {
  app_name = an;
  app_name_shorcut = ans;
};

/**
 * Load
 */

exports.loadFromName = function (req, res, next, name) {
  Agent.loadFromName(name, function (err, agent) {
    if (err) return next(err);
    if (!agent) return next(new Error("Agent " + name + " not found"));
    req.agent = agent;
    next();
  });
};

exports.load = function (req, res, next, id) {
  Agent.load(id, function (err, agent) {
    if (err) return next(err);
    if (!agent) return next(new Error("Agent " + id + " not found"));
    req.agent = agent;
    next();
  });
};

/**
 * Edit an agent
 */
exports.edit = function (req, res) {
  res.render("agents/edit", {
    agent: req.agent,
    app_name_shorcut: app_name_shorcut,
    app_name: app_name,
  });
};

/**
 * Delete an agent
 */
exports.destroy = function (req, res) {
  var agent = req.agent;
  Agent.findOneAndDelete(agent)
    .then(() => {
      req.flash("info", "Deleted successfully");
      res.redirect("/dataset/lov/agents");
    })
    .catch((err) => {
      req.flash("info", err);
      res.redirect("/dataset/lov/agents");
    });
  /*agent.remove(function (err) {
    req.flash("info", "Deleted successfully");
    res.redirect("/dataset/lov/agents");
  });*/
};

/**
 * Create agent
 */
exports.create = function (req, res) {
  var agent = new Agent(req.body);
  agent
    .save()
    .then(() => {
      return res.redirect("/dataset/lov/agents/" + agent.name);
    })
    .catch((err) => {
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
};

exports.createOnTheFly = function (req, res) {
  var agent = new Agent(req.body);
  agent
    .save()
    .then(() => {
      res.send({ agent: agent });
    })
    .catch((err) => {
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
};

exports.new = function (req, res) {
  res.render("agents/new", {
    agent: new Agent({}),
    app_name_shorcut: app_name_shorcut,
    app_name: app_name,
  });
};

/**
 * Update agent
 */

exports.update = function (req, res) {
  var agent = req.agent;
  agent = _.extend(agent, req.body);
  agent
    .save()
    .then(() => {
      res.redirect("/dataset/lov/agents/" + agent.name);
    })
    .catch((err) => {
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
};

/**
 * Show
 */

exports.show = function (req, res) {
  Vocabulary.listCreatedPerAgent(req.agent._id, function (err, creatVocabs) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    Vocabulary.listContributedPerAgent(
      req.agent._id,
      function (err, contribVocabs) {
        if (err)
          return res.render("500", {
            app_name_shorcut: app_name_shorcut,
            app_name: app_name,
          });
        Vocabulary.listPublishedPerAgent(
          req.agent._id,
          function (err, pubVocabs) {
            if (err)
              return res.render("500", {
                app_name_shorcut: app_name_shorcut,
                app_name: app_name,
              });

            /* prepare pie data*/
            var pieData = [
              [
                {
                  label: "Creator",
                  value: creatVocabs ? creatVocabs.length : 0,
                },
                {
                  label: "Contributor",
                  value: contribVocabs ? contribVocabs.length : 0,
                },
                {
                  label: "Publisher",
                  value: pubVocabs ? pubVocabs.length : 0,
                },
              ],
            ];

            /* prepare tags */
            var allVocabs = creatVocabs.concat(contribVocabs.concat(pubVocabs));
            var tags = [];
            if (allVocabs.length) {
              for (i = 0; i < allVocabs.length; i++) {
                if (allVocabs[i].tags) {
                  for (j = 0; j < allVocabs[i].tags.length; j++) {
                    if (tags.indexOf(allVocabs[i].tags[j]) < 0)
                      tags.push(allVocabs[i].tags[j]);
                  }
                }
              }
            }

            res.render("agents/show", {
              agent: req.agent,
              allVocabs: allVocabs,
              pieData: pieData,
              tags: tags,
              app_name_shorcut: app_name_shorcut,
              app_name: app_name,
            });
          }
        );
      }
    );
  });
};

/**
 * Agent List API
 */
exports.apiListAgents = function (req, res) {
  Agent.listAgents(function (err, agents) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    //store log in DB
    var log = new LogSearch({
      searchURL: req.originalUrl,
      date: new Date(),
      category: "agentList",
      method: "api",
      nbResults: agents.length,
    });
    log
      .save()
      .then(() => {
        return standardCallback(req, res, null, agents);
      })
      .catch((err) => {
        return standardCallback(req, res, err, agents);
      });
  });
};

/**
 * Agent Info API
 */
exports.apiInfoAgent = function (req, res) {
  if (!(req.query.agent != null))
    return res.send(500, "You must provide a value for 'agent' parameter");
  Agent.loadFromNameURIAltURI(req.query.agent, function (err, agent) {
    if (err) return res.send(500, err);
    //store log in DB
    var exists = agent ? 1 : 0;
    var log = new LogSearch({
      searchURL: req.originalUrl,
      date: new Date(),
      category: "agentInfo",
      method: "api",
      nbResults: exists,
    });
    log
      .save()
      .then(() => {
        return standardCallback(req, res, null, agent);
      })
      .catch((err) => {
        return standardCallback(req, res, err, agent);
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

exports.autoComplete = function (req, res) {
  var regex = new RegExp(req.query["q"], "i");
  var query = Agent.find(
    { $or: [{ name: regex }, { prefUri: regex }] },
    { name: 1, _id: 0 }
  )
    .sort({ name: 1 })
    .limit(10)
    .then((agents) => {
      res.send(
        agents,
        {
          "Content-Type": "application/json",
        },
        200
      );
    })
    .catch((err) => {
      res.send(
        JSON.stringify(err),
        {
          "Content-Type": "application/json",
        },
        404
      );
    });
};

exports.autoCompleteFull = function (req, res) {
  var regex = new RegExp(req.query["q"], "i");
  var query = Agent.find({ $or: [{ name: regex }, { prefUri: regex }] })
    .sort({ name: 1 })
    .limit(10)
    .then((agents) => {
      res.send(
        agents,
        {
          "Content-Type": "application/json",
        },
        200
      );
    })
    .catch((err) => {
      res.send(
        JSON.stringify(err),
        {
          "Content-Type": "application/json",
        },
        404
      );
    });
};
