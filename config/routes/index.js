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
var https = require("https");
var urlLib = require("url");
var negotiate = require("express-negotiate");
const multer = require("multer");
const upload = multer();
var elasticsearch = require("@elastic/elasticsearch");
//var elasticsearch = require("elasticsearch");
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
    node: `http://${config.es.host}:${config.es.port}`,
    auth: {
        username: config.es.user,
        password: config.es.pass
    },
    tls: { rejectUnauthorized: false }, // Muy importante en Docker
    log: "error"
});

/**
 * Bottstrap transporter for nodemailer
 */
var emailTransporter = nodemailer.createTransport(config.email);

/* ########### Edition ########### */
//root and authentication
/*router.get("/edition", function (req, res) {
  res.redirect("/edition");
});*/

router.get(
  "/edition",
  auth.requiresLogin,
  edition.index
);

router.get(
  "/edition/signup",
  auth.requiresAdmin,
  users.signup
);

router.get(
  "/edition/login",
  users.login
);

router.get(
  "/edition/logout",
  users.logout
);

router.post(
  "/edition/users",
  users.create
);

//global actions
router.post(
  "/edition/usersReview",
  auth.requiresLogin,
  edition.reviewUsersBatch
);

router.post(
  "/edition/suggestTakeAction",
  auth.requiresLogin,
  edition.suggestTakeAction
);

router.post(
  "/edition/suggestUpdateStatus",
  auth.requiresLogin,
  edition.suggestUpdateStatus
);

//users
router.get(
  "/edition/users",
  auth.requiresAdmin,
  users.index
);

router.post(
  "/edition/userChangeCategory",
  auth.requiresAdmin,
  users.userChangeCategory
);

router.delete(
  "/edition/users/:userId",
  auth.requiresAdmin,
  users.destroy
);

router.get(
  "/edition/users/:userId",
  auth.requiresAdminOrUser,
  users.edit
);

router.put(
  "/edition/users/:userId",
  auth.requiresAdminOrUser,
  users.update
);

router.param("userId", users.load);

//tags
router.get(
  "/edition/tags/new",
  auth.requiresAdmin,
  tags.new
);

router.post(
  "/edition/tags",
  auth.requiresAdmin,
  tags.create
);

router.get(
  "/edition/tags",
  auth.requiresAdmin,
  tags.index
);

router.delete(
  "/edition/tags/:tagId",
  auth.requiresAdmin,
  tags.destroy
);

router.get(
  "/edition/tags/:tagId",
  auth.requiresAdmin,
  tags.edit
);

router.put(
  "/edition/tags/:tagId",
  auth.requiresAdmin,
  tags.update
);

router.param("tagId", tags.load);

//agents
router.get(
  "/edition/agents/new",
  auth.requiresLogin,
  agents.new
);

router.post(
  "/edition/agents",
  auth.requiresLogin,
  agents.create
);

router.post(
  "/edition/agents/creationOnTheFly",
  auth.requiresLogin,
  agents.createOnTheFly
);

router.get(
  "/edition/agents/:agentId",
  auth.requiresLogin,
  agents.edit
);

router.put(
  "/edition/agents/:agentId",
  auth.requiresLogin,
  agents.update
);

router.delete(
  "/edition/agents/:agentId",
  auth.requiresLogin,
  agents.destroy
);

router.param("agentId", agents.load);

//vocabs
router.post(
  "/edition/vocabs/new",
  auth.requiresLogin,
  (req, res) => {
    vocabularies.new(req, res, config.scripts);
  }
);

router.post(
  "/edition/vocabs/new/repository",
  auth.requiresLogin,
  (req, res) => {
    vocabularies.newRepository(req, res, config.scripts);
  }
);

//create the vocab
router.get(
  "/edition/vocabs/:vocabPxEdition",
  auth.requiresLogin,
  (req, res) => {
    vocabularies.edit(req, res, config.scripts);
  }
);

router.post(
  "/edition/vocabs",
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
  "/edition/vocabs/:vocabPxEdition",
  auth.requiresLogin,
  vocabularies.update
);

router.delete(
  "/edition/vocabs/:vocabPxEdition",
  auth.requiresLogin,
  vocabularies.destroy
);


//versions
router.get(
  "/edition/vocabs/:vocabPxEdition/versions",
  auth.requiresLogin,
  versions.list
);

router.delete(
  "/edition/vocabs/:vocabPxEdition/versions",
  auth.requiresLogin,
  versions.remove
);

router.post(
  "/edition/vocabs/:vocabPxEdition/versions/review",
  auth.requiresLogin,
  versions.changeStatusReviewed
);

router.post(
  "/edition/vocabs/:vocabPxEdition/versions/reviewAll",
  auth.requiresLogin,
  versions.changeStatusReviewedAll
);

router.post(
  "/edition/vocabs/:vocabPxEdition/versions/edit",
  auth.requiresLogin,
  (req, res) => {
    versions.edit(req, res, config.lov);
  }
);

router.post(
  "/edition/vocabs/:vocabPxEdition/versions/new",
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
router.get("/dataset/agents", function (req, res) {
  search.searchAgent(req, res, esclient);
});

router.get(
  "/dataset/agents/:agentName",
  agents.show
);

router.param("agentName", agents.loadFromName);

// vocabs routes
router.get("/", function (req, res) {
  res.redirect("/dataset");
});

router.get(
  "/dataset",
  vocabularies.index
);

router.get("/dataset/patterns", function (req, res) {
  search.searchVocabularyPatterns(req, res, esclient);
});

router.get("/dataset/vocabs", function (req, res) {
  search.searchVocabulary(req, res, esclient);
});

router.get(
  "/dataset/vocabs/:vocabPx/versions/:date.n3",
  function (req, res, next) {
    res.set("Content-Type", "text/n3");
    const filePath = require("path").resolve(
      __dirname +
        "/../../versions/" +
        req.vocab._id +
        "/" +
        req.vocab._id +
        "_" +
        req.params.date +
        ".n3"
    );
    res.download(
      filePath,
      req.params.vocabPx + "_" + req.params.date + ".n3",
      function (err) {
        if (!err) return;
        if (err.code === "ENOENT" || err.status === 404 || err.statusCode === 404) {
          return res.status(404).send("Version file not found");
        }
        return next(err);
      }
    );
  }
);

router.get(
  "/dataset/vocabs/versions/:identifier/diagrams/:fileName.svg",
  function (req, res, next) {
    res.set("Content-Type", "text/n3");
    const filePath = require("path").resolve(
      __dirname +
        "/../../versions/" +
        req.params.identifier +
        "/diagrams/" +
        req.params.fileName +
        ".svg"
    );
    res.download(filePath, req.params.fileName + ".svg", function (err) {
      if (!err) return;
      if (err.code === "ENOENT" || err.status === 404 || err.statusCode === 404) {
        return res.status(404).send("Diagram file not found");
      }
      return next(err);
    });
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

router.get("/dataset/vocabs/:vocabPx/artifacts/:type/:fileName", function (req, res) {
  const allowedTypes = ["requirements", "conceptualization", "shapes", "examples", "tests"];
  const type = req.params.type;
  
  if (!allowedTypes.includes(type)) {
    return res.status(400).send("Invalid artifact type");
  }

  const vocabId = req.vocab && req.vocab._id ? String(req.vocab._id) : null;
  if (!vocabId) return res.status(404).send("Vocabulary not found");

  const fileName = req.params.fileName;

  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return res.status(400).send("Invalid file name");
  }

  const filePath = path.resolve(__dirname, "..", "..", "versions", vocabId, type, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Artifact not found");
  }

  const forceDownload = String(req.query.download || "") === "1";
  if(forceDownload){
    return res.download(filePath, fileName);
  }
  //just view
  res.setHeader("Content-Disposition", 'inline; filename="${fileName}"');
  res.setHeader("X-Content-Type_options", "nosniff");
  res.type(path.extname(fileName));

  return res.sendFile(filePath);
  
  
});

router.get("/dataset/vocabs/:vocabPx", (req, res) => {
  vocabularies.show(req, res, config.lov);
});

router.get("/dataset/details/vocabulary:vocabularyid", function (req, res) {
  var vocabularyId = req.param("vocabularyid");
  if (vocabularyId) {
    var prefix = vocabularyId.substring(1, vocabularyId.indexOf(".html"));
    res.redirect("/dataset/vocabs/" + prefix);
  } else res.redirect("/dataset/");
});

router.param("vocabPx", vocabularies.load);

router.param("vocabPxEdition", vocabularies.loadEdition);

// languages routes
router.get(
  "/dataset/languages/:langIso639P3PCode",
  languages.show
);

router.param("langIso639P3PCode", languages.load);

router.get("/dataset/about", function (req, res) {
  res.render("about", {
    app_name_shorcut: config.app_name_shorcut,
    app_name: config.app_name,
  });
});

router.get("/dataset/how-to", function(req, res){
  res.render('howto/index', { title: 'Home Page', message: 'Hello from Pug!' });
});

// search
router.get("/dataset/terms", function (req, res) {
  search.search(req, res, esclient);
});

router.get("/dataset/searchMulti", function (req, res) {
  searchMulti.search(req, res, esclient);
});

router.get("/dataset/qa", function (req, res) {
  qa.search(req, res);
});

//Bot
router.get("/dataset/suggest", function (req, res) {
  bot.isInLOV(req, res, config.scripts);
});

router.post("/dataset/suggest", function (req, res) {
  bot.submit(req, res, emailTransporter);
});

//APIs
router.get("/dataset/context", function (req, res) {
  vocabularies.jsonLDListVocabs(req, res);
});

router.get("/dataset/api/v2/term/suggest", function (req, res) {
  search.apiSuggestTerms(req, res, esclient);
});

router.get("/dataset/api/v2/term/autocomplete", function (req, res) {
  search.apiAutocompleteTerms(req, res, esclient);
});

router.get("/dataset/api/v2/autocomplete/terms", function (req, res) {
  search.apiAutocompleteTerms(req, res, esclient);
});

router.get("/dataset/api/v2/term/autocompleteLabels", function (req, res) {
  //search.apiAutocompleteLabelsTerms(req, res, elasticsearchClient);
  search.apiAutocompleteLabelsTerms(req, res, esclient);
});

router.get("/dataset/api/v2/term/searchScoreExplain", function (req, res) {
  search.apiSearchScoreExplain(req, res, esclient);
});

router.get("/dataset/api/v2/term/search", function (req, res) {
  search.apiSearch(req, res, esclient);
});

router.get("/dataset/api/v2/search", function (req, res) {
  search.apiSearch(req, res, esclient);
});

router.get("/dataset/api/v2/searchMulti", function (req, res) {
  searchMulti.apiSearch(req, res, esclient);
});

router.get(
  "/dataset/api/v2/agent/autocomplete",
  agents.autoComplete
);

router.get(
  "/dataset/api/v2/agent/autocompleteFull",
  agents.autoCompleteFull
);

router.get("/dataset/api/v2/agent/search", function (req, res) {
  search.apiSearchAgent(req, res, esclient);
});

router.get("/dataset/api/v2/agent/list", function (req, res) {
  agents.apiListAgents(req, res);
});

router.get("/dataset/api/v2/agent/info", function (req, res) {
  agents.apiInfoAgent(req, res);
});

router.get("/dataset/api/v2/vocabulary/autocomplete", function (req, res) {
  search.apiAutocompleteVocabs(req, res, esclient);
});

router.get(
  "/dataset/api/v2/autocomplete/vocabularies",
  function (req, res) {
    search.apiAutocompleteVocabs(req, res, esclient);
  }
);

router.get("/dataset/api/v2/vocabulary/list", function (req, res) {
  vocabularies.apiListVocabs(req, res);
});

router.get("/dataset/api/v2/vocabulary/search", function (req, res) {
  search.apiSearchVocabs(req, res, esclient);
});

router.get("/dataset/api/v2/vocabulary/info", function (req, res) {
  vocabularies.apiInfoVocab(req, res);
});

//MOD API UPDATE
router.get("/dataset/api/v2/vocabulary/distributions", function (req, res) {
  vocabularies.apiDistributionsVocab(req, res);
});

router.get(
  "/dataset/api/v2/vocabulary/distributions_all",
  function (req, res) {
    vocabularies.apiAllDistributions(req, res);
  }
);

router.get(
  "/dataset/api/v2/vocabulary/distributions/latest",
  function (req, res) {
    vocabularies.apiLatestDistribution(req, res);
  }
);

router.get(
  "/dataset/api/v2/vocabulary/:artefactID/distributions/:distributionID",
  function (req, res) {
    vocabularies.apiDistributionDetails(req, res);
  }
);

router.get(
  "/dataset/api/v2/vocabulary/:artefact/resources",
  function (req, res) {
    search.apiResources(req, res, esclient);
  }
);

router.get(
  "/dataset/api/v2/vocabulary/:artefact/resources/:resource",
  function (req, res) {
    search.apiSingleResource(req, res, esclient);
  }
);

router.get(
  "/dataset/api/v2/vocabulary/:vocab/resources/type/:type",
  function (req, res) {
    search.apiResourcesByType(req, res, esclient);
  }
);

router.get("/dataset/api/v2/term/search/metadata", function (req, res) {
  search.apiSearchMetadata(req, res, esclient);
});

router.get("/dataset/api/v2/vocabulary/prefix/exists", function (req, res) {
  vocabularies.apiPrefixExists(req, res);
});

router.get("/dataset/api/v2/log/sparql", function (req, res) {
  logs.apiSPARQL(req, res);
});

router.get("/dataset/api/v2/log/clickEvent", function (req, res) {
  logs.clickEvent(req, res);
});

router.get("/dataset/api/v2/log/queryEvent", function (req, res) {
  logs.queryEvent(req, res);
});

router.get("/dataset/api/v2/log/clickVocEvent", function (req, res) {
  logs.clickVocEvent(req, res);
});

router.get("/dataset/api/v2/log/queryVocEvent", function (req, res) {
  logs.queryVocEvent(req, res);
});

function callAstreaUpStream(target, cb) {
  var payload = JSON.stringify({ ontologies: [target] });
  var options = {
    hostname: "astrea.linkeddata.es",
    path: "/api/shacl/url",
    method: "POST",
    headers: {
      Accept: "text/rdf+turtle,text/plain,*/*",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
    timeout: 20000,
  };

  var proxyReq = https.request(options, function (proxyRes) {
    var chunks = [];
    proxyRes.on("data", function (c) {
      chunks.push(c);
    });
    proxyRes.on("end", function () {
      var body = Buffer.concat(chunks).toString("utf8");
      cb(null, proxyRes.statusCode || 500, body);
    });
  });

  proxyReq.on("timeout", function () {
    proxyReq.destroy(new Error("Astrea timeout"));
  });
  proxyReq.on("error", function (err) {
    cb(err);
  });
  proxyReq.write(payload);
  proxyReq.end();
}

function callAstreaUpStreamByFile(sourceText, cb) {
  var boundary = "----AstreaBoundary" + Date.now();
  var fileHeader =
    "--" +
    boundary +
    "\r\n" +
    'Content-Disposition: form-data; name="file"; filename="ontology.ttl"\r\n' +
    "Content-Type: text/turtle\r\n\r\n";
  var formatPart =
    "\r\n--" +
    boundary +
    '\r\nContent-Disposition: form-data; name="format"\r\n\r\nTurtle';
  var fileFooter = "\r\n--" + boundary + "--\r\n";
  var payload = Buffer.from(
    fileHeader + String(sourceText || "") + formatPart + fileFooter,
    "utf8"
  );

  var options = {
    hostname: "astrea.linkeddata.es",
    path: "/api/shacl/file",
    method: "POST",
    headers: {
      Accept: "text/rdf+turtle,text/plain,*/*",
      "Content-Type": "multipart/form-data; boundary=" + boundary,
      "Content-Length": payload.length,
    },
    timeout: 20000,
  };

  var proxyReq = https.request(options, function (proxyRes) {
    var chunks = [];
    proxyRes.on("data", function (c) {
      chunks.push(c);
    });
    proxyRes.on("end", function () {
      var body = Buffer.concat(chunks).toString("utf8");
      cb(null, proxyRes.statusCode || 500, body);
    });
  });

  proxyReq.on("timeout", function () {
    proxyReq.destroy(new Error("Astrea timeout"));
  });

  proxyReq.on("error", function (err) {
    cb(err);
  });

  proxyReq.write(payload);
  proxyReq.end();
}

function fetchTextFromUrlNoRedirect(targetUrl, callback) {
  var parsed = urlLib.parse(targetUrl);
  var client = parsed.protocol === "https:" ? https : http;

  var reqOptions = {
    hostname: parsed.hostname,
    port: parsed.port,
    path: parsed.path,
    method: "GET",
    timeout: 20000,
    headers: {
      Accept: "text/turtle,text/rdf+turtle,text/plain,*/*;q=0.8",
    },
  };

  var req = client.request(reqOptions, function (resp) {
    var chunks = [];
    resp.on("data", function (c) {
      chunks.push(c);
    });
    resp.on("end", function () {
      var body = Buffer.concat(chunks).toString("utf8");
      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        return callback(null, body);
      }
      return callback(new Error("Source fetch failed with status " + resp.statusCode));
    });
  });

  req.on("timeout", function () {
    req.destroy(new Error("Source fetch timeout"));
  });

  req.on("error", function (err) {
    callback(err);
  });

  req.end();
}


router.get("/dataset/api/v2/validators/astrea", function (req, res) {
  var uri = req.query && req.query.uri ? String(req.query.uri).trim() : "";
  var sourceUrlRaw =
    req.query && req.query.sourceUrl ? String(req.query.sourceUrl).trim() : "";
  var sourceUrl = resolveSourceUrl(req, sourceUrlRaw);
  if (!uri && !sourceUrl) {
    return res.status(400).send("Missing required query param: uri or sourceUrl");
  }

  function doneIfOk(status, body) {
    if (status >= 200 && status < 300 && body && body.trim()) {
      res.set("Content-Type", "text/turtle; charset=utf-8");
      res.status(200).send(body);
      return true;
    }
    return false;
  }

  function trysource() {
    if (!sourceUrl)
      return res.status(502).send("Astrea failed with uri and no sourceUrl provided");

    fetchTextFromUrlNoRedirect(sourceUrl, function (fetchErr, sourceText) {
      if (fetchErr) {
        return res.status(502).send(fetchErr.message || "Failed to fetch source ontology");
      }

      callAstreaUpStreamByFile(sourceText, function (err2, status2, body2) {
        if (err2) {
          return res.status(502).send(err2.message || "Astrea proxy request failed");
        }
        if (doneIfOk(status2, body2)) return;
        return res.status(status2 || 502).send(body2 || "Astrea upstream error");
      });
    });
  }

  if (uri) {
    callAstreaUpStream(uri, function (err, status, body) {
      if (err) return trysource();
      if (doneIfOk(status, body)) return;
      return trysource();
    });
  } else {
    trysource();
  }
});

function resolveSourceUrl(req, sourceUrl) {
  var clean = sourceUrl ? String(sourceUrl).trim() : "";
  if (!clean) {
    return "";
  }
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }
  if (clean.charAt(0) !== "/") {
    clean = "/" + clean;
  }
  return req.protocol + "://" + req.get("host") + clean;
}

function fetchTextFromUrl(targetUrl, callback, redirectsLeft) {
  var redirects = typeof redirectsLeft === "number" ? redirectsLeft : 3;
  var parsed = urlLib.parse(targetUrl);
  var client = parsed.protocol === "https:" ? https : http;
  var reqOptions = {
    hostname: parsed.hostname,
    port: parsed.port,
    path: parsed.path,
    method: "GET",
    timeout: 20000,
    headers: {
      Accept: "text/plain,text/turtle,text/rdf+turtle,*/*;q=0.8",
    },
  };

  var sourceReq = client.request(reqOptions, function (sourceRes) {
    if (
      sourceRes.statusCode >= 300 &&
      sourceRes.statusCode < 400 &&
      sourceRes.headers &&
      sourceRes.headers.location &&
      redirects > 0
    ) {
      return fetchTextFromUrl(
        urlLib.resolve(targetUrl, sourceRes.headers.location),
        callback,
        redirects - 1
      );
    }

    var chunks = [];
    sourceRes.on("data", function (chunk) {
      chunks.push(chunk);
    });
    sourceRes.on("end", function () {
      var body = Buffer.concat(chunks).toString("utf8");
      if (sourceRes.statusCode >= 200 && sourceRes.statusCode < 300) {
        return callback(null, body);
      }
      return callback(
        new Error("Source fetch failed with status " + sourceRes.statusCode)
      );
    });
  });

  sourceReq.on("timeout", function () {
    sourceReq.destroy(new Error("Source fetch timeout"));
  });

  sourceReq.on("error", function (err) {
    callback(err);
  });

  sourceReq.end();
}

function proxyThemisExample(sourceText, res) {
  var body = sourceText ? String(sourceText) : "";
  if (!body) {
    return res.status(400).send("Missing ontology source content");
  }

  var options = {
    hostname: "themis.linkeddata.es",
    path: "/rest/api/example",
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "text/plain",
      "Content-Length": Buffer.byteLength(body),
    },
    timeout: 20000,
  };

  var proxyReq = http.request(options, function (proxyRes) {
    var chunks = [];
    proxyRes.on("data", function (chunk) {
      chunks.push(chunk);
    });
    proxyRes.on("end", function () {
      var resp = Buffer.concat(chunks).toString("utf8");
      if (proxyRes.statusCode >= 200 && proxyRes.statusCode < 300) {
        res.set("Content-Type", "text/plain; charset=utf-8");
        return res.status(200).send(resp);
      }
      return res.status(proxyRes.statusCode || 502).send(resp || "Themis upstream error");
    });
  });

  proxyReq.on("timeout", function () {
    proxyReq.destroy(new Error("Themis timeout"));
  });

  proxyReq.on("error", function (err) {
    var msg = err && err.message ? err.message : "Themis proxy request failed";
    return res.status(502).send(msg);
  });

  proxyReq.write(body);
  proxyReq.end();
}

function callThemisResultsUpstream(ontologyInput, testfile, cb, ontologyCode) {
  var ontologyValue = String(ontologyInput || "").trim();
  var payloadObj = {};
  if (ontologyValue) {
    payloadObj.ontologies = [ontologyValue];
  }
  if (ontologyCode && String(ontologyCode).trim()) {
    payloadObj.ontologiesCode = [String(ontologyCode)];
  }
  if (testfile) {
    var normalizedTestfile = normalizeThemisTestfile(testfile);
    if (normalizedTestfile) {
      payloadObj.testfile = normalizedTestfile;
    }
  }

  var payload = JSON.stringify(payloadObj);
  var options = {
    hostname: "themis.linkeddata.es",
    path: "/rest/api/results",
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
    timeout: 20000,
  };

  var proxyReq = http.request(options, function (proxyRes) {
    var chunks = [];
    proxyRes.on("data", function (chunk) {
      chunks.push(chunk);
    });
    proxyRes.on("end", function () {
      var body = Buffer.concat(chunks).toString("utf8");
      cb(null, proxyRes.statusCode || 500, body);
    });
  });

  proxyReq.on("timeout", function () {
    proxyReq.destroy(new Error("Themis timeout"));
  });

  proxyReq.on("error", function (err) {
    cb(err);
  });

  proxyReq.write(payload);
  proxyReq.end();
}

function sendThemisResultsResponse(res, status, body) {
  if (status >= 200 && status < 300) {
    res.set("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(body);
  }
  var upstreamStatus = status || 502;
  var upstreamBody = body && body.trim()
    ? body
    : "Themis upstream error (status " + upstreamStatus + ")";
  return res.status(upstreamStatus).send(upstreamBody);
}

function runThemisResultsWithFallback(uri, testfile, sourceUrl, req, res) {
  if (!uri) {
    return res.status(400).send("Missing required param: uri");
  }

  return callThemisResultsUpstream(uri, testfile, function (err, status, body) {
    if (!err && status >= 200 && status < 300 && body && body.trim()) {
      return sendThemisResultsResponse(res, status, body);
    }

    if (!sourceUrl) {
      if (err) {
        var msg = err && err.message ? err.message : "Themis proxy request failed";
        return res.status(502).send(msg);
      }
      return sendThemisResultsResponse(res, status, body);
    }

    var targetUrl = resolveSourceUrl(req, sourceUrl);
    return fetchTextFromUrlNoRedirect(targetUrl, function (fetchErr, sourceText) {
      if (fetchErr) {
        if (err) {
          return res.status(502).send(err.message || "Themis proxy request failed");
        }
        return sendThemisResultsResponse(res, status, body);
      }

      return callThemisResultsUpstream("", testfile, function (err2, status2, body2) {
        if (err2) {
          return res.status(502).send(err2.message || "Themis proxy request failed");
        }
        return sendThemisResultsResponse(res, status2, body2);
      }, sourceText);
    });
  });
}

function normalizeThemisTestfile(raw) {
  if (raw === null || typeof raw === "undefined") {
    return "";
  }

  if (typeof raw === "object") {
    if (typeof raw.testfile === "string") {
      return raw.testfile;
    }
    if (typeof raw.tests === "string") {
      return raw.tests;
    }
    return JSON.stringify(raw);
  }

  var text = String(raw);
  var trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.charAt(0) === "{" || trimmed.charAt(0) === "[") {
    try {
      var parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.testfile === "string") {
          return parsed.testfile;
        }
        if (typeof parsed.tests === "string") {
          return parsed.tests;
        }
        if (typeof parsed.example === "string") {
          return parsed.example;
        }
      }
    } catch (e) {}
  }

  return text;
}

router.post("/dataset/api/v2/validators/themis/example", function (req, res) {
  var sourceText = req.body && req.body.sourceText ? String(req.body.sourceText) : "";
  var sourceUrl = req.body && req.body.sourceUrl ? String(req.body.sourceUrl) : "";

  if (sourceText) {
    return proxyThemisExample(sourceText, res);
  }
  if (!sourceUrl) {
    return res.status(400).send("Missing required body param: sourceUrl or sourceText");
  }

  var targetUrl = resolveSourceUrl(req, sourceUrl);
  return fetchTextFromUrl(targetUrl, function (err, text) {
    if (err) {
      return res.status(502).send(err.message || "Failed to fetch ontology source");
    }
    return proxyThemisExample(text, res);
  });
});

router.get("/dataset/api/v2/validators/themis", function (req, res) {
  var uri = req.query && req.query.uri ? String(req.query.uri).trim() : "";
  var sourceUrl = req.query && req.query.sourceUrl ? String(req.query.sourceUrl).trim() : "";
  var testfile = req.query && req.query.testfile ? String(req.query.testfile) : "";
  if (!uri) {
    return res.status(400).send("Missing required query param: uri");
  }
  return runThemisResultsWithFallback(uri, testfile, sourceUrl, req, res);
});

router.post("/dataset/api/v2/validators/themis", function (req, res) {
  var uri = req.body && req.body.uri ? String(req.body.uri).trim() : "";
  var sourceUrl = req.body && req.body.sourceUrl ? String(req.body.sourceUrl).trim() : "";
  var testfile = req.body && (req.body.tests || req.body.testfile)
    ? String(req.body.tests || req.body.testfile)
    : "";
  if (!uri) {
    return res.status(400).send("Missing required body param: uri");
  }
  return runThemisResultsWithFallback(uri, testfile, sourceUrl, req, res);
});


router.get("/dataset/api/v2/patterns", function (req, res) {
  vocabularies.detectPatterns(
    req,
    res,
    config.patterns,
    config.python_patterns
  );
});

router.get("/dataset/api", function (req, res) {
  res.render("api", {
    lov: config.lov,
    app_name_shorcut: config.app_name_shorcut,
    app_name: config.app_name,
  });
});

router.get("/dataset/api/v1", function (req, res) {
  res.render("api", {
    lov: config.lov,
    app_name_shorcut: config.app_name_shorcut,
    app_name: config.app_name,
  });
});

router.get("/dataset/api/v2", function (req, res) {
  res.render("api", {
    lov: config.lov,
    app_name_shorcut: config.app_name_shorcut,
    app_name: config.app_name,
  });
});


router.get("/dataset/api/v2/home", vocabularies.indexjson);

router.get("/dataset/apidoc", function (req, res) {
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

router.get("/endpoint", function (req, res) {
  res.redirect("/dataset/sparql");
});

router.get("/dataset/sparql", function (req, res, next) {
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

router.post("/dataset/sparql", function (req, res, next) {
  executeSPARQLQuery(
    res,
    req.headers,
    req.body.query,
    req.body["default-graph-uri"],
    req.body["named-graph-uri"]
  );
});


const { spawn } = require('child_process');
const path = require('path');
const { hostname } = require("os");


router.post('/edition/indexAll', auth.requiresLogin, auth.requiresAdmin, (req, res) => {

  const repoDir = '/app';
  const scriptPath = path.join(repoDir, 'setup', 'lovInitialization.sh');

  const cmd = `cd "${path.join(repoDir, 'setup')}" && bash "${scriptPath}"`; //>> "${logPath}" 2>&1`;

  const child = spawn('bash', ['-lc', cmd], {
    env: process.env,
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore'],
  });

  child.on('error', (err) => {
    console.error('[IndexAll] spawn error:', err);
  });

  child.unref();

  return res.redirect('/edition');
});

function executeSPARQLQuery(
  res,
  headers,
  query,
  defaultGraphUri,
  namedGraphUri
) {
  if (!query) {
    return res.status(400).send("Missing required parameter: query");
  }

  var sparqlExecTime = Date.now();
  let sparqlPath = "/lov/sparql?query=" + encodeURIComponent(query);
  if (defaultGraphUri)
    sparqlPath += "&default-graph-uri=" + encodeURIComponent(defaultGraphUri);
  if (namedGraphUri)
    sparqlPath += "&named-graph-uri=" + encodeURIComponent(namedGraphUri);
  delete headers["content-length"];
  delete headers["cookie"];
  var options = {
    hostname: "localhost",
    port: 3030,
    path: sparqlPath,
    headers: headers,
  };
  var proxyReq = http.get(options, function (response) {
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
      res.status(response.statusCode || 200).send(body);
    });
  });

  proxyReq.setTimeout(10000, function () {
    proxyReq.destroy(new Error("SPARQL backend timeout"));
  });

  proxyReq.on("error", function (err) {
    var msg =
      err && err.message ? err.message : "SPARQL backend unavailable";
    return res.status(503).send(msg);
  });
}

module.exports = router;
