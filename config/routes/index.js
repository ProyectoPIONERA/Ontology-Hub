var express = require("express");
var mongoose = require("mongoose");

var users = require("../../app/controllers/users"),
  vocabularies = require("../../app/controllers/vocabularies"),
  logs = require("../../app/controllers/logs"),
  versions = require("../../app/controllers/versions"),
  languages = require("../../app/controllers/languages"),
  tags = require("../../app/controllers/tags"),
  edition = require("../../app/controllers/edition"),
  agents = require("../../app/controllers/agents"),
  auth = require("../middlewares/authorization"),
  search = require("../../app/controllers/search"),
  searchMulti = require("../../app/controllers/searchMulti"),
  qa = require("../../app/controllers/qa"),
  bot = require("../../app/controllers/bot"),
  queryExamples = require("../../lib/queryExamples"),
  LogSparql = mongoose.model("LogSparql");

var http = require("http");
var negotiate = require("express-negotiate");
const multer = require("multer");
const upload = multer();
//var elasticsearch = require("@elastic/elasticsearch");
var elasticsearch = require("elasticsearch");
var fs = require("fs");
var nodemailer = require("nodemailer");

var env = process.env.NODE_ENV || "development";
var config = require("../config")[env];
var router = express.Router();

// Configure app name
agents.configureName(config.app_name, config.app_name_shorcut);
bot.configureName(config.app_name, config.app_name_shorcut);
edition.configureName(config.app_name, config.app_name_shorcut);
languages.configureName(config.app_name, config.app_name_shorcut);
logs.configureName(config.app_name, config.app_name_shorcut);
qa.configureName(config.app_name, config.app_name_shorcut);
search.configureName(config.app_name, config.app_name_shorcut);
searchMulti.configureName(config.app_name, config.app_name_shorcut);
tags.configureName(config.app_name, config.app_name_shorcut);
users.configureName(config.app_name, config.app_name_shorcut);
versions.configureName(config.app_name, config.app_name_shorcut);
vocabularies.configureName(config.app_name, config.app_name_shorcut);

/**
 * Connect to ElasticSearch
 */
/*
var esclient = new elasticsearch.Client({
  node: config.es.node,
  auth: {
    username: config.es.auth.username,
    password: config.es.auth.password,
  },
  tls: {
    ca: fs.readFileSync(config.es.cert),
    rejectUnauthorized: false,
  },
});
*/
var esclient = new elasticsearch.Client({
  host: config.es.host + ":" + config.es.port,
  log: "error", // Puedes usar: 'trace', 'debug', 'info', 'warning', 'error', 'silent'
});

/**
 * Bottstrap transporter for nodemailer
 */
var emailTransporter = nodemailer.createTransport(config.email);

/* ########### Edition ########### */
//root and authentication
router.get("/edition", function (req, res) {
  res.redirect("/edition/lov/");
});

router.get(
  "/edition/lov",
  auth.requiresLogin,
  edition.index
);

router.get(
  "/edition/lov/signup",
  auth.requiresAdmin,
  users.signup
);

router.get(
  "/edition/lov/login",
  users.login
);

router.get(
  "/edition/lov/logout",
  users.logout
);

router.post(
  "/edition/lov/users",
  users.create
);

//global actions
router.post(
  "/edition/lov/usersReview",
  auth.requiresLogin,
  edition.reviewUsersBatch
);

router.post(
  "/edition/lov/suggestTakeAction",
  auth.requiresLogin,
  edition.suggestTakeAction
);

router.post(
  "/edition/lov/suggestUpdateStatus",
  auth.requiresLogin,
  edition.suggestUpdateStatus
);

//users
router.get(
  "/edition/lov/users",
  auth.requiresAdmin,
  users.index
);

router.post(
  "/edition/lov/userChangeCategory",
  auth.requiresAdmin,
  users.userChangeCategory
);

router.delete(
  "/edition/lov/users/:userId",
  auth.requiresAdmin,
  users.destroy
);

router.get(
  "/edition/lov/users/:userId",
  auth.requiresAdminOrUser,
  users.edit
);

router.put(
  "/edition/lov/users/:userId",
  auth.requiresAdminOrUser,
  users.update
);

router.param("userId", users.load);

//tags
router.get(
  "/edition/lov/tags/new",
  auth.requiresAdmin,
  tags.new
);

router.post(
  "/edition/lov/tags",
  auth.requiresAdmin,
  tags.create
);

router.get(
  "/edition/lov/tags",
  auth.requiresAdmin,
  tags.index
);

router.delete(
  "/edition/lov/tags/:tagId",
  auth.requiresAdmin,
  tags.destroy
);

router.get(
  "/edition/lov/tags/:tagId",
  auth.requiresAdmin,
  tags.edit
);

router.put(
  "/edition/lov/tags/:tagId",
  auth.requiresAdmin,
  tags.update
);

router.param("tagId", tags.load);

//agents
router.get(
  "/edition/lov/agents/new",
  auth.requiresLogin,
  agents.new
);

router.post(
  "/edition/lov/agents",
  auth.requiresLogin,
  agents.create
);

router.post(
  "/edition/lov/agents/creationOnTheFly",
  auth.requiresLogin,
  agents.createOnTheFly
);

router.get(
  "/edition/lov/agents/:agentId",
  auth.requiresLogin,
  agents.edit
);

router.put(
  "/edition/lov/agents/:agentId",
  auth.requiresLogin,
  agents.update
);

router.delete(
  "/edition/lov/agents/:agentId",
  auth.requiresLogin,
  agents.destroy
);

router.param("agentId", agents.load);

//vocabs
router.post(
  "/edition/lov/vocabs/new",
  auth.requiresLogin,
  (req, res) => {
    vocabularies.new(req, res, config.scripts);
  }
);

//create the vocab
router.get(
  "/edition/lov/vocabs/:vocabPxEdition",
  auth.requiresLogin,
  (req, res) => {
    vocabularies.edit(req, res, config.scripts);
  }
);

router.post(
  "/edition/lov/vocabs",
  auth.requiresLogin,
  (req, res) => {
    vocabularies.create(
      req,
      res,
      config.scripts,
      config.lov,
      config.patterns,
      config.python_patterns
    );
  }
);

//save initial metadata + version
router.put(
  "/edition/lov/vocabs/:vocabPxEdition",
  auth.requiresLogin,
  vocabularies.update
);

//versions
router.get(
  "/edition/lov/vocabs/:vocabPxEdition/versions",
  auth.requiresLogin,
  versions.list
);

router.delete(
  "/edition/lov/vocabs/:vocabPxEdition/versions",
  auth.requiresLogin,
  versions.remove
);

router.post(
  "/edition/lov/vocabs/:vocabPxEdition/versions/review",
  auth.requiresLogin,
  versions.changeStatusReviewed
);

router.post(
  "/edition/lov/vocabs/:vocabPxEdition/versions/reviewAll",
  auth.requiresLogin,
  versions.changeStatusReviewedAll
);

router.post(
  "/edition/lov/vocabs/:vocabPxEdition/versions/edit",
  auth.requiresLogin,
  (req, res) => {
    versions.edit(req, res, config.lov);
  }
);

router.post(
  "/edition/lov/vocabs/:vocabPxEdition/versions/new",
  upload.single("file"),
  auth.requiresLogin,
  (req, res) => {
    versions.new(
      req,
      res,
      config.scripts,
      config.lov,
      config.patterns,
      config.python_patterns
    );
  }
);

// agent
router.get("/dataset/lov/agents", function (req, res) {
  search.searchAgent(req, res, esclient);
});

router.get(
  "/dataset/lov/agents/:agentName",
  agents.show
);

router.param("agentName", agents.loadFromName);

// vocabs routes
router.get("/", function (req, res) {
  res.redirect("/dataset/lov/");
});

router.get("/dataset", function (req, res) {
  res.redirect("/dataset/lov/");
});

router.get(
  "/dataset/lov",
  vocabularies.index
);

router.get("/dataset/lov/patterns", function (req, res) {
  search.searchVocabularyPatterns(req, res, esclient);
});

router.get("/dataset/lov/vocabs", function (req, res) {
  search.searchVocabulary(req, res, esclient);
});

router.get(
  "/dataset/lov/vocabs/:vocabPx/versions/:date.n3",
  function (req, res) {
    res.set("Content-Type", "text/n3");
    res.download(
      require("path").resolve(
        __dirname +
          "/../../versions/" +
          req.vocab._id +
          "/" +
          req.vocab._id +
          "_" +
          req.params.date +
          ".n3"
      ),
      req.params.vocabPx + "_" + req.params.date + ".n3"
    );
  }
);

router.get(
  "/dataset/lov/vocabs/versions/:identifier/diagrams/:fileName.svg",
  function (req, res) {
    res.set("Content-Type", "text/n3");
    res.download(
      require("path").resolve(
        __dirname +
          "/../../versions/" +
          req.params.identifier +
          "/diagrams/" +
          req.params.fileName +
          ".svg"
      ),
      req.params.fileName + ".svg"
    );
    /*res.send(
      require("path").resolve(
        __dirname +
          "/../../versions/" +
          req.params.identifier+
          "/diagrams/" +
          req.params.fileName +
          ".svg"
      )
    );*/
  }
);

router.get("/dataset/lov/vocabs/:vocabPx", (req, res) => {
  vocabularies.show(req, res, config.lov);
});

router.get("/dataset/lov/details/vocabulary:vocabularyid", function (req, res) {
  var vocabularyId = req.param("vocabularyid");
  if (vocabularyId) {
    var prefix = vocabularyId.substring(1, vocabularyId.indexOf(".html"));
    res.redirect("/dataset/lov/vocabs/" + prefix);
  } else res.redirect("/dataset/lov/");
});

router.param("vocabPx", vocabularies.load);

router.param("vocabPxEdition", vocabularies.loadEdition);

// languages routes
router.get(
  "/dataset/lov/languages/:langIso639P3PCode",
  languages.show
);

router.param("langIso639P3PCode", languages.load);

router.get("/dataset/lov/about", function (req, res) {
  res.render("about", {
    app_name_shorcut: config.app_name_shorcut,
    app_name: config.app_name,
  });
});

// search
router.get("/dataset/lov/terms", function (req, res) {
  search.search(req, res, esclient);
});

router.get("/dataset/lov/searchMulti", function (req, res) {
  searchMulti.search(req, res, esclient);
});

router.get("/dataset/lov/qa", function (req, res) {
  qa.search(req, res);
});

//Bot
router.get("/dataset/lov/suggest", function (req, res) {
  bot.isInLOV(req, res, config.scripts);
});

router.post("/dataset/lov/suggest", function (req, res) {
  bot.submit(req, res, emailTransporter);
});

//APIs
router.get("/dataset/lov/context", function (req, res) {
  vocabularies.jsonLDListVocabs(req, res);
});

router.get("/dataset/lov/api/v2/term/suggest", function (req, res) {
  search.apiSuggestTerms(req, res, esclient);
});

router.get("/dataset/lov/api/v2/term/autocomplete", function (req, res) {
  search.apiAutocompleteTerms(req, res, esclient);
});

router.get("/dataset/lov/api/v2/autocomplete/terms", function (req, res) {
  search.apiAutocompleteTerms(req, res, esclient);
});

router.get("/dataset/lov/api/v2/term/autocompleteLabels", function (req, res) {
  //search.apiAutocompleteLabelsTerms(req, res, elasticsearchClient);
  search.apiAutocompleteLabelsTerms(req, res, esclient);
});

router.get("/dataset/lov/api/v2/term/searchScoreExplain", function (req, res) {
  search.apiSearchScoreExplain(req, res, esclient);
});

router.get("/dataset/lov/api/v2/term/search", function (req, res) {
  search.apiSearch(req, res, esclient);
});

router.get("/dataset/lov/api/v2/search", function (req, res) {
  search.apiSearch(req, res, esclient);
});

router.get("/dataset/lov/api/v2/searchMulti", function (req, res) {
  searchMulti.apiSearch(req, res, esclient);
});

router.get(
  "/dataset/lov/api/v2/agent/autocomplete",
  agents.autoComplete
);

router.get(
  "/dataset/lov/api/v2/agent/autocompleteFull",
  agents.autoCompleteFull
);

router.get("/dataset/lov/api/v2/agent/search", function (req, res) {
  search.apiSearchAgent(req, res, esclient);
});

router.get("/dataset/lov/api/v2/agent/list", function (req, res) {
  agents.apiListAgents(req, res);
});

router.get("/dataset/lov/api/v2/agent/info", function (req, res) {
  agents.apiInfoAgent(req, res);
});

router.get("/dataset/lov/api/v2/vocabulary/autocomplete", function (req, res) {
  search.apiAutocompleteVocabs(req, res, esclient);
});

router.get(
  "/dataset/lov/api/v2/autocomplete/vocabularies",
  function (req, res) {
    search.apiAutocompleteVocabs(req, res, esclient);
  }
);

router.get("/dataset/lov/api/v2/vocabulary/list", function (req, res) {
  vocabularies.apiListVocabs(req, res);
});

router.get("/dataset/lov/api/v2/vocabulary/search", function (req, res) {
  search.apiSearchVocabs(req, res, esclient);
});

router.get("/dataset/lov/api/v2/vocabulary/info", function (req, res) {
  vocabularies.apiInfoVocab(req, res);
});

//MOD API UPDATE
router.get("/dataset/lov/api/v2/vocabulary/distributions", function (req, res) {
  vocabularies.apiDistributionsVocab(req, res);
});

router.get(
  "/dataset/lov/api/v2/vocabulary/distributions_all",
  function (req, res) {
    vocabularies.apiAllDistributions(req, res);
  }
);

router.get(
  "/dataset/lov/api/v2/vocabulary/distributions/latest",
  function (req, res) {
    vocabularies.apiLatestDistribution(req, res);
  }
);

router.get(
  "/dataset/lov/api/v2/vocabulary/:artefactID/distributions/:distributionID",
  function (req, res) {
    vocabularies.apiDistributionDetails(req, res);
  }
);

router.get(
  "/dataset/lov/api/v2/vocabulary/:artefact/resources",
  function (req, res) {
    search.apiResources(req, res, esclient);
  }
);

router.get(
  "/dataset/lov/api/v2/vocabulary/:artefact/resources/:resource",
  function (req, res) {
    search.apiSingleResource(req, res, esclient);
  }
);

router.get(
  "/dataset/lov/api/v2/vocabulary/:vocab/resources/type/:type",
  function (req, res) {
    search.apiResourcesByType(req, res, esclient);
  }
);

router.get("/dataset/lov/api/v2/term/search/metadata", function (req, res) {
  search.apiSearchMetadata(req, res, esclient);
});

router.get("/dataset/lov/api/v2/vocabulary/prefix/exists", function (req, res) {
  vocabularies.apiPrefixExists(req, res);
});

router.get("/dataset/lov/api/v2/log/sparql", function (req, res) {
  logs.apiSPARQL(req, res);
});

router.get("/dataset/lov/api/v2/log/clickEvent", function (req, res) {
  logs.clickEvent(req, res);
});

router.get("/dataset/lov/api/v2/log/queryEvent", function (req, res) {
  logs.queryEvent(req, res);
});

router.get("/dataset/lov/api/v2/log/clickVocEvent", function (req, res) {
  logs.clickVocEvent(req, res);
});

router.get("/dataset/lov/api/v2/log/queryVocEvent", function (req, res) {
  logs.queryVocEvent(req, res);
});

router.get("/dataset/lov/api/v2/patterns", function (req, res) {
  vocabularies.detectPatterns(
    req,
    res,
    config.patterns,
    config.python_patterns
  );
});

router.get("/dataset/lov/api", function (req, res) {
  res.render("api", {
    lov: config.lov,
    app_name_shorcut: config.app_name_shorcut,
    app_name: config.app_name,
  });
});

router.get("/dataset/lov/api/v1", function (req, res) {
  res.render("api", {
    lov: config.lov,
    app_name_shorcut: config.app_name_shorcut,
    app_name: config.app_name,
  });
});

router.get("/dataset/lov/api/v2", function (req, res) {
  res.render("api", {
    lov: config.lov,
    app_name_shorcut: config.app_name_shorcut,
    app_name: config.app_name,
  });
});

router.get("/dataset/lov/apidoc", function (req, res) {
  res.render("api", {
    lov: config.lov,
    app_name_shorcut: config.app_name_shorcut,
    app_name: config.app_name,
  });
});

/* Vocommons */
router.get("/vocommons", function (req, res) {
  res.redirect("/vocommons/voaf/");
});

router.get("/vocommons/voaf", function (req, res, next) {
  req.negotiate({
    "application/rdf+xml": function () {
      res.set("Content-Type", "application/rdf+xml");
      res.download(
        require("path").resolve(
          __dirname + "/../vocommons/voaf/v2.3/voaf_v2.3.rdf"
        )
      );
    },
    "html,default": function () {
      res.redirect("/vocommons/voaf/v2.3/");
    },
  });
});

router.get("/endpoint/lov", function (req, res) {
  res.redirect("/dataset/lov/sparql");
});

router.get("/dataset/lov/sparql", function (req, res, next) {
  //TODO log SPARQL Queries using the logSearch object ??

  req.negotiate({
    "application/sparql-results+json,application/sparql-results+xml,text/tab-separated-values,text/csv,application/json,application/xml":
      function () {
        executeSPARQLQuery(
          res,
          req.headers,
          req.query.query,
          req.query["default-graph-uri"],
          req.query["named-graph-uri"]
        );
      },
    html: function () {
      res.render("endpoint/index", {
        queryExamples: queryExamples,
        lov: config.lov,
        app_name_shorcut: config.app_name_shorcut,
        app_name: config.app_name,
      });
    },
    default: function () {
      executeSPARQLQuery(
        res,
        req.headers,
        req.query.query,
        req.query["default-graph-uri"],
        req.query["named-graph-uri"]
      );
    },
  });
});

router.post("/dataset/lov/sparql", function (req, res, next) {
  executeSPARQLQuery(
    res,
    req.headers,
    req.body.query,
    req.body["default-graph-uri"],
    req.body["named-graph-uri"]
  );
});

function executeSPARQLQuery(
  res,
  headers,
  query,
  defaultGraphUri,
  namedGraphUri
) {
  var sparqlExecTime = Date.now();
  path = "/lov/sparql?query=" + encodeURIComponent(query);
  if (defaultGraphUri)
    path += "&default-graph-uri=" + encodeURIComponent(defaultGraphUri);
  if (namedGraphUri)
    path += "&named-graph-uri=" + encodeURIComponent(namedGraphUri);
  delete headers["content-length"];
  delete headers["cookie"];
  var options = {
    hostname: "localhost",
    port: 3030,
    path: path,
    headers: headers,
  };
  http.get(options, function (response) {
    var bodyChunks = [];
    response.on("data", function (d) {
      bodyChunks.push(d);
    }); // Continuously update stream with data
    response.on("end", function () {
      var body = Buffer.concat(bodyChunks);
      var duration = Date.now() - sparqlExecTime;
      var log = new LogSparql({
        query: encodeURIComponent(query),
        date: new Date(),
        execTime: duration,
        nbResults: 0,
      });
      log
        .save()
        .then(() => {
          console.log("guardado");
        })
        .catch((err) => {
          console.log(err);
        });
      res.set(response.headers);
      res.send(200, body);
    });
  });
}

module.exports = router;
