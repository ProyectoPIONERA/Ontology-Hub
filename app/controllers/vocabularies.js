/**
 * Module dependencies.
 */
var mongoose = require("mongoose"),
  Vocabulary = mongoose.model("Vocabulary"),
  Language = mongoose.model("Language"),
  Statvocabulary = mongoose.model("Statvocabulary"),
  Stattag = mongoose.model("Stattag"),
  LogSearch = mongoose.model("LogSearch"),
  utils = require("../../lib/utils"),
  fs = require("fs"),
  _ = require("underscore"),
  JSZip = require("jszip"),
  path = require("path");

const { Parser } = require('n3');
const crypto = require('crypto');

var app_name;
var app_name_shorcut;

exports.configureName = function (an, ans) {
  app_name = an;
  app_name_shorcut = ans;
};

/**
 * List
 */
exports.index = function (req, res) {
  Vocabulary.list(function (err, vocabs) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    Stattag.mostPopularTags(30, function (err, tagsMostPopular) {
      Statvocabulary.mostLOVIncomingLinks(
        0,
        function (err, vocabsMostLOVIncomingLinks) {
          Vocabulary.latestInsertion(5, function (err, vocabsLatestInsertion) {
            if (err)
              return res.render("500", {
                app_name_shorcut: app_name_shorcut,
                app_name: app_name,
              });
            Vocabulary.latestModification(
              5,
              function (err, vocabsLatestModification) {
                if (err)
                  return res.render("500", {
                    app_name_shorcut: app_name_shorcut,
                    app_name: app_name,
                  });
                //vocabsMostLOVIncomingLinks.unshift(JSON.stringify({ 'nbIncomingLinks': vocabsMostLOVIncomingLinks[0].nbIncomingLinks+50, prefix: '...' }));
                res.render("index", {
                  title: "Articles",
                  utils: utils,
                  vocabs: vocabs,
                  vocabsLatestInsertion: vocabsLatestInsertion,
                  vocabsLatestModification: vocabsLatestModification,
                  vocabsMostLOVIncomingLinks: vocabsMostLOVIncomingLinks,
                  tagsMostPopular: tagsMostPopular,
                  app_name_shorcut: app_name_shorcut,
                  app_name: app_name,
                });
              }
            );
          });
        }
      );
    });
  });
};

/**
 * Vocabulary List API
 */
exports.apiListVocabs = function (req, res) {
  Vocabulary.listPrefixNspUriTitles(function (err, vocabs) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    //store log in DB
    var log = new LogSearch({
      searchURL: req.originalUrl,
      date: new Date(),
      category: "vocabularyList",
      method: "api",
      nbResults: vocabs.length,
    });
    log
      .save()
      .then(() => {
        return standardCallback(req, res, err, vocabs);
      })
      .catch((err) => {
        return standardCallback(req, res, err, vocabs);
      });
  });
};

/**
 * Vocabulary Prefix Exists API
 */
exports.apiPrefixExists = function (req, res) {
  if (!(req.query.prefix != null))
    return res
      .status(500)
      .send("You must provide a value for 'prefix' parameter");
  Vocabulary.testIfPrefixExists(req.query.prefix, function (err, count) {
    return standardCallback(req, res, err, { count: count });
  });
};

/**
 * Vocabulary Tags List API
 */
exports.apiTags = function (req, res) {
  Stattag.list(function (err, tags) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    return standardCallback(req, res, err, tags);
  });
};

/**
 * Vocabulary Info API
 */
exports.apiInfoVocab = function (req, res) {
  if (!(req.query.vocab != null))
    return res
      .status(500)
      .send("You must provide a value for 'vocab' parameter");
  Vocabulary.loadFromPrefixURINSP(req.query.vocab, function (err, vocab) {
    if (err) return res.status(500).send(err);
    //store log in DB
    var exists = vocab ? 1 : 0;
    var log = new LogSearch({
      searchURL: req.originalUrl,
      date: new Date(),
      category: "vocabularyInfo",
      method: "api",
      nbResults: exists,
    });
    log
      .save()
      .then(() => {
        return standardCallback(req, res, err, vocab);
      })
      .catch((err) => {
        return standardCallback(req, res, err, vocab);
      });
  });
};

/**
 * Vocabulary Distributions Artefact API
 */

exports.apiDistributionsVocab = function (req, res) {
  if (!req.query.vocab) {
    return res
      .status(400)
      .send("You must provide a value for 'vocab' parameter");
  }

  Vocabulary.loadFromPrefixURINSP(req.query.vocab, function (err, vocab) {
    if (err) return res.status(500).send(err);
    if (!vocab) return res.status(404).send("Vocabulary not found");

    const log = new LogSearch({
      searchURL: req.originalUrl,
      date: new Date(),
      category: "vocabularyDistributions",
      method: "api",
      nbResults: vocab.versions?.length || 0,
    });

    log.save().finally(() => {
      return standardCallback(req, res, null, vocab.versions);
    });
  });
};

/**
 * Vocabulary Distributions  API
 */
exports.apiAllDistributions = function (req, res) {
  Vocabulary.listVersions(function (err, vocabs) {
    if (err) return res.status(500).send(err);

    const log = new LogSearch({
      searchURL: req.originalUrl,
      date: new Date(),
      category: "allVocabularyDistributions",
      method: "api",
      nbResults: vocabs.length,
    });

    log.save().finally(() => {
      return standardCallback(req, res, null, vocabs);
    });
  });
};

/**
 * Vocabulary Latest Distributions API
 */
exports.apiLatestDistribution = function (req, res) {
  if (!req.query.vocab) {
    return res
      .status(400)
      .send("You must provide a value for 'vocab' parameter");
  }

  Vocabulary.loadFromPrefixURINSP(req.query.vocab, function (err, vocab) {
    if (err) return res.status(500).send(err);
    if (!vocab || !vocab.versions || vocab.versions.length === 0) {
      return res.status(404).send("No versions found for the given vocabulary");
    }

    const latestVersion = vocab.versions.reduce((latest, current) => {
      return new Date(current.issued) > new Date(latest.issued)
        ? current
        : latest;
    });

    const log = new LogSearch({
      searchURL: req.originalUrl,
      date: new Date(),
      category: "latestVocabularyDistribution",
      method: "api",
      nbResults: 1,
    });

    log.save().finally(() => {
      return standardCallback(req, res, null, latestVersion);
    });
  });
};

/**
 * Get a specific distribution of a vocabulary
 */
exports.apiDistributionDetails = function (req, res) {
  const artefactID = req.params.artefactID;
  const distributionID = req.params.distributionID;

  if (!artefactID || !distributionID) {
    return res
      .status(400)
      .send("You must provide both artefactID and distributionID in the URL");
  }

  Vocabulary.loadFromPrefixURINSP(artefactID, function (err, vocab) {
    if (err) return res.status(500).send(err);

    if (!vocab || !vocab.versions || vocab.versions.length === 0) {
      return res.status(404).send("Vocabulary or distributions not found");
    }

    const distribution = vocab.versions.find(
      (ver) => ver.name === distributionID
    );

    if (!distribution) {
      return res
        .status(404)
        .send("Distribution not found for given artefactID");
    }

    return res.status(200).json(distribution);
  });
};

/**
 * Vocabulary JSON-LD context List
 */
exports.jsonLDListVocabs = function (req, res) {
  Vocabulary.listPrefixNspUri(function (err, vocabs) {
    if (err) return res.status(500).send(err);
    var contexts = {};
    for (x in vocabs) {
      contexts[vocabs[x].prefix] = vocabs[x].nsp;
    }
    var out = {
      "@context": contexts,
    };
    return standardCallback(req, res, err, out);
  });
};

/* depending on result, send the appropriate response code */
function standardCallback(req, res, err, results) {
  if (err != null) {
    return res.status(500).send(err);
  } else if (!(results != null)) {
    return res.status(404).send("API returned no results");
  } else {
    return res.status(200).send(results);
  }
}

/* return a notification of a bad request */
function standardBadRequestHandler(req, res, helpText) {
  res.set("Content-Type", "text/plain");
  return res.status(400).send(helpText);
}

/**
 * Filter List
 */
exports.filterList = function (req, res) {
  Vocabulary.filterListVocab(
    req.query.sort,
    req.query.tag,
    function (err, vocabs) {
      if (err)
        return res.render("500", {
          app_name_shorcut: app_name_shorcut,
          app_name: app_name,
        });
      res.render("vocabularies/index", {
        utils: utils,
        vocabs: vocabs,
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    }
  );
};

/**
 * Load
 */

exports.load = function (req, res, next, prefix) {
  Vocabulary.load(prefix, function (err, vocab) {
    if (err) {
      return next(err);
    }
    if (!vocab) {
      return next(new Error("Vocabulary " + prefix + " not found"));
    }
    req.vocab = vocab;

    next();
  });
};

/**
 * Load for edition without populating versions.languageIds
 */

exports.loadEdition = function (req, res, next, prefix) {
  Vocabulary.loadEdition(prefix, function (err, vocab) {
    if (err) return next(err);
    if (!vocab) return next(new Error("Vocabulary " + prefix + " not found"));
    req.vocab = vocab;
    next();
  });
};

/**
 * Load
 */

exports.loadId = function (req, res, next, id) {
  Vocabulary.loadId(id, function (err, vocab) {
    if (err) return next(err);
    if (!vocab) return next(new Error("Vocabulary " + id + " not found"));
    req.vocab = vocab;
    next();
  });
};

/**
 * Show
 */
exports.show = function (req, res, lov) {
  Statvocabulary.load(req.vocab.uri, function (err, statvocab) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    var versions, lastVersion, timelineData, x, vocabElementsData, svgDiagram;
    if (typeof req.vocab != "undefined") {
      if (req.vocab.versions && req.vocab.versions.length > 0) {
        for (i in req.vocab.versions) {
          if (typeof lastVersion == "undefined")
            lastVersion = req.vocab.versions[i];
          else {
            if (lastVersion.issued < req.vocab.versions[i].issued)
              lastVersion = req.vocab.versions[i];
          }
        }
        function compare(a, b) {
          if (a.issued < b.issued) return -1;
          return 1;
        }
        versions = req.vocab.versions.sort(compare);
      }

      //build the JSON Object for the timeline

      timelineData = [];
      if (versions) {
        for (var i = 0; i < versions.length; i++) {
          version = versions[i];
          x = {};

          x.start = utils.dateToYMD(version.issued);
          if (i + 1 < versions.length) {
            x.end = utils.dateToYMD(versions[i + 1].issued);
          }
          x.icon = "/img/cursor.png";
          x.color = "#9CF";
          x.description = "";
          x.textColor = "#666";
          x.title = version.name;
          x.caption = req.vocab.prefix + " " + version.name;
          if (version.fileURL) x.link = version.fileURL;

          timelineData.push(x);
        }
      }

      //build the outcoming graph

      var outNodes = [];
      var outLinks = [];
      var inNodes = [];
      var inLinks = [];
      var cpt = 0;

      if (statvocab && typeof statvocab != "undefined") {
        outNodes.push({
          name: statvocab.prefix,
          nbIncomingLinks:
            statvocab.nbIncomingLinks > 0 ? statvocab.nbIncomingLinks : 1,
          group: 2,
        });
        inNodes.push({
          name: statvocab.prefix,
          nbIncomingLinks:
            statvocab.nbIncomingLinks > 0 ? statvocab.nbIncomingLinks : 1,
          group: 2,
        });
        //generate the data for the outgoing links
        cpt = pushNodesLinks(
          statvocab.outRelMetadata,
          true,
          13,
          outNodes,
          outLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.outRelExtends,
          false,
          4,
          outNodes,
          outLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.outRelSpecializes,
          false,
          0,
          outNodes,
          outLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.outRelGeneralizes,
          false,
          1,
          outNodes,
          outLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.outRelEquivalent,
          false,
          14,
          outNodes,
          outLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.outRelDisjunc,
          false,
          15,
          outNodes,
          outLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.outRelImports,
          false,
          6,
          outNodes,
          outLinks,
          cpt
        );

        //generate the data for the incoming links
        cpt = 0;
        cpt = pushNodesLinks(
          statvocab.incomRelMetadata,
          true,
          13,
          inNodes,
          inLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.incomRelExtends,
          false,
          4,
          inNodes,
          inLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.incomRelSpecializes,
          false,
          0,
          inNodes,
          inLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.incomRelGeneralizes,
          false,
          1,
          inNodes,
          inLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.incomRelEquivalent,
          false,
          14,
          inNodes,
          inLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.incomRelDisjunc,
          false,
          15,
          inNodes,
          inLinks,
          cpt
        );
        cpt = pushNodesLinks(
          statvocab.incomRelImports,
          false,
          6,
          inNodes,
          inLinks,
          cpt
        );
      } else {
        outNodes.push({
          name: req.vocab.prefix,
          nbIncomingLinks: 80,
          group: 1,
        });
        inNodes.push({ name: req.vocab.prefix, nbIncomingLinks: 80, group: 1 });
      }
      var outData = {};
      outData.nodes = outNodes;
      outData.links = outLinks;
      var inData = {};
      inData.nodes = inNodes;
      inData.links = inLinks;

      //build the JSON object for the elements chart
      if (lastVersion) {
        vocabElementsData = [
          {
            key: "Number of",
            values: [
              { label: "Classes", value: parseInt(lastVersion.classNumber) },
              {
                label: "Properties",
                value: parseInt(lastVersion.propertyNumber),
              },
              {
                label: "Datatypes",
                value: parseInt(lastVersion.datatypeNumber),
              },
              {
                label: "Instances",
                value: parseInt(lastVersion.instanceNumber),
              },
            ],
          },
        ];

        if (lastVersion.diagramPath) {
          svgDiagram = fs.readFileSync(lastVersion.diagramPath, {
            encoding: "utf8",
            flag: "r",
          });
          svgDiagram =
            '<svg class="nanocms-diagram"' +
            svgDiagram.substring(svgDiagram.search("<svg") + 4);
        }
      } else {
        req.flash("error", "The vocabulary is not available");
      }
    }

    const artifacts = {
      requirements: listArtifactFiles(req.vocab._id, "requirements"),
      conceptualization: listArtifactFiles(req.vocab._id, "conceptualization"),
      shapes: listArtifactFiles(req.vocab._id, "shapes"),
      examples: listArtifactFiles(req.vocab._id, "examples"),
      tests: listArtifactFiles(req.vocab._id, "tests"),
    };

    res.render("vocabularies/show", {
      statvocab: statvocab,
      vocab: req.vocab,
      lastVersion: lastVersion,
      utils: utils,
      timelineData: { events: timelineData },
      vocabElementsData: vocabElementsData,
      outData: outData,
      inData: inData,
      lov: lov,
      errors: req.flash("error"),
      app_name_shorcut: app_name_shorcut,
      app_name: app_name,
      svgDiagram: svgDiagram,
      artifacts: artifacts
    });
  });
};

exports.artifactFile = function(req, res){
  const {prefix, type, file} = req.params;

  const allowed = ["requirements", "conceptualization", "shapes", "examples", "tests"];
  if (!allowed.includes(type)) return res.status(400).send("Invalid artifact type");

  if(file.includes("..") || file.includes("/") || file.includes("\\")){
    return res.status(400).send("Invalid file");
  }

  Vocabulary.load(prefix, function(err, vocab){
    if(err || !vocab) return res.status(404).send("Vocab not found");

    const absPath = path.resolve(__dirname, "..", "..", "versions", String(vocab._id), type, file);
    if(!fs.existsSync(absPath)) return res.status(404).send("Artifact not found");

    // Si quieres forzar descarga:
    // return res.download(absPath);

    // Si quieres servirlo inline:
    return res.sendFile(absPath);
  });
};


exports.create = function (req, res, scripts, lov, patterns, python_patterns) {
  var vocab = new Vocabulary(req.body);
  if (!fs.existsSync("./versions/")) {
    fs.mkdirSync("./versions/");
  }

  vocab
    .save()
    .then(() => {
      // Si viene la ruta local (oculta en el form), saltamos la descarga
      const ontologyPath = req.body.ontology_path || req.body.ontologyPath; // soporta ambos nombres
      if (ontologyPath) {
        // Usamos la ruta proporcionada como "stdout" y vaciamos "stderr"
        return createVocab(
          req,
          res,
          null,              // error
          ontologyPath,      // stdout: la ruta al archivo en tmp
          "",                // stderr
          scripts,
          lov,
          patterns,
          python_patterns,
          vocab
        );
      }

      // Fallback: descargar desde la URI
      var command =
        scripts +
        "/bin/downloadVersion " +
        (vocab.isDefinedBy ? vocab.isDefinedBy : vocab.uri) +
        " " +
        scripts +
        "/lov.config";

      var exec = require("child_process").exec;
      exec(command, function (error, stdout, stderr) {
        // Delegamos el resto del flujo a la función auxiliar
        return createVocab(
          req,
          res,
          error,
          stdout,
          stderr,
          scripts,
          lov,
          patterns,
          python_patterns,
          vocab
        );
      });
    })
    .catch((err) => {
      return res.send({
        redirect: "500",
      });
    });
};


exports.generateStructures = function (
  voc,
  vocab,
  flatten,
  pattern, 
  python_patterns,
  patterns,
  regenerateStructures
) {
  return new Promise((resolve, reject) => {
    if (
      !fs.existsSync(path.resolve(__dirname + "/../../versions/" + vocab._id))
    ) {
      reject("Ontology " + voc + " has not an available version.");
    }
    var versionPath = path.resolve(
      __dirname + "/../../versions/" + vocab._id + "/" + flatten
    );
    var structuresTypePath = path.resolve(
      versionPath + "/Structure_term_inferred_type.txt"
    );
    var structuresNamePath = path.resolve(
      versionPath + "/Structure_term_inferred_blank_nodes.txt"
    );

    // Check if the structures have been generated previously
    if (regenerateStructures || !fs.existsSync(structuresTypePath)) {
      // Check if the folder where the structures are going to be stored exists
      if (!fs.existsSync(versionPath)) {
        fs.mkdirSync(versionPath);
      }
      // Get the last version of the ontology
      var lastVersion;
      if (vocab.versions && vocab.versions.length > 0) {
        for (i in vocab.versions) {
          if (typeof lastVersion == "undefined")
            lastVersion = vocab.versions[i];
          else {
            if (lastVersion.issued < vocab.versions[i].issued)
              lastVersion = vocab.versions[i];
          }
        }
      } else {
        reject("Ontology " + voc + " has not an available version.");
      }

      const has_flatten = flatten !== 'not_flatten' ? 'yes' : 'no';  

      var command =
        python_patterns +
        " " +
        patterns +
        "/generate_web_page.py --flatten " +
        has_flatten + 
        " --patterns " + pattern +
        " --ontology_path " +
        path.resolve(
          __dirname +
            "/../../versions/" +
            vocab._id +
            "/" 
        ) +
        " --output_path " +
        versionPath ;
      //Llamar a la api para que generar el fichero con las estructuras
      var exec = require("child_process").exec;
      child = exec(command, function (error, stdout, stderr) {
        if (error !== null) {
          reject(error);
        }
        resolve([versionPath, structuresTypePath, structuresNamePath]);
      });
    } else {
      resolve([versionPath, structuresTypePath, structuresNamePath]);
    }
  });
};

exports.detectGlobalPatterns = function (patterns, python_patterns, cb) {
  var command =
    python_patterns +
    " " +
    patterns +
    "/lov.py --type pattern --patterns_type both";
  var itemsProcessed = 0;
  new Promise((resolve, reject) => {
    Vocabulary.listWithId(function (err, vocabs) {
      if (err) reject(new Error("Find error: " + err));
      if (!vocabs) reject(new Error("Vocabulary " + voc + " not found"));
      var type_path = "";
      var name_path = "";
      vocabs.forEach((vocab) => {
        var versionPath = path.resolve(
          __dirname + "/../../versions/" + vocab._id + "/not_flatten"
        );
        if (fs.existsSync(versionPath + "/Structure_term_inferred_type.txt")) {
          type_path += " " + versionPath + "/Structure_term_inferred_type.txt";
          name_path +=
            " " + versionPath + "/Structure_term_inferred_blank_nodes.txt";
        }
        itemsProcessed++;
        if (itemsProcessed === vocabs.length) resolve([type_path, name_path]);
      });
    });
  })
    .then(([type_path, name_path]) => {
      command += " --type_path " + type_path;
      command += " --name_path " + name_path;

      var exec = require("child_process").exec;
      // LLamar a la api para detectar los patrones a partir de los ficheros con las estructuras
      child = exec(command, function (error, stdout, stderr) {
        if (error !== null) return cb(new Error("exec error: " + error));
        if (stdout && stdout.length > 0) {
          stdout = JSON.parse(stdout);
          var globalPatterns = path.resolve(
            __dirname + "/../../versions/globalPatterns"
          );
          if (!fs.existsSync(globalPatterns)) {
            fs.mkdirSync(globalPatterns);
          }
          stdout.forEach((st) => {
            if (st["pattern_type"]) {
              fs.writeFile(
                globalPatterns + "/PatternsType.txt",
                st["pattern_type"],
                (err) => {
                  if (err) {
                    return cb(err);
                  }
                }
              );
              fs.writeFile(
                globalPatterns + "/PatternsType.csv",
                st["csv_type"],
                (err) => {
                  if (err) {
                    return cb(err);
                  }
                }
              );
            }
            if (st["pattern_name"]) {
              fs.writeFile(
                globalPatterns + "/PatternsName.txt",
                st["pattern_name"],
                (err) => {
                  if (err) {
                    return cb(err);
                  }
                }
              );
              fs.writeFile(
                globalPatterns + "/PatternsName.csv",
                st["csv_name"],
                (err) => {
                  if (err) {
                    return cb(err);
                  }
                }
              );
            }
          });

          return cb(null);
        } else {
          //Error detecting the patterns
          return cb(new Error("No patterns detected"));
        }
      });
    })
    .catch((err) => {
      return cb(err);
    });
};

exports.update = function (req, res) {
  var vocab = req.vocab;
  vocab = _.extend(vocab, req.body);
  vocab
    .save()
    .then(() => {
      res.send({ redirect: "/dataset/vocabs/" + vocab.prefix });
    })
    .catch((err) => {
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
};

exports.destroy = async function (req, res) {
  try {
    const vocab = req.vocab;
    if (!vocab) return res.status(404).send("Vocabulary not found");

    const vocabId = String(vocab._id);

    // Delete all versions
    const versionsDir = path.resolve(__dirname, "..", "..", "versions", vocabId);
    if (fs.existsSync(versionsDir)) {
      fs.rmSync(versionsDir, { recursive: true, force: true });
    }

    // Delete on Mongo
    await Vocabulary.deleteOne({ _id: vocab._id });

    return res.redirect("/edition");
  } catch (err) {
    console.error("[destroy vocab error]", err);
    return res.status(500).send("Error deleting vocabulary");
  }
};

exports.edit = function (req, res, scripts) {
  Language.listAll(function (err, langs) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    Stattag.list(function (err, listTags) {
      if (err)
        return res.render("500", {
          app_name_shorcut: app_name_shorcut,
          app_name: app_name,
        });

      var command =
        scripts +
        "/bin/suggest " +
        (req.vocab.isDefinedBy ? req.vocab.isDefinedBy : req.vocab.uri) +
        " " +
        scripts +
        "/lov.config";
      var exec = require("child_process").exec;
      child = exec(
        command,
        { timeout: 5000 },
        function (error, stdout, stderr) {
          if (stderr.length < 4) {
            if (stdout) stdout = JSON.parse(stdout);
          }
          res.render("vocabularies/edit", {
            stdout: stdout,
            vocab: req.vocab,
            langs: langs,
            listTags: listTags,
            profile: req.user,
            utils: utils,
            app_name_shorcut: app_name_shorcut,
            app_name: app_name,
          });
        }
      );
    });
  });
};

exports.new = function (req, res, scripts) {
  //test if the vocabulary already exist or not
  if (!req.body.uri) {
    //control that q param is present
    req.flash("error", "You must specify a vocabulary URI");
    res.redirect("/edition");
  } else {
    Vocabulary.findNspURI(req.body.uri, function (err, vocab) {
      if (err)
        return res.render("500", {
          app_name_shorcut: app_name_shorcut,
          app_name: app_name,
        });
      if (vocab) {
        //vocab already exist
        req.flash("error", "This vocabulary already exists");
        res.redirect("/edition");
      } else {
        //vocab does not exist yet*/
        Language.listAll(function (err, langs) {
          if (err)
            return res.render("500", {
              app_name_shorcut: app_name_shorcut,
              app_name: app_name,
            });
          Stattag.list(function (err, listTags) {
            if (err)
              return res.render("500", {
                app_name_shorcut: app_name_shorcut,
                app_name: app_name,
              });
            var command =
              scripts +
              "/bin/suggest " +
              req.body.uri +
              " " +
              scripts +
              "/lov.config";
            var exec = require("child_process").exec;
            child = exec(command, function (error, stdout, stderr) {
              if (stderr.length < 4) {
                if (stdout) stdout = JSON.parse(stdout);
              } else if (stdout) {
                stdout = JSON.parse(stdout);
              } else {
                req.flash("error", "The vocabulary URI is not available");
              }
              res.render("vocabularies/new", {
                stdout: stdout,
                vocab: new Vocabulary({}),
                langs: langs,
                listTags: listTags,
                profile: req.user,
                utils: utils,
                errors: req.flash("error"),
                app_name_shorcut: app_name_shorcut,
                app_name: app_name,
              });
            });
          });
        });
      }
    });
  }
};

exports.newRepository = function (req, res, scripts) {
  // Check that the ontology repository url is present
  if (!req.body.repositoryUri) {
    req.flash("error", "You must specify an ontology repository url");
    res.redirect("/edition");
  } else {
    const aux = new URL(req.body.repositoryUri);

    // Check if the url is from github or gitlab
    if(!isRepositoryUrl(req.body.repositoryUri)){
      req.flash("error", "You must specify an url from github or gitlab");
      res.redirect("/edition");
    }
    else{
      const { pathname } = new URL(req.body.repositoryUri);

      // Get the default branch name
      fetch(`https://api.github.com/repos${pathname}`)
        .then(function(response) {
          if (!response.ok) {
            return Promise.reject();
          }
          else{
            return response.json();
          }
        })
        .then(function(data){
          
          // Get the .config file from the repository
          fetch(`https://api.github.com/repos${pathname}/contents/.config`)
            .then(function(response) {
              if (!response.ok) {
                return Promise.reject();
              }
              else{
                return response.json();
              }
            })
            .then(function(data){
              if (data.encoding === 'base64') {
                // Decode Base64 content
                const content = Buffer.from(data.content, 'base64').toString('utf8');
                // Parse the "implementation" path
                var match = content.match(/implementation\s*=\s*(.+)/);
                if (!match) {
                  return Promise.reject(new Error('We can access the .config file but no implementation path was found in it'));
                }
                else{
                  // Remove possible "./" and trim spaces/newlines
                  let implementationPath = match[1].trim();
                  implementationPath = implementationPath.replace(/^\.\//, ""); // remove leading './'

                  //Get the ontology
                  fetch(`https://api.github.com/repos${pathname}/contents/${implementationPath}`)
                    .then(function(response){
                      if (!response.ok) {
                        return Promise.reject();
                      }
                      else{
                        return response.json();
                      }
                    })
                    .then(function (files){
                      // The response will be an array of file objects if it's a directory
                      if (!Array.isArray(files)) {
                        return Promise.reject(new Error('The implementation path specified in the .config file is not a folder.'));
                      }
                      /*
                      if (files.length !== 1) {
                        return Promise.reject(new Error(`The implementation path specified in the .config file contains more than one file. It contains ${files.length} files.`));
                      }
                      */
                      //Download the ontology
                      fetch(files[1].download_url)
                        .then(function(response){
                          if (!response.ok) {
                            return Promise.reject();
                          }
                          else{
                            return response.text();
                          }
                        })
                        .then(function(data) {
                          // Get the path to the ontology artifacts
                          match = content?.match(/requirements\s*=\s*(.+)/)?.[1]
                            ?.trim()
                            .replace(/^\.\//, "");
                          let requirements = match
                            ? `https://api.github.com/repos${pathname}/contents/${match}`
                            : null;
                          match = content?.match(/conceptualization\s*=\s*(.+)/)?.[1]
                            ?.trim()
                            .replace(/^\.\//, "");
                          let conceptualization = match
                            ? `https://api.github.com/repos${pathname}/contents/${match}`
                            : null;
                          match = content?.match(/shapes\s*=\s*(.+)/)?.[1]
                            ?.trim()
                            .replace(/^\.\//, "");
                          let shapes = match
                            ? `https://api.github.com/repos${pathname}/contents/${match}`
                            : null;
                          match = content?.match(/examples\s*=\s*(.+)/)?.[1]
                            ?.trim()
                            .replace(/^\.\//, "");
                          let examples = match
                            ? `https://api.github.com/repos${pathname}/contents/${match}`
                            : null;
                          match = content?.match(/tests\s*=\s*(.+)/)?.[1]
                            ?.trim()
                            .replace(/^\.\//, "");
                          let tests = match
                            ? `https://api.github.com/repos${pathname}/contents/${match}`
                            : null;
                          return parseOntology(req, res, scripts, data, path.extname(files[1].name), requirements, conceptualization, shapes, examples, tests);
                        })
                        .catch(function(err){
                          if(err){
                            req.flash("error", err.message);
                            res.redirect("/edition");
                          }
                          else{
                            req.flash("error", "We can not download the ontology specified in the .config file.");
                            res.redirect("/edition");
                          }
                        });
                    })
                    .catch(function(err) {
                      if(err){
                        req.flash("error", err.message);
                        res.redirect("/edition");
                      }
                      else{
                        req.flash("error", "We can not access the ontology specified in the .config file.");
                        res.redirect("/edition");
                      }
                    });
                }
              } else {
                return Promise.reject(new Error(`We can access the .config file but the encoding is unexpected: ${data.encoding}`));
              }
            })
            .catch(function(err) {
              if(err){
                req.flash("error", err.message);
                res.redirect("/edition");
              }
              else{
                req.flash("error", "We can access the repository but there is not .config file located at the root.");
                res.redirect("/edition");
              }
            });
        })
        .catch(function(err) {
          req.flash("error", "We can not access the repository. Check the if the url is correct and the repository is public.");
          res.redirect("/edition");
        });
    }
    
  }
}

exports.detectPatterns = function (req, res, patterns, python_patterns) {
  if (!req.query.vocs || req.query.vocs.length == 2) {
    //control that vocs param is present
    return standardBadRequestHandler(
      req,
      res,
      "Query parameter missing. Syntax: ?q=querytext"
    );
  } else {
    var pattern = req.query.pattern;
    var flatten = req.query.flatten;
    if (pattern != "name" && pattern != "both") pattern = "type";
    if (flatten == "false") flatten = "not_flatten";
    else flatten = "flatten";
    var itemsProcessed = 0;
    var array = JSON.parse(req.query.vocs);
    const zip = new JSZip();
    var type_path = "";
    var name_path = "";
    
    new Promise((resolve, reject) => {
      array.forEach((voc) => {
        Vocabulary.loadEdition(voc, function (err, vocab) {
          if (err) reject(new Error("Find error: " + err));
          if (!vocab) reject(new Error("Vocabulary " + voc + " not found"));
          exports
            .generateStructures(
              voc,
              vocab,
              flatten,
              pattern,
              python_patterns,
              patterns,
              false
            )
            .then(([versionPath, structuresTypePath, structuresNamePath]) => {
              encodeToZip(zip, versionPath, voc);
            
              type_path += " " + structuresTypePath;
              name_path += " " + structuresNamePath;
              itemsProcessed++;
              if (itemsProcessed === array.length) resolve();
            })
            .catch((err) => {
              reject(err);
            });
        });
      });
    }).then(() => {
      zip.generateAsync({ type: "base64" }).then(function (content) {
              return standardCallback(req, res, null, content);
            });
    })
    
      .catch((err) => {
        return standardCallback(req, res, err, null);
      });
  }
};

function encodeToZip(zip, versionPath, voc) {

  //const root = (voc || '').replace(/\/+$/, '');
  const root = '';
  const toZipPath = (...parts) => parts.filter(Boolean).join('/');

  function addDir(currentFsPath, currentZipPath) {
    const entries = fs.readdirSync(currentFsPath, { withFileTypes: true });

    for (const entry of entries) {
      const fsPath = path.join(currentFsPath, entry.name);
      const zipPath = toZipPath(currentZipPath, entry.name);

      if (entry.isDirectory()) {
        zip.folder(zipPath);
        addDir(fsPath, zipPath);
      } else if (entry.isFile()) {
        const data = fs.readFileSync(fsPath);
        zip.file(zipPath, data);
      }
    }
  }

  addDir(versionPath, root);
}


/**
 * vocabList : The relation array containing vocab Objects
 * isFilterOut : indicate if we have to filter out rdf, rdfs, owl and xsd vocabs
 * group : relation identifier
 * outNodes : json array containing the nodes
 * outLinks : json array containing the links
 * cpt : node identifier
 **/
function pushNodesLinks(vocabList, isFilterOut, group, nodes, links, cpt) {
  var filterMetadataArray = ["rdf", "rdfs", "owl", "xsd"];
  if (typeof vocabList != "undefined") {
    for (x = 0; x < vocabList.length; x++) {
      if (isFilterOut && filterMetadataArray.indexOf(vocabList[x].prefix) > 0) {
      } else {
        cpt++;
        var nbIncomLinks =
          vocabList[x].nbIncomingLinks > 0 ? vocabList[x].nbIncomingLinks : 1;
        nodes.push({
          name: vocabList[x].prefix,
          nbIncomingLinks: nbIncomLinks,
          group: group,
        });
        links.push({ source: cpt, target: 0, value: 2 });
      }
    }
  }
  return cpt;
}

function isRepositoryUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return (protocol === 'https:' || protocol === 'http:') && (hostname === 'github.com' || hostname === 'www.github.com' || hostname === 'gitlab.com' || hostname === 'www.gitlab.com');
  } catch (err) {
    return false; // Invalid URL format
  }
}

function parseOntology(req, res, scripts, data, extension, requirements, conceptualization, shapes, examples, tests) {
  
  const parser = new Parser();
  const quads = parser.parse(data);

  const ontologyQuad = quads.find(q =>
      q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
      q.object.value === 'http://www.w3.org/2002/07/owl#Ontology'
  );

  if (!ontologyQuad) throw new Error("No ontology IRI found");

  Vocabulary.findNspURI(ontologyQuad.subject.value, function (err, vocab) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    if (vocab) {
      //vocab already exist
      req.flash("error", "This vocabulary already exists");
      res.redirect("/edition");
    } else {
      // Store the ontology content in a file in the tmp folder
      const randomName = crypto.randomBytes(16).toString('hex');
      const fullPath = path.join("./versions/temp", `${randomName}${extension}`);

      if (!fs.existsSync("./versions/temp")) {
        fs.mkdirSync("./versions/temp");
      }
      fs.writeFileSync(fullPath, data, 'utf8');

      //vocab does not exist yet*/
      Language.listAll(function (err, langs) {
        if (err)
          return res.render("500", {
            app_name_shorcut: app_name_shorcut,
            app_name: app_name,
          });
        Stattag.list(function (err, listTags) {
          if (err)
            return res.render("500", {
              app_name_shorcut: app_name_shorcut,
              app_name: app_name,
            });
          var command =
            scripts +
            "/bin/suggest " +
            ontologyQuad.subject.value +
            " " +
            scripts +
            "/lov.config " +
            fullPath;
          var exec = require("child_process").exec;
          child = exec(command, function (error, stdout, stderr) {
            if (stderr.length < 4) {
              if (stdout) stdout = JSON.parse(stdout);
            } else if (stdout) {
              stdout = JSON.parse(stdout);
            } else {
              req.flash("error", "The vocabulary URI is not available");
            }
            res.render("vocabularies/new", {
              stdout: stdout,
              vocab: new Vocabulary({}),
              langs: langs,
              listTags: listTags,
              profile: req.user,
              utils: utils,
              errors: req.flash("error"),
              app_name_shorcut: app_name_shorcut,
              app_name: app_name,
              ontologyPath: fullPath,
              requirements: requirements,
              conceptualization: conceptualization, 
              shapes: shapes,
              examples: examples,
              tests: tests,
            });
          });
        });
      });
    }
  });
}


function createVocab(req, res, error, stdout, stderr, scripts, lov, patterns, python_patterns, vocab) {
  if ((!stderr || !stderr.startsWith("ERROR")) && stdout && stdout.length > 0) {
    // Asegurar que stdout es la ruta y existe (cuando viene de downloadVersion o del form ontology_path)
    stdout = (stdout || "").toString().split("\n")[0].trim();
    if (!fs.existsSync(stdout)) {
      return res.status(500).send("Provided ontology path not found: " + stdout);
    }

    /* move file with its name */
    var version = {};
    var versionIssued = new Date();

    var d = versionIssued.getDate();
    var m = versionIssued.getMonth() + 1;
    var y = versionIssued.getFullYear();
    var issuedStr = "" + y + "-" + (m <= 9 ? "0" + m : m) + "-" + (d <= 9 ? "0" + d : d);
    var versionName = "v" + issuedStr;

    version.issued = versionIssued;
    version.name = versionName;
    version.isReviewed = true;

    var dir = "./versions/" + vocab._id;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // Si quisieras conservar la extensión original:
    // const origExt = path.extname(stdout) || ".n3";
    // Aquí dejamos ".n3" para mantener compatibilidad con tu pipeline actual
    var target_path = "./versions/" + vocab._id + "/" + vocab._id + "_" + issuedStr + ".n3";

    // Mover el archivo desde tmp (o ruta de downloadVersion) al destino definitivo
    fs.rename(stdout, target_path, async function (err) {
      if (err) {
        return res.status(500).send("The ontology has not been downloaded. No version found.");
      }

      try{
        // Descarga opcional de artefactos (GitHub/GitLab) si vienen en el form
        if (req.body.requirements) {
          await downloadArtifact(req.body.requirements, "./versions/" + vocab._id + "/requirements");
        }
        if (req.body.conceptualization) {
          await downloadArtifact(req.body.conceptualization, "./versions/" + vocab._id + "/conceptualization");
        }
        if (req.body.shapes) {
          await downloadArtifact(req.body.shapes, "./versions/" + vocab._id + "/shapes");
        }
        if (req.body.examples) {
          await downloadArtifact(req.body.examples, "./versions/" + vocab._id + "/examples");
        }
        if (req.body.tests) {
          await downloadArtifact(req.body.tests, "./versions/" + vocab._id + "/tests");
        }
      } catch(e){
        console.error("[artifact download error]", e);
      }

      const extractedLicense = extractLicenseFromRdfFile(target_path);
      console.log("Extracted license:", extractedLicense);
      
      //Save license in MongoDB
      if (extractedLicense.length) {
        await Vocabulary.updateOne(
          { _id: vocab._id },
          { $set: { license: extractedLicense } }
        ).catch(e => console.error("[save license error]", e));
      }

      var versionPublicPath = lov + "/dataset/vocabs/" + vocab.prefix + "/versions/" + issuedStr + ".n3";

      /* run analytics on vocab */
      var command2 =
        scripts +
        "/bin/versionAnalyser " +
        versionPublicPath +
        " " +
        vocab.uri +
        " " +
        vocab.nsp +
        " " +
        scripts +
        "/lov.config";

      var exec2 = require("child_process").exec;
      child = exec2(command2, function (error2, stdout2, stderr2) {
        stdout2 = JSON.parse(stdout2);
        stdout2 = _.extend(stdout2, version);
        stdout2.license = extractedLicense;
        //console.log("versionAnalyser stdout2.licenses:", stdout2.licenses);

        // Add diagram to version (si se subió un diagrama)
        if (req.body.file) {
          var diagramsDir = dir + "/diagrams";
          var diagramPath = diagramsDir + "/" + vocab._id + "_" + issuedStr + ".svg";
          stdout2["diagramPath"] = diagramPath;

          if (!fs.existsSync(diagramsDir)) {
            fs.mkdirSync(diagramsDir);
          }
          fs.writeFile(diagramPath, req.body.file.fileContent, (err) => {
            if (err) {
              console.error(err);
            }
          });
        }

        /* add version */
        Vocabulary.addVersion(vocab.prefix, stdout2, function (err) {
          if (err) {
            return res.send({ redirect: "500" });
          }
          vocab.versions = stdout2;

          // success generate first stats
          var command3 = scripts + "/bin/statsonevocab " + scripts + "/lov.config " + vocab.uri;

          var exec3 = require("child_process").exec;
          child = exec3(command3, function (error3, stdout3, stderr3) {
            // Generar estructuras (not_flatten) y detectar patrones globales
            exports
              .generateStructures(
                vocab.prefix,     // voc
                vocab,            // vocab
                "not_flatten",    // flatten
                "both",           // pattern: "type" | "name" | "both"
                python_patterns,  // python scripts path
                patterns,         // patterns path
                false             // regenerateStructures
              )
              .then(([versionPath, structuresTypePath, structuresNamePath]) => {
                exports.detectGlobalPatterns(patterns, python_patterns, (err) => {
                  if (err) {
                    return res.send({
                      redirect: "/dataset/vocabs/" + vocab.prefix,
                      err: err,
                    });
                  }
                  return res.send({ redirect: "/dataset/vocabs/" + vocab.prefix });
                });
              })
              .catch((err) => {
                return res.send({
                  redirect: "/dataset/vocabs/" + vocab.prefix,
                  err: "The structures for this Ontology has not been detected.",
                });
              });
          });
        });
      });
    });
  } else {
    // no version found
    res.send({
      redirect: "/dataset/vocabs/" + vocab.prefix,
      err: "The ontology has not been downloaded. No version found.",
    });
  }
}


async function downloadArtifact(artifactPath, localPath) {
  fs.mkdirSync(localPath, { recursive: true });

  const resp = await fetch(artifactPath);
  if (!resp.ok) throw new Error("Cannot access artifact folder: " + artifactPath);

  const files = await resp.json();
  if (!Array.isArray(files)) {
    throw new Error("Artifact path is not a folder: " + artifactPath);
  }

  const filesToDownload = files.filter(item => item.type === "file" && item.download_url);
  if (filesToDownload.length === 0) return [];

  await Promise.all(
    filesToDownload.map(async (file) => {
      const r = await fetch(file.download_url);
      if (!r.ok) throw new Error("Download failed: " + file.download_url);

      const ab = await r.arrayBuffer();
      fs.writeFileSync(path.join(localPath, file.name), Buffer.from(ab)); // binario SIEMPRE
      return file.name;
    })
  );

  return filesToDownload.map(f => f.name);
}


function listArtifactFiles(vocabId, folderName){
  try {
    const dir = path.resolve(__dirname, "..", "..", "versions", String(vocabId), folderName);
    if(!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, {withFileTypes: true})
      .filter(d => d.isFile())
      .map(d => d.name);
  } catch (e) {
    return [];
  }
}

function extractLicenseFromRdfFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    const parser = new Parser(); // N3 parser
    const quads = parser.parse(text);

    const LICENSE_PREDICATES = new Set([
      "http://purl.org/dc/terms/license",
      "http://creativecommons.org/ns#license",
      "https://schema.org/license",
      "http://schema.org/license",
    ]);

    const license = [];

    for (const q of quads) {
      if (!q || !q.predicate || !q.object) continue;
      if (!LICENSE_PREDICATES.has(q.predicate.value)) continue;

      // si el objeto es URI
      if (q.object.termType === "NamedNode") {
        license.push(q.object.value);
      }
      // si viene como literal (a veces pasa)
      else if (q.object.termType === "Literal") {
        license.push(q.object.value);
      }
    }

    // deduplicar
    return Array.from(new Set(license));
  } catch (e) {
    console.error("[extractLicenseFromRdfFile] error:", e.message);
    return [];
  }
}
