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
    return res.send(500, "You must provide a value for 'prefix' parameter");
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
    return res.send(500, "You must provide a value for 'vocab' parameter");
  Vocabulary.loadFromPrefixURINSP(req.query.vocab, function (err, vocab) {
    if (err) return res.send(500, err);
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
    if (err) return res.send(500, err);
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
    return res.send(500, err);
  } else if (!(results != null)) {
    return res.send(404, "API returned no results");
  } else {
    return res.send(200, results);
  }
}

/* return a notification of a bad request */
function standardBadRequestHandler(req, res, helpText) {
  res.set("Content-Type", "text/plain");
  return res.send(400, helpText);
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
    });
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
      /* store version locally */
      var command =
        scripts +
        "/bin/downloadVersion " +
        (vocab.isDefinedBy ? vocab.isDefinedBy : vocab.uri) +
        " " +
        scripts +
        "/lov.config";
      var exec = require("child_process").exec;
      child = exec(command, function (error, stdout, stderr) {
        if (!stderr.startsWith("ERROR") && stdout && stdout.length > 0) {
          stdout = stdout.split("\n")[0];
          /* move file with its name */
          var version = {};
          var versionIssued = new Date();

          var d = versionIssued.getDate();
          var m = versionIssued.getMonth() + 1;
          var y = versionIssued.getFullYear();
          var issuedStr =
            "" +
            y +
            "-" +
            (m <= 9 ? "0" + m : m) +
            "-" +
            (d <= 9 ? "0" + d : d);
          var versionName = "v" + issuedStr;

          version.issued = versionIssued;
          version.name = versionName;
          version.isReviewed = true;

          var dir = "./versions/" + vocab._id;
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
          }

          var target_path =
            "./versions/" +
            vocab._id +
            "/" +
            vocab._id +
            "_" +
            issuedStr +
            ".n3"; //req.files.file.name;
          // move the file from the temporary location to the intended location
          fs.rename(stdout, target_path, function (err) {
            //windows command
            //exec("move " + stdout + " " + target_path, function (err) {
            if (err) {
              return res
                .status(500)
                .send(
                  "The ontology has not been downloaded. No version found."
                );
              //throw err
            }
            var versionPublicPath =
              lov +
              "/dataset/lov/vocabs/" +
              vocab.prefix +
              "/versions/" +
              issuedStr +
              ".n3";
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

              //Add diagram to version (if the diagram was uploaded) (to stdout2)
              if (req.body.file) {
                // Directory path to store the diagrams
                dir = dir + "/diagrams";
                // Diagram path
                target_path = dir + "/" + vocab._id + "_" + issuedStr + ".svg";
                //Indicate the path to the diagram
                stdout2["diagramPath"] = target_path;
                // Create directory to store the diagrams
                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir);
                }
                // Store the diagram
                fs.writeFile(target_path, req.body.file.fileContent, (err) => {
                  if (err) {
                    console.error(err);
                  }
                });
              }

              /* add version */
              Vocabulary.addVersion(vocab.prefix, stdout2, function (err) {
                if (err) {
                  return res.send({
                    redirect: "500",
                  });
                }
                vocab.versions = stdout2;

                //success generate first stats
                var command3 =
                  scripts +
                  "/bin/statsonevocab " +
                  scripts +
                  "/lov.config " +
                  vocab.uri;
                var exec3 = require("child_process").exec;
                child = exec3(command3, function (error3, stdout3, stderr3) {
                  // Generate not flatten structures
                  exports
                    .generateStructures(
                      vocab.prefix,
                      vocab,
                      "not_flatten",
                      python_patterns,
                      patterns,
                      false
                    )
                    .then(
                      ([
                        versionPath,
                        structuresTypePath,
                        structuresNamePath,
                      ]) => {
                        exports.detectGlobalPatterns(
                          patterns,
                          python_patterns,
                          (err) => {
                            if (err)
                              return res.send({
                                redirect: "/dataset/lov/vocabs/" + vocab.prefix,
                                err: err,
                              });
                            return res.send({
                              redirect: "/dataset/lov/vocabs/" + vocab.prefix,
                            });
                          }
                        );
                      }
                    )
                    .catch((err) => {
                      return res.send({
                        redirect: "/dataset/lov/vocabs/" + vocab.prefix,
                        err: err,
                      });
                    });
                });
              });
            });
          });
        } else {
          //no version found
          res.send({
            redirect: "/dataset/lov/vocabs/" + vocab.prefix,
            err: "The ontology has not been downloaded. No version found.",
          });
        }
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

      var command =
        python_patterns +
        " " +
        patterns +
        "/lov.py --type structure --flatten " +
        flatten +
        " --ontology_path " +
        path.resolve(
          __dirname +
            "/../../versions/" +
            vocab._id +
            "/" +
            vocab._id +
            "_" +
            lastVersion.name.slice(1) +
            ".n3"
        ) +
        " --output_path " +
        versionPath +
        " --preffix " +
        voc;
      //Llamar a la api para que generar el fichero con las estructuras
      var exec = require("child_process").exec;
      child = exec(command, function (error, stdout, stderr) {
        if (error !== null) reject(new Error("exec1 error: " + error));
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
      res.send({ redirect: "/dataset/lov/vocabs/" + vocab.prefix });
    })
    .catch((err) => {
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    });
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
    res.redirect("/edition/lov");
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
        res.redirect("/edition/lov");
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
    var command =
      python_patterns +
      " " +
      patterns +
      "/lov.py --type pattern --patterns_type " +
      pattern;
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
    })
      .then(() => {
        if (pattern == "type" || pattern == "both") {
          command += " --type_path " + type_path;
        }
        if (pattern == "name" || pattern == "both") {
          command += " --name_path " + name_path;
        }

        var exec = require("child_process").exec;
        // LLamar a la api para detectar los patrones a partir de los ficheros con las estructuras
        child = exec(command, function (error, stdout, stderr) {
          if (error !== null)
            return standardCallback(
              req,
              res,
              new Error("exec error: " + error),
              null
            );
          if (stdout && stdout.length > 0) {
            stdout = JSON.parse(stdout);
            stdout.forEach((st) => {
              if (st["pattern_type"]) {
                zip.file("Patterns_type.txt", st["pattern_type"]);
                zip.file("Patterns_type.csv", st["csv_type"]);
              }
              if (st["pattern_name"]) {
                zip.file("Patterns_name.txt", st["pattern_name"]);
                zip.file("Patterns_name.csv", st["csv_name"]);
              }
            });

            zip.generateAsync({ type: "base64" }).then(function (content) {
              return standardCallback(req, res, null, content);
            });
          } else {
            //Error detecting the patterns
            return standardCallback(req, res, stderr, null);
          }
        });
      })
      .catch((err) => {
        return standardCallback(req, res, err, null);
      });
  }
};

function encodeToZip(zip, versionPath, voc) {
  const array = [
    "/error_log.txt",
    "/Structure_term_inferred_blank_nodes.txt",
    "/Structure_term_inferred_type.txt",
    "/Structure_term_name.txt",
    "/Structure_term_type.txt",
    "/Structure.csv",
  ];
  array.forEach((file) => {
    fs.readFile(path.resolve(versionPath + file), function (err, data) {
      if (err) throw err;
      zip.file(voc + file, data);
    });
  });
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
