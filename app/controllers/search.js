var utils = require("../../lib/utils");

const { ElasticService } = require('../elastic/index');

var indexName = "lov_vocabulary"; /* Name of the ElasticSearch index */
var placeholders = [
  /* placeholder used in the input box */ /*"all you want to know about LOV!",
  "LOV is all :)",
  "be ready to fall in LOV!",
  "all you need is LOV :)",*/
  "Search",
];

var mongoose = require("mongoose"),
  LogSearch = mongoose.model("LogSearch"),
  LogSearchTerm = mongoose.model("LogSearchTerm"),
  Vocabulary = mongoose.model("Vocabulary");

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
  return execSearch(
    esclient,
    req.query.q,
    req.query.page_size,
    req.query.page,
    req.query.type,
    req.query.vocab,
    req.query.vocab_limit,
    req.query.tag,
    req.query.tag_limit,
    function (err, results) {
      if (err){
        return res.render("500", {
          app_name_shorcut: app_name_shorcut,
          app_name: app_name,
        });
      }
      //store log in DB
      //var log = new LogSearch({searchWords: req.query.q,
      //  searchURL: req.originalUrl,
      //  date: new Date(),
      //  category: "termSearch",
      //  method: "ui",
      //  nbResults: results.total_results  });//console.log(log);
      //log.save(function (err){if(err)console.log(err)});

      //store log in DB
      /*var arr = [];
    if ((typeof results != "undefined") && (typeof results.results != "undefined")) {
      for (res in results.results) {
        arr.push(res.prefixedName)
      }
    }
    var log = new LogSearchTerm({searchWords: req.query.q,
      searchURL: req.originalUrl,
      date: new Date(),
      sessionId: req.sessionId,
      nbResults: results.total_results,
      results: arr + ""  });console.log(log);
    log.save(function (err){if(err)console.log(err)});*/
      if (results.results.length == 0) {
        /* case we have no result, then give some suggestions */
        return execSuggestTerms(
          esclient,
          req.query.q,
          req.query.suggest_size,
          req.query.type,
          function (err, suggestions) {
            if (err)
              return res.render("500", {
                app_name_shorcut: app_name_shorcut,
                app_name: app_name,
              });
            res.render("search/index", {
              results: results,
              resultsList: [],
              suggestions: suggestions.suggestions,
              placeholder:
                placeholders[Math.floor(Math.random() * placeholders.length)],
              utils: utils,
              app_name_shorcut: app_name_shorcut,
              app_name: app_name,
            });
          }
        );
      } else {
        var arr = [];
        for (var i = 0; i < results.results.length; i++) {
          arr.push(results.results[i].prefixedName[0]);
        }
        res.render("search/index", {
          results: results,
          resultsList: arr,
          placeholder:
            placeholders[Math.floor(Math.random() * placeholders.length)],
          utils: utils,
          app_name_shorcut: app_name_shorcut,
          app_name: app_name,
        });
      }
    }
  );
};

/**
 * Search for vocabulary used by the /vocabs UI
 */
exports.searchVocabulary = async function (req, res) {
  // 1. Extraer parámetros de la URL
  const query = req.query.q || "";
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || 15;
  const tag = req.query.tag;
  const lang = req.query.lang;

  const options = {
    queryString: query,
    page: page,
    pageSize: pageSize,
    tag: tag,
    lang: lang,
    fields: ["prefix.autocomplete^12", "titles^3", "descriptions^1.5"]
  };

  try {
    const searchResponse = await ElasticService.search('vocabulary', options);

    // 2. Construir el objeto "results" EXACTAMENTE como lo pide el .jade
    const resultsForView = {
      results: searchResponse.results || [],
      total_results: searchResponse.total_results || 0,
      queryString: query,
      page: page,
      page_size: pageSize,
      // Esta es la parte que hacía fallar la línea 64:
      filters: {
        tag: tag || undefined,
        lang: lang || undefined
      },
      // Agregaciones para los faceteados laterales
      aggregations: searchResponse.aggregations || {
        tags: { buckets: [] },
        langs: { buckets: [] }
      }
    };

    // 3. Lista de prefijos para el log de eventos (línea 61 del jade)
    const resultsList = (searchResponse.results || []).map(item =>
        item._source ? item._source.prefix : ""
    ).join(',');

    res.render("vocabularies/index", {
      results: resultsForView,
      resultsList: resultsList,
      placeholder: "Search for a vocabulary...",
      req: req, // Necesario para req.sessionID en el script del jade
      utils: require('../../lib/utils'),
      app_name_shorcut: "LOV",
      app_name: "Linked Open Vocabularies"
    });

  } catch (err) {
    console.error("Critical Render Error:", err);
    res.status(500).render("500", {
      app_name: "LOV",
      app_name_shorcut: "LOV",
      utils: require('../../lib/utils')
    });
  }
};

/**
 * Search for vocabulary used by the /patterns UI
 */
exports.searchVocabularyPatterns = function (req, res, esclient) {
  return execSearchVocabulary(
    esclient,
    req.query.q,
    req.query.page_size,
    req.query.page,
    req.query.tag,
    req.query.tag_limit,
    req.query.lang,
    req.query.lang_limit,
    function (err, results) {
      if (err)
        return res.render("500", {
          app_name_shorcut: app_name_shorcut,
          app_name: app_name,
        });
      //store log in DB
      /*var log = new LogSearch({searchWords: req.query.q,
      searchURL: req.originalUrl,
      date: new Date(),
      category: "vocabularySearch",
      method: "ui",
      nbResults: results.total_results  });//console.log(log);
    log.save(function (err){if(err)console.log(err)});*/
      var arr = [];
      for (var i = 0; i < results.results.length; i++) {
        arr.push(results.results[i]._source.prefix);
      }
      res.render("patterns/index", {
        results: results,
        placeholder:
          placeholders[Math.floor(Math.random() * placeholders.length)],
        resultsList: arr,
        utils: utils,
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    }
  );
};

/**
 * Search for agent used by the /agents UI
 */
exports.searchAgent = async function (req, res) {
  const query = req.query.q || "";
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || 15;
  const type = req.query.type; // 'person', 'organization' o null (ambos)
  const tag = req.query.tag;

  const options = {
    queryString: query,
    page: page,
    pageSize: pageSize,
    tag: tag,
    // Usamos el campo correcto para agentes según tu mapping
    fields: ["name^5", "alternativeNames^2"]
  };

  try {
    // Si 'type' viene definido (person u organization), buscamos en ese.
    // Si no, buscamos en ambos simultáneamente.
    const searchType = type || 'agent';
    const searchResponse = await ElasticService.search(searchType, options);

    const resultsForView = {
      results: searchResponse.results || [],
      total_results: searchResponse.total_results || 0,
      queryString: query,
      page: page,
      page_size: pageSize,
      filters: {
        type: type,
        tag: tag
      },
      aggregations: searchResponse.aggregations || {
        tags: { buckets: [] }
      }
    };

    res.render("agents/index", {
      results: resultsForView,
      placeholder: "Search for a person or organization...",
      req: req,
      utils: require('../../lib/utils'),
      app_name_shorcut: "LOV",
      app_name: "Linked Open Vocabularies"
    });

  } catch (err) {
    console.error("Agent Search Error:", err);
    res.status(500).render("500", { app_name: "LOV" });
  }
};

/**
 * Full text search used by Vocabs API
 */
exports.apiSearchVocabs = function (req, res, esclient) {
  if (!req.query.q) {
    //control that q param is present
    return standardBadRequestHandler(
      req,
      res,
      "Query parameter missing. Syntax: ?q=querytext"
    );
  } else {
    return execSearchVocabulary(
      esclient,
      req.query.q,
      req.query.page_size,
      req.query.page,
      req.query.tag,
      req.query.tag_limit,
      req.query.lang,
      req.query.lang_limit,
      function (err, results) {
        //store log in DB
        /*var log = new LogSearch({searchWords: req.query.q,
          searchURL: req.originalUrl,
          date: new Date(),
          category: "vocabularySearch",
          method: "api",
          nbResults: results.total_results  });//console.log(log);
        log.save(function (err){if(err)console.log(err)});*/
        return standardCallback(req, res, err, results);
      }
    );
  }
};

/**
 * Full text search used by Agents API
 */
exports.apiSearchAgent = function (req, res, esclient) {
  if (!req.query.q) {
    //control that q param is present
    return standardBadRequestHandler(
      req,
      res,
      "Query parameter missing. Syntax: ?q=querytext"
    );
  } else {
    return execSearchAgent(
      esclient,
      req.query.q,
      req.query.page_size,
      req.query.page,
      req.query.type,
      req.query.tag,
      req.query.tag_limit,
      function (err, results) {
        //store log in DB
        /*var log = new LogSearch({searchWords: req.query.q,
          searchURL: req.originalUrl,
          date: new Date(),
          category: "agentSearch",
          method: "api",
          nbResults: results.total_results  });//console.log(log);
        log.save(function (err){if(err)console.log(err)});*/
        return standardCallback(req, res, err, results);
      }
    );
  }
};

// controllers/search.js
exports.apiResources = function (req, res, esclient) {
  const vocab = req.params.artefact;
  const types = "class,property,datatype,instance";

  if (!vocab) {
    return res.status(400).send("You must provide a vocabulary ID in the URL");
  }

  execSearch(
    esclient,
    "", // query vacío
    1000,
    1,
    types,
    vocab,
    10,
    null,
    10,
    function (err, result) {
      if (err) return res.status(500).send(err);
      return res.status(200).json(result.results);
    }
  );
};

exports.apiSingleResource = function (req, res, esclient) {
  const vocab = req.params.artefact;
  const resourceId = req.params.resource;

  if (!vocab || !resourceId) {
    return res
      .status(400)
      .send("You must provide both vocabulary ID and resource ID in the URL");
  }

  esclient
    .search({
      index: "lov",
      body: {
        size: 1,
        query: {
          bool: {
            must: [
              { match_phrase: { "vocabulary.prefix": vocab } },
              { match_phrase: { prefixedName: resourceId } },
            ],
          },
        },
      },
    })
    .then((result) => {
      const hits = result.hits?.hits;
      if (!hits || hits.length === 0) {
        return res.status(404).send("Resource not found");
      }
      return res.status(200).json(hits[0]._source); // o hits[0].fields si usas "fields"
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).send("Elasticsearch query failed");
    });
};

exports.apiResourcesByType = function (req, res, esclient) {
  const vocab = req.params.vocab;
  const type = req.params.type;

  if (!vocab || !type) {
    return res
      .status(400)
      .send("You must provide both vocabulary ID and resource type in the URL");
  }

  execSearch(
    esclient,
    "", // queryString vacío
    1000, // page_size
    1, // page
    type, // tipo explícito: class, property, etc.
    vocab,
    10, // vocab_limit
    null,
    10,
    function (err, result) {
      if (err) return res.status(500).send(err);

      const resources = result.results;
      return res.status(200).json(resources);
    }
  );
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
    return execSearch(
      esclient,
      req.query.q,
      req.query.page_size,
      req.query.page,
      req.query.type,
      req.query.vocab,
      req.query.vocab_limit,
      req.query.tag,
      req.query.tag_limit,
      function (err, results) {
        //store log in DB
        /* var log = new LogSearch({searchWords: req.query.q,
        searchURL: req.originalUrl,
        date: new Date(),
        category: "termSearch",
        method: "api",
        nbResults: results.total_results  });//console.log(log);
      log.save(function (err){if(err)console.log(err)});*/
        return standardCallback(req, res, err, results);
      }
    );
  }
};

exports.apiSearchMetadata = function (req, res, esclient) {
  if (!req.query.q) {
    return res
      .status(400)
      .send("Query parameter missing. Syntax: ?q=querytext");
  }

  const queryString = req.query.q;
  const type = req.query.type;
  const vocab = req.query.vocab;
  const page_size = req.query.page_size;
  const page = req.query.page;

  // Reutilizamos execSearch pero con campos personalizados
  execSearch(
    esclient,
    queryString,
    page_size,
    page,
    type,
    vocab,
    10, // vocab_limit
    null, // tag
    10, // tag_limit
    function (err, result) {
      if (err) return res.status(500).send(err);
      return res.status(200).json(result);
    },
    null // ← campos específicos
  );
};

/**
 * Terms Autocomplete API
 */
exports.apiAutocompleteTerms = function (req, res, esclient) {
  if (!req.query.q) {
    //control that q param is present
    return standardBadRequestHandler(
      req,
      res,
      "Query parameter missing. Syntax: ?q=querytext"
    );
  } else {
    return execAutocompleteTerms(
      esclient,
      req.query.q,
      req.query.page_size,
      req.query.page,
      req.query.type,
      function (err, results) {
        //shall we log this or not?
        return standardCallback(req, res, err, results);
      }
    );
  }
};

/**
 * Vocabulary Autocomplete API
 */
exports.apiAutocompleteVocabs = function (req, res, esclient) {
  if (!req.query.q) {
    //control that q param is present
    return standardBadRequestHandler(
      req,
      res,
      "Query parameter missing. Syntax: ?q=querytext"
    );
  } else {
      return execAutocompleteVocabularies(
        esclient,
        req.query.q,
        req.query.page_size,
        req.query.page,
        req.query.include_versions,
        function (err, results) {
          return standardCallback(req, res, err, results);
        }
      );
  }
};

/**
 * Terms Suggest API
 */
exports.apiSuggestTerms = function (req, res, esclient) {
  if (!req.query.q) {
    //control that q param is present
    return standardBadRequestHandler(
      req,
      res,
      "Query parameter missing. Syntax: ?q=querytext"
    );
  } else {
    return execSuggestTerms(
      esclient,
      req.query.q,
      req.query.page_size,
      req.query.type,
      function (err, results) {
        //shall we log this or not?
        return standardCallback(req, res, err, results);
      }
    );
  }
};

/* ************
  FUNCTIONS
************ */
/**
 * Execution of a full text search
 */
function execSearch(
    client,
    queryString,
    page_size,
    page,
    type,
    vocab,
    vocab_limit,
    tag,
    tag_limit,
    callback
) {
  // --- 1. Validaciones y Saneamiento ---
  const v_limit = (parseInt(vocab_limit) > 0) ? parseInt(vocab_limit) : 10;
  const t_limit = (parseInt(tag_limit) > 0) ? parseInt(tag_limit) : 10;
  const p_size = (parseInt(page_size) > 0) ? parseInt(page_size) : 10;
  const p_current = (parseInt(page) > 0) ? parseInt(page) : 1;

  // Mapeo de índices a SINGULAR (Coherente con el resto del sistema)
  const search_type = type || "class,property";
  let indicesToSearch = [];
  if (search_type.includes("class")) indicesToSearch.push("lov_class");
  if (search_type.includes("property")) indicesToSearch.push("lov_property");
  if (search_type.includes("datatype")) indicesToSearch.push("lov_datatype");
  if (search_type.includes("vocabulary")) indicesToSearch.push("lov_vocabulary");

  const indexName = indicesToSearch.length > 0 ? indicesToSearch.join(',') : "lov_class,lov_property,lov_datatype";

  // --- 2. Pesos de Scoring ---
  const weights = {
    hit: 1.0,
    occ: 0.3,
    dat: 0.5,
    localName: 12,
    primLabel: 3,
    secLabel: 1.5,
    vocabInfo: 1
  };

  const fieldToSearchOn = [
    `localName.ngram^${weights.localName}`,
    `label*^${weights.primLabel}`,
    `comment*^${weights.secLabel}`,
    `vocabulary.prefix^${weights.vocabInfo}`
  ];

  // --- 3. Construcción de Filtros (USANDO .keyword) ---
  let mustFilters = [];
  if (vocab && vocab !== "null") {
    mustFilters.push({ term: { "vocabulary.prefix.keyword": vocab } });
  }
  if (tag && tag !== "null") {
    tag.split(",").forEach(t => {
      mustFilters.push({
        bool: {
          should: [
            { term: { "tags.keyword": t.trim() } },
            { term: { "vocabulary.tags.keyword": t.trim() } }
          ]
        }
      });
    });
  }

  const baseQuery = {
    bool: {
      must: queryString ? {
        multi_match: {
          query: queryString,
          fields: fieldToSearchOn,
          type: "best_fields"
        }
      } : { match_all: {} },
      filter: mustFilters
    }
  };

  // --- 4. PRIMERA QUERY: Obtener máximos para normalización del Score ---
  client.search({
    index: indexName,
    body: {
      size: 0,
      query: baseQuery,
      aggregations: {
        max_occurrences: { max: { field: "metrics.occurrencesInDatasets" } },
        max_nbDatasets: { max: { field: "metrics.reusedByDatasets" } }
      }
    }
  })
      .then(aggData => {
        const maxOcc = (aggData.aggregations.max_occurrences.value > 0) ? aggData.aggregations.max_occurrences.value : 1;
        const maxDatasets = (aggData.aggregations.max_nbDatasets.value > 0) ? aggData.aggregations.max_nbDatasets.value : 1;
        const maxScore = (aggData.hits.max_score > 0) ? aggData.hits.max_score : 1.0;

        // --- 5. SEGUNDA QUERY: Búsqueda con Painless y Agregaciones ---
        return client.search({
          index: indexName,
          body: {
            from: (p_current - 1) * p_size,
            size: p_size,
            _source: ["uri", "prefixedName", "vocabulary.prefix", "metrics", "type", "tags"],
            query: {
              function_score: {
                query: baseQuery,
                boost_mode: "replace",
                script_score: {
                  script: {
                    lang: "painless",
                    params: {
                      p_maxScore: maxScore,
                      p_maxOcc: maxOcc,
                      p_maxDatasets: maxDatasets,
                      wHit: weights.hit,
                      wOcc: weights.occ,
                      wDat: weights.dat
                    },
                    source: `
                      double s = _score / (double)params.p_maxScore;
                      double occVal = doc.containsKey('metrics.occurrencesInDatasets') && !doc['metrics.occurrencesInDatasets'].empty ? (double)doc['metrics.occurrencesInDatasets'].value : 0.0;
                      double datVal = doc.containsKey('metrics.reusedByDatasets') && !doc['metrics.reusedByDatasets'].empty ? (double)doc['metrics.reusedByDatasets'].value : 0.0;
                      double occ = Math.sqrt(occVal / (double)params.p_maxOcc);
                      double dat = Math.sqrt(datVal / (double)params.p_maxDatasets);
                      return (s * params.wHit + occ * params.wOcc + dat * params.wDat) / (params.wHit + params.wOcc + params.wDat);
                    `
                  }
                }
              }
            },
            highlight: {
              pre_tags: ["<b>"],
              post_tags: ["</b>"],
              fields: {
                "localName.ngram": {},
                "label*": {},
                "vocabulary.prefix": {}
              }
            },
            aggregations: {
              // ESTA ES LA PARTE QUE EVITA EL ERROR EN JADE
              types: {
                filters: {
                  filters: {
                    class: { term: { _index: "lov_class" } },
                    property: { term: { _index: "lov_property" } },
                    datatype: { term: { _index: "lov_datatype" } },
                    vocabulary: { term: { _index: "lov_vocabulary" } }
                  }
                }
              },
              vocabs: { terms: { field: "vocabulary.prefix.keyword", size: v_limit } },
              tags: { terms: { field: "tags.keyword", size: t_limit } }
            }
          }
        });
      })
      .then(data => {
        // --- 6. Formateo Final para la Vista ---
        const filters = {};
        if (search_type.indexOf(",") < 0) filters.type = search_type;
        if (vocab && vocab !== "null") filters.vocab = vocab;
        if (tag && tag !== "null") filters.tag = tag;

        // Transformamos los buckets de 'filters' a la estructura que Jade espera
        const typeBuckets = [];
        for (const [key, value] of Object.entries(data.aggregations.types.buckets)) {
          if (value.doc_count > 0) {
            typeBuckets.push({ key: key, doc_count: value.doc_count });
          }
        }
        data.aggregations.types.buckets = typeBuckets;

        const results = data.hits.hits.map(hit => {
          let x = hit._source;
          x.score = hit._score;
          x.highlight = hit.highlight;
          if (!x.type) {
            if (hit._index.includes('class')) x.type = 'class';
            else if (hit._index.includes('property')) x.type = 'property';
            else if (hit._index.includes('datatype')) x.type = 'datatype';
            else if (hit._index.includes('vocabulary')) x.type = 'vocabulary';
          }
          return x;
        });

        const finalResponse = {
          total_results: (typeof data.hits.total === 'object') ? data.hits.total.value : data.hits.total,
          page: p_current,
          page_size: p_size,
          queryString: queryString,
          filters: filters,
          aggregations: data.aggregations,
          results: results
        };

        callback(null, finalResponse);
      })
      .catch(err => {
        console.error("Error en execSearch:", err);
        callback(err, null);
      });
}
/**
 * Execution of a search on vocabularies
 */
function execSearchVocabulary(
    client,
    queryString,
    page_size,
    page,
    tag,
    tag_limit,
    lang,
    lang_limit,
    callback
) {
  // --- Configuración de parámetros por defecto ---
  tag_limit = (parseInt(tag_limit) >= 0) ? parseInt(tag_limit) : 10;
  lang_limit = (parseInt(lang_limit) >= 0) ? parseInt(lang_limit) : 10;
  page_size = (parseInt(page_size) > 0) ? parseInt(page_size) : 15;
  page = (parseInt(page) > 0) ? parseInt(page) : 1;

  /* Pesos para el score */
  var weightLocalName = 12;
  var weightPrimLabel = 3;
  var weightSecLabel = 1.5;

  var fieldToSearchOn = [
    "prefix.autocomplete^" + weightLocalName,
    "http://purl.org/dc/terms/title*^" + weightPrimLabel,
    "http://purl.org/dc/terms/description*^" + weightSecLabel,
  ];

  /* 1. Construcción dinámica de FILTROS (Moderno: Array de objetos) */
  var filterArray = [];
  if (tag && tag !== "null") {
    tag.split(",").forEach(t => {
      filterArray.push({ term: { "tags": t.trim() } });
    });
  }
  if (lang && lang !== "null") {
    lang.split(",").forEach(l => {
      filterArray.push({ term: { "langs": l.trim() } });
    });
  }

  /* 2. Construcción del Body de la Query (Formato Bool para ES 9.x) */
  var queryBody = {
    from: (page - 1) * page_size,
    size: page_size,
    query: {
      bool: {
        must: (function() {
          if (queryString && queryString.length > 0) {
            return {
              multi_match: {
                query: queryString,
                type: "best_fields",
                fields: fieldToSearchOn,
              }
            };
          } else {
            return { match_all: {} };
          }
        })(),
        filter: filterArray // Aquí van los tags y langs
      }
    },
    sort: (function() {
      if (queryString && queryString.length > 0) {
        return [{ _score: { order: "desc" } }];
      } else {
        return [{ "prefix.keyword": { order: "asc" } }]; // Usamos .keyword para sort
      }
    })(),
    aggregations: {
      tags: { terms: { field: "tags.keyword", size: tag_limit } },
      langs: { terms: { field: "langs.keyword", size: lang_limit } }
    }
  };

  /* 3. Ejecución (Sin el parámetro 'type') */
  return client.search({
    index: indexName, // Solo el índice, el type causa el error 400
    body: queryBody
  })
      .then((data) => {
        var hits = data.hits;
        var filters = {};
        if (tag && tag !== "null") filters.tag = tag;
        if (lang && lang !== "null") filters.lang = lang;

        var result = {
          total_results: typeof hits.total === 'object' ? hits.total.value : hits.total,
          page: page,
          page_size: page_size,
          queryString: queryString,
          filters: filters,
          aggregations: data.aggregations,
          results: hits.hits
        };
        return callback(null, result);
      })
      .catch((error) => {
        console.error("Error en execSearchVocabulary:", error);
        return callback(error, null);
      });
}

/**
 * Execution of a search on agent
 */
function execSearchAgent(
  client,
  queryString,
  page_size,
  page,
  type,
  tag,
  tag_limit,
  callback
) {
  if (
    !tag_limit ||
    (!parseInt(tag_limit) && tag_limit !== "0") ||
    parseInt(page_size) < 1
  )
    tag_limit = 10;
  if (!type) type = "person,organization";
  if (
    !page_size ||
    (!parseInt(page_size) && page_size !== "0") ||
    parseInt(page_size) < 1
  )
    page_size = 15;
  if (!page || (!parseInt(page) && page !== "0") || parseInt(page) < 1)
    page = 1;
  page = parseInt(page, 10) || 1;

  /* fields concerned by the query and their corresponding boost */
  var fieldToSearchOn = ["name.ngram"];

  /* dynamic build of the filters using tag values */
  var filter = "[";
  if (tag != null) {
    if (filter.length > 1) filter = filter + ",";
    var tagsplit = tag.split(",");
    for (i = 0; i < tagsplit.length; i++) {
      if (tagsplit.length > 0 && i > 0) filter = filter + ",";
      filter = filter + '{"term":{"tags2.label":"' + tagsplit[i] + '"}}';
    }
  }
  filter = eval("(" + filter + "]" + ")");

  var q = {
    from: (page - 1) * page_size,
    size: page_size,
    query: (function () {
      /* In case we have a vocabulary or tag filter, we are using a filtered query */
      if (tag != null) {
        return {
          filtered: {
            query: (function () {
              if (queryString && queryString.length > 0) {
                return {
                  multi_match: {
                    query: queryString,
                    fields: fieldToSearchOn,
                  },
                };
              } else {
                return {
                  match_all: {},
                };
              }
            })(),
            filter: { bool: { must: filter } },
          },
        };
      } else {
        return (function () {
          if (queryString && queryString.length > 0) {
            return {
              multi_match: {
                query: queryString,
                fields: fieldToSearchOn,
              },
            };
          } else {
            return {
              match_all: {},
            };
          }
        })();
      }
    })(),
    sort: [{ name: { order: "asc" } }],
    aggregations: {
      types: {
        terms: {
          field: "_type",
          size: 10,
        },
      },
      tags: {
        terms: {
          //field: "tags.label",
          field: "tags2.label",
          size: parseInt(tag_limit),
        },
      },
    },
  };
  /* build and return the result JSON object */
  return (
    client
      //.search(indexName, type, q)
      .search({
        index: indexName,
        type: type,
        body: q,
      })
      .then((data) => {
        var parsed, result;
        //parsed = JSON.parse(data).hits;
        parsed = data.hits;
        /* filters are the parameters sent by the client to filter the query results */
        var filters = {};
        if (tag != "null") filters.tag = tag;
        if (type != "null" && type.indexOf(",") < 0) filters.type = type;

        result = {
          total_results: parsed.total,
          page: page,
          page_size: page_size,
          queryString: queryString,
          filters: filters,
          //aggregations: JSON.parse(data).aggregations,
          aggregations: data.aggregations,
          results: parsed.hits,
        };
        return callback(null, result);
      })
      .catch((error) => {
        return callback(error, null);
      })
  );
}

/* return results from autocompletion on terms types */
function execAutocompleteTerms(
  client,
  queryString,
  page_size,
  page,
  type,
  callback
) {
  if (!type) type = "class,property,instance,datatype";
  if (!page || (!parseInt(page) && page !== "0") || parseInt(page) < 1)
    page = 1;
  page = parseInt(page, 10) || 1;
  if (
    !page_size ||
    (!parseInt(page_size) && page_size !== "0") ||
    parseInt(page_size) < 1
  )
    page_size = 10;

  /* issue the autocomplete with the edge-ngram analyzed fields suffixed with .autocomplete */
  var q = {
    from: (page - 1) * page_size,
    size: page_size,
    fields: ["uri", "prefixedName", "localName"],
    query: {
      multi_match: {
        query: queryString,
        fields: ["prefixedName.autocomplete", "uri.autocomplete"],
      },
    },
  };
  return (
    client
      //.search(indexName, type, q)
      .search({
        index: indexName,
        type: type,
        body: q,
      })
      .then((data) => {
        var hit, parsed, result, x;
        //parsed = JSON.parse(data).hits;
        parsed = data.hits;
        result = {
          total_results: parsed.total,
          page: page,
          page_size: page_size,
          results: (function () {
            var results = [];
            for (var i = 0; i < parsed.hits.length; i++) {
              hit = parsed.hits[i];
              x = hit.fields;
              x.type = hit._type;
              x.score = hit._score;
              results.push(x);
            }
            return results;
          })(),
        };
        return callback(null, result);
      })
      .catch((error) => {
        return callback(error, null);
      })
  );
}

/* return results from autocompletion on vocabulary type */
function execAutocompleteVocabularies(
  client,
  queryString,
  page_size,
  page,
  include_versions,
  callback
) {
  if (!page || (!parseInt(page) && page !== "0") || parseInt(page) < 1) page = 1;
  page = parseInt(page, 10) || 1;

  if (!page_size || (!parseInt(page_size) && page_size !== "0") || parseInt(page_size) < 1)
    page_size = 10;
  page_size = parseInt(page_size, 10) || 10;

  var q = {
    from: (page - 1) * page_size,
    size: page_size,
    fields: ["uri", "prefix", "http://purl.org/dc/terms/title@en"],
    query: {
      multi_match: {
        query: queryString,
        fields: ["prefix.autocomplete", "uri.autocomplete"],
      },
    },
  };

  return client
    .search({
      index: indexName,
      body: q,
    })
    .then(async (data) => {
      var parsed = data.hits;

      var results = [];
      for (var i = 0; i < parsed.hits.length; i++) {
        var hit = parsed.hits[i];
        var x = hit.fields || {};
        x.score = hit._score;
        results.push(x);
      }

      const mustIncludeVersions = true;

      if (mustIncludeVersions && results.length > 0) {
        const prefixes = results
          .map((r) => (Array.isArray(r.prefix) ? r.prefix[0] : r.prefix))
          .filter(Boolean);

        if (prefixes.length > 0) {
          const vocabDocs = await Vocabulary.find(
            { prefix: { $in: prefixes } },
            { prefix: 1, versions: 1, _id: 0 }
          ).lean();

          const versionsByPrefix = {};
          for (const doc of vocabDocs) {
            versionsByPrefix[doc.prefix] = (doc.versions || []).map((v) => ({
              name: v.name,
              issued: v.issued,
              isReviewed: v.isReviewed,
            }));
          }

          for (const r of results) {
            const p = Array.isArray(r.prefix) ? r.prefix[0] : r.prefix;
            r.versions = versionsByPrefix[p] || [];
          }
        }
      }

      var result = {
        total_results: parsed.total,
        page: page,
        page_size: page_size,
        results: results,
      };

      return callback(null, result);
    })
    .catch((error) => {
      return callback(error, null);
    });
}


/* return suggestions close to the input term */
function execSuggestTerms(client, queryString, suggest_size, type, callback) {
  if (!type) type = "class,property,instance,datatype";
  if (
    !suggest_size ||
    (!parseInt(suggest_size) && suggest_size !== "0") ||
    parseInt(suggest_size) < 1
  )
    suggest_size = 5;

  if (queryString == undefined) {
    queryString = "";
  }

  /* issue the suggestion on the rdfs:label@en field */
  var q = {
    size: 0,
    suggest: {
      termSuggestion: {
        text: queryString,
        term: {
          sort: "frequency",
          field: "http://www.w3.org/2000/01/rdf-schema#label@en",
          suggest_mode: "always",
        },
      },
    },
  };
  return (
    client
      //.search(indexName, type, q)
      .search({
        index: indexName,
        type: type,
        body: q,
      })
      .then((data) => {
        var suggestions, result;
        if (
          /*JSON.parse(data).suggest &&
        JSON.parse(data).suggest.termSuggestion &&
        JSON.parse(data).suggest.termSuggestion.length > 0*/
          data.suggest &&
          data.suggest.termSuggestion &&
          data.suggest.termSuggestion.length > 0
        )
          //suggestions = JSON.parse(data).suggest.termSuggestion[0].options;
          suggestions = data.suggest.termSuggestion[0].options;
        result = {
          suggestions: suggestions,
        };
        return callback(null, result);
      })
      .catch((error) => {
        return callback(error, null);
      })
  );
}

/* return suggestions close to the input term */
function execAutocompleteLabelsTerms(
  client,
  queryString,
  suggest_size,
  callback
) {
  if (
    !suggest_size ||
    (!parseInt(suggest_size) && suggest_size !== "0") ||
    parseInt(suggest_size) < 1
  )
    suggest_size = 5;

  /* issue the suggestion on the rdfs:label@en field */
  var q = {
    index: "lov",
    body: {
      autocomplete: {
        text: queryString,
        completion: {
          field: "labelsWithoutLang",
        },
      },
    },
  };
  return client.suggest(q, function (err, data) {
    if (err) return callback(error, null);
    var hit, parsed, result, text;
    parsed = data.autocomplete[0];
    result = {
      suggestions: (function () {
        var results = [];
        for (var i = 0; i < parsed.options.length; i++) {
          text = parsed.options[i].text;
          results.push(text);
        }
        return results;
      })(),
    };
    return callback(null, result);
  });
}

/**
 * Terms Autocomplete Labels API
 */
exports.apiAutocompleteLabelsTerms = function (req, res, esclient) {
  if (!req.query.q) {
    //control that q param is present
    return standardBadRequestHandler(
      req,
      res,
      "Query parameter missing. Syntax: ?q=querytext"
    );
  } else {
    var query = {
      index: "lov",
      body: {
        autocomplete: {
          text: req.query.q,
          completion: {
            field: "labelsWithoutLang",
          },
        },
      },
    };

    if (!esclient || typeof esclient.suggest !== "function") {
      return res.status(503).json({
        error: "Search backend unavailable",
        details: "Autocomplete labels is not supported by current ES client",
      });
    }

    esclient
      .suggest(query)
      .then(function (resp) {
        res.header("Content-type", "application/json; charset=utf-8");
        res.json(resp.autocomplete[0].options);
      })
      .catch(function (err) {
        return standardCallback(req, res, err, null);
      });
  }
};

/* return a notification of a bad request */
function standardBadRequestHandler(req, res, helpText) {
  res.set("Content-Type", "text/plain");
  return res.status(400).send(helpText);
}

/* depending on result, send the appropriate response code */
function standardCallback(req, res, err, results) {
  if (err != null) {
    var errMessage = err && err.message ? err.message : String(err);
    var errDump = "";
    try {
      errDump = JSON.stringify(err);
    } catch (e) {
      errDump = String(err);
    }
    var errText = (errMessage + " " + errDump).toLowerCase();
    if (
      /econnrefused|no living connections|enotfound|ehostunreach|connectionfault|responseerror|index_not_found_exception|search_phase_execution_exception|unsupported by current es client/.test(
        errText
      )
    ) {
      return res
        .status(503)
        .json({ error: "Search backend unavailable", details: errMessage });
    }
    return res.status(500).send(err);
  } else if (!(results != null)) {
    return res.status(404).send("API returned no results");
  } else {
    res.header("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(results);
  }
}

/**
 * Full text search used by the API
 */
exports.apiSearchScoreExplain = function (req, res, esclient) {
  if (!req.query.q) {
    //control that q param is present
    return standardBadRequestHandler(
      req,
      res,
      "Query parameter missing. Syntax: ?q=querytext"
    );
  } else {
    return execSearchScoreExplain(
      esclient,
      req.query.q,
      req.query.page_size,
      req.query.page,
      req.query.type,
      req.query.vocab,
      req.query.vocab_limit,
      req.query.tag,
      req.query.tag_limit,
      function (err, results) {
        return standardCallback(req, res, err, results);
      }
    );
  }
};

/**
 * Execution of a full text search with score explaination
 */
function execSearchScoreExplain(
  client,
  queryString,
  page_size,
  page,
  type,
  vocab,
  vocab_limit,
  tag,
  tag_limit,
  callback
) {
  if (
    !vocab_limit ||
    (!parseInt(vocab_limit) && vocab_limit !== "0") ||
    parseInt(page_size) < 1
  )
    vocab_limit = 10;
  if (
    !tag_limit ||
    (!parseInt(tag_limit) && tag_limit !== "0") ||
    parseInt(page_size) < 1
  )
    tag_limit = 10;
  if (!type) type = "class,property";
  if (
    !page_size ||
    (!parseInt(page_size) && page_size !== "0") ||
    parseInt(page_size) < 1
  )
    page_size = 10;
  if (!page || (!parseInt(page) && page !== "0") || parseInt(page) < 1)
    page = 1;
  page = parseInt(page, 10) || 1;

  /* Weights for subparts of the score function */
  var wHitScore = parseFloat(1.0); /* weight given to the similarity score */
  var wOccScore =
    parseFloat(0.3); /* weight given to the frequence of the term in LOD */
  var wDatScore =
    parseFloat(
      0.5
    ); /* weight given to the number of datasets (in LOD) having at least one instance of the term */

  /* Weights for each field type in the score function */
  var weightLocalName = 12; /* the local name of a URI */
  var weightPrimLabel = 3; /* primary label includes rdfs:label, dcterms:title, dce:title, skos:prefLabel */
  var weightSecLabel = 1.5; /* secondary label includes rdfs:comment, dcterms:description, dce:description, skos:altLabel */
  var weightVocabularyInfo = 1; /* weight for matches on fields belonging to the vocabulary document of a vocabulary term */

  /* fields concerned by the query and their corresponding boost */
  var fieldToSearchOn = [
    "http://www.*",
    "localName.ngram^" + weightLocalName,
    "http://www.w3.org/2000/01/rdf-schema#label*^" + weightPrimLabel,
    "http://purl.org/dc/terms/title*^" + weightPrimLabel,
    "http://purl.org/dc/elements/1.1/title*^" + weightPrimLabel,
    "http://www.w3.org/2004/02/skos/core#prefLabel*^" + weightPrimLabel,
    "http://www.w3.org/2000/01/rdf-schema#comment*^" + weightSecLabel,
    "http://purl.org/dc/terms/description*^" + weightSecLabel,
    "http://purl.org/dc/elements/1.1/description*^" + weightSecLabel,
    "http://www.w3.org/2004/02/skos/core#altLabel*^" + weightSecLabel,
    "vocabulary.*^" + weightVocabularyInfo,
  ];

  /* dynamic build of the filters using vocab and tag values */
  var filter = "[";
  if (vocab != null)
    filter = filter + '{"term":{"vocabulary.prefix":"' + vocab + '"}}';
  if (tag != null) {
    if (filter.length > 1) filter = filter + ",";
    var tagsplit = tag.split(",");
    for (i = 0; i < tagsplit.length; i++) {
      if (tagsplit.length > 0 && i > 0) filter = filter + ",";
      filter = filter + '{"term":{"tags":"' + tagsplit[i] + '"}}';
    }
  }
  filter = eval("(" + filter + "]" + ")");

  /* The first query is used to get the aggregation max value for occurrencesInDatasets and reusedByDatasets metrics */
  var qAgg = {
    size: 1,
    fields: [
      "uri",
      "prefixedName",
      "vocabulary.prefix",
      "metrics.occurrencesInDatasets",
      "metrics.reusedByDatasets",
    ],
    query: (function () {
      if (vocab != null || tag != null) {
        /* case we have a filters to apply */
        return {
          filtered: {
            query: (function () {
              if (queryString && queryString.length > 0) {
                return {
                  multi_match: {
                    query: queryString,
                    fields: fieldToSearchOn,
                  },
                };
              } else {
                return {
                  match_all: {},
                };
              }
            })(),
            filter: { bool: { must: filter } },
          },
        };
      } else {
        /* if no filter */
        if (queryString && queryString.length > 0) {
          return {
            multi_match: {
              query: queryString,
              fields: fieldToSearchOn,
            },
          };
        } else {
          return {
            match_all: {},
          };
        }
      }
    })(),
    aggregations: {
      max_occurrences: { max: { field: "metrics.occurrencesInDatasets" } },
      max_nbDatasets: { max: { field: "metrics.reusedByDatasets" } },
    },
  };
  var aggReq;
  try {
    aggReq = client.search(indexName, type, qAgg);
  } catch (error) {
    return callback(error, null);
  }

  if (!aggReq || typeof aggReq.on !== "function" || typeof aggReq.exec !== "function") {
    if (aggReq && typeof aggReq.catch === "function") {
      aggReq.catch(function () {});
    }
    return callback(
      new Error("Search score explain unsupported by current ES client"),
      null
    );
  }

  aggReq.on("data", function (data) {
      /* get the max values from the aggregations of the previous query */
      var maxOcc = parseFloat(
        JSON.parse(data).aggregations.max_occurrences.value
      );
      var maxDatasets = parseFloat(
        JSON.parse(data).aggregations.max_nbDatasets.value
      );
      var maxScore = parseFloat(JSON.parse(data).hits.max_score);

      /* Define the core of the query */
      var qCore = {
        function_score: {
          boost_mode: "replace",
          query: {
            multi_match: {
              query: queryString,
              fields: fieldToSearchOn,
            },
          },
          script_score: {
            lang: "groovy",
            params: {
              maxScore: maxScore,
              wHitScore: parseFloat(wHitScore),
              wOccScore: parseFloat(wOccScore),
              wDatScore: parseFloat(wDatScore),
              maxOcc: maxOcc,
              maxDatasets: maxDatasets,
            },
            script:
              "maxOcc>>0 ? ((_score / maxScore) * wHitScore + sqrt( doc['metrics.occurrencesInDatasets'].value / maxOcc) * wOccScore + sqrt(doc['metrics.reusedByDatasets'].value / maxDatasets) * wDatScore) / (wHitScore+wOccScore+wDatScore) :_score",
          },
        },
      };

      var qCoreMatchAll = {
        function_score: {
          boost_mode: "replace",
          query: { match_all: {} },
          script_score: {
            lang: "groovy",
            params: {
              maxScore: maxScore,
              wHitScore: parseFloat(wHitScore),
              wOccScore: parseFloat(wOccScore),
              wDatScore: parseFloat(wDatScore),
              maxOcc: maxOcc,
              maxDatasets: maxDatasets,
            },
            script:
              "(maxOcc>>0 && maxDatasets>>0)? ((sqrt( doc['metrics.occurrencesInDatasets'].value / maxOcc) * wOccScore + sqrt(doc['metrics.reusedByDatasets'].value / maxDatasets) * wDatScore) / (wOccScore+wDatScore)): _score",
          },
        },
      };

      /* The second query inject the metrics max as parameters in the score function script */
      var q = {
        explain: true,
        from: (page - 1) * page_size,
        size: page_size,
        fields: [
          "uri",
          "prefixedName",
          "vocabulary.prefix",
          "metrics.occurrencesInDatasets",
          "metrics.reusedByDatasets",
        ],
        query: (function () {
          /* In case we have a vocabulary or tag filter, we are using a filtered query */
          if (vocab != null || tag != null) {
            return {
              filtered: {
                query: (function () {
                  if (queryString && queryString.length > 0) {
                    return qCore;
                  } else {
                    return qCoreMatchAll;
                  }
                })(),
                filter: { bool: { must: filter } },
              },
            };
          } else {
            return (function () {
              if (queryString && queryString.length > 0) {
                return qCore;
              } else {
                return qCoreMatchAll;
              }
            })();
          }
        })(),
        highlight: {
          pre_tags: ["<b>"],
          post_tags: ["</b>"],
          fragment_size: 50,
          number_of_fragments: 3,
          fields: [
            { "localName.ngram": {} },
            { "http*": {} },
            { "vocabulary.prefix": {} },
            { "vocabulary.http://purl.org/dc/terms/title*": {} },
            { "vocabulary.http://purl.org/dc/terms/description*": {} },
          ],
        },
        aggregations: {
          types: {
            terms: {
              field: "_type",
              size: 10,
            },
          },
          vocabs: {
            terms: {
              field: "vocabulary.prefix",
              size: parseInt(vocab_limit),
            },
          },
          tags: {
            terms: {
              field: "tags",
              size: parseInt(tag_limit),
            },
          },
        },
      };
      /* build and return the result JSON object */
      var searchReq;
      try {
        searchReq = client.search(indexName, type, q);
      } catch (error) {
        return callback(error, null);
      }

      if (
        !searchReq ||
        typeof searchReq.on !== "function" ||
        typeof searchReq.exec !== "function"
      ) {
        if (searchReq && typeof searchReq.catch === "function") {
          searchReq.catch(function () {});
        }
        return callback(
          new Error("Search score explain unsupported by current ES client"),
          null
        );
      }

      return searchReq
        .on("data", function (data) {
          var hit, parsed, result, x;
          parsed = JSON.parse(data).hits;

          /* filters are the parameters sent by the client to filter the query results */
          var filters = {};
          if (type != "null" && type.indexOf(",") < 0) filters.type = type;
          if (vocab != "null") filters.vocab = vocab;
          if (tag != "null") filters.tag = tag;

          result = {
            total_results: parsed.total,
            page: page,
            page_size: page_size,
            queryString: queryString,
            filters: filters,
            aggregations: JSON.parse(data).aggregations,
            results: (function () {
              var results = [];
              for (var i = 0; i < parsed.hits.length; i++) {
                hit = parsed.hits[i];
                var occD = parseFloat(
                  hit.fields["metrics.occurrencesInDatasets"][0]
                );
                var Dat = parseFloat(hit.fields["metrics.reusedByDatasets"][0]);
                var score = parseFloat(hit._score);
                x = hit.fields;
                x.type = hit._type;
                x.score = hit._score;
                x.highlight = hit.highlight;
                var occOp =
                  maxOcc > 0 ? Math.sqrt(occD / maxOcc) * wOccScore : 0;
                var datOp =
                  maxDatasets > 0
                    ? Math.sqrt(Dat / maxDatasets) * wDatScore
                    : 0;

                var scoreFeatureHit =
                  ((score * (wDatScore + wHitScore + wOccScore) -
                    occOp -
                    datOp) *
                    maxScore) /
                  wHitScore;
                var scoreFeaturePop =
                  score -
                  ((scoreFeatureHit / maxScore) * wHitScore) /
                    (wDatScore + wHitScore + wOccScore);

                var scoreFeatureHit_norm =
                  (scoreFeatureHit / maxScore) * wHitScore;
                var scoreFeaturePop_norm =
                  (occOp + datOp) / (wDatScore + wOccScore);

                x.scoreFeatureHit = scoreFeatureHit_norm;
                x.scoreFeaturePop = scoreFeaturePop_norm;
                results.push(x);
              }
              return results;
            })(),
          };
          return callback(null, result);
        })
        .on("error", function (error) {
          return callback(error, null);
        })
        .exec();
    });

  aggReq
    .on("error", function (error) {
      return callback(error, null);
    })
    .exec();
}
