/**
 * Module dependencies.
 */

var mongoose = require("mongoose"),
  env = process.env.NODE_ENV || "development",
  config = require("../../config/config")[env],
  Schema = mongoose.Schema;

/**
 * Getters
 */

var getTags = function (tags) {
  return tags.join(",");
};
var getCreatorIds = function (altUris) {
  return altUris.join(",");
};

/**
 * Setters
 */

var setTags = function (tags) {
  return tags.split(",");
};

/**
 * Article Schema
 */

var VocabularySchema = new Schema({
  uri: { type: String, trim: true },
  nsp: { type: String, trim: true },
  prefix: { type: String, trim: true },
  titles: [
    {
      value: { type: String, trim: true },
      lang: { type: String, trim: true },
    },
  ],
  descriptions: [
    {
      value: { type: String, trim: true },
      lang: { type: String, trim: true },
    },
  ],
  tags: [{ type: String, trim: true }],
  issuedAt: { type: Date }, //first publication of the vocabulary on the WEB (not in LOV)
  createdInLOVAt: { type: Date }, //creation of the record in LOV
  lastModifiedInLOVAt: { type: Date }, //last modification of the record in LOV (either by the BOT or a curator)
  lastDeref: { type: Date }, //Last date of successful dereferentiation by the BOT
  commentDeref: { type: String, trim: true }, //if !=null means there has been an error during the dereferentiation

  homepage: { type: String, trim: true },
  isDefinedBy: { type: String, trim: true },
  creatorIds: [{ type: String, ref: "Agent", trim: true }],
  contributorIds: [{ type: String, ref: "Agent", trim: true }],
  publisherIds: [{ type: String, ref: "Agent", trim: true }],
  reviews: [
    {
      body: { type: String, trim: true },
      agentId: { type: String, ref: "Agent", trim: true },
      createdAt: { type: Date },
    },
  ],
  versions: [
    {
      name: { type: String, trim: true },
      fileURL: { type: String, trim: true },
      diagramPath: { type: String, trim: true },
      issued: { type: Date },
      isReviewed: { type: Boolean, default: false },
      classNumber: { type: String, trim: true },
      propertyNumber: { type: String, trim: true },
      instanceNumber: { type: String, trim: true },
      datatypeNumber: { type: String, trim: true },
      languageIds: [{ type: String, ref: "Language", trim: true }],
      relMetadata: [{ type: String, trim: true }],
      relDisjunc: [{ type: String, trim: true }],
      relEquivalent: [{ type: String, trim: true }],
      relExtends: [{ type: String, trim: true }],
      relGeneralizes: [{ type: String, trim: true }],
      relImports: [{ type: String, trim: true }],
      relSpecializes: [{ type: String, trim: true }],
    },
  ],
  datasets: [
    {
      uri: { type: String, trim: true },
      label: { type: String, ref: "Agent" },
      occurrences: { type: String, trim: true },
    },
  ],

  /*
   * properties from statistics
   */
  nbIncomingLinks: { type: Number },
  incomRelMetadata: [{ type: String }],
  incomRelSpecializes: [{ type: String }],
  incomRelGeneralizes: [{ type: String }],
  incomRelExtends: [{ type: String }],
  incomRelEquivalent: [{ type: String }],
  incomRelDisjunc: [{ type: String }],
  incomRelImports: [{ type: String }],
});

/**
 * Validations
 */

/**
 * Pre-remove hook
 */

/**
 * Methods
 */

/**
 * Statics
 */

VocabularySchema.statics = {
  /**
   * Find article by id
   *
   * @param {ObjectId} id
   * @param {Function} cb
   * @api private
   */

  load: function (prefix, cb) {
    this.findOne({ prefix: prefix })
      .populate("creatorIds", "name prefUri type")
      .populate("contributorIds", "name prefUri type")
      .populate("publisherIds", "name prefUri type")
      .populate("reviews.agentId", "name prefUri")
      .populate("versions.languageIds", "label iso639P3PCode uri iso639P1Code")
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  loadEdition: function (prefix, cb) {
    this.findOne({ prefix: prefix })
      .populate("creatorIds", "name prefUri type")
      .populate("contributorIds", "name prefUri type")
      .populate("publisherIds", "name prefUri type")
      .populate("reviews.agentId", "name prefUri")
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  loadId: function (id, cb) {
    this.findOne({ _id: id })
      .populate("creatorIds", "name prefUri type")
      .populate("contributorIds", "name prefUri type")
      .populate("publisherIds", "name prefUri type")
      .populate("reviews.agentId", "name")
      .populate("versions.languageIds", "label iso639P3PCode uri iso639P1Code")
      .exec(cb);
  },

  loadFromPrefixURINSP: function (prefixURINSP, cb) {
    this.findOne(
      {
        $or: [
          //search for nsp or uri or prefix
          { prefix: prefixURINSP },
          { uri: prefixURINSP },
          { nsp: prefixURINSP },
        ],
      },
      { _id: 0 }
    )
      .populate("creatorIds", "name")
      .populate("contributorIds", "name")
      .populate("publisherIds", "name")
      .populate("reviews.agentId", "name")
      .populate("versions.languageIds", "label iso639P3PCode uri")
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  testIfPrefixExists: function (prefix, cb) {
    this.countDocuments({ prefix: prefix })
      .then((count) => {
        cb(null, count);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  getVersionsByPrefix: function (prefix, cb) {
    this.findOne({ prefix: prefix }, { prefix: 1, versions: 1, _id: 0 })
      .then((vocab) => cb(null, vocab))
      .catch((err) => cb(err, null));
  },

  findNspURI: function (uri, cb) {
    var canonicalURI =
      uri.slice(-1) == "#" || uri.slice(-1) == "/" ? uri.slice(0, -1) : uri; //remove trailing char (to match case where there is an extra '/' or '#')
    var termHash = canonicalURI + "#";
    var termSlash = canonicalURI + "/";
    this.findOne({
      $or: [
        //search for nsp or uri having either the canonical, the slashed or hashed form.
        { nsp: canonicalURI },
        { uri: canonicalURI },
        { nsp: termHash },
        { uri: termHash },
        { nsp: termSlash },
        { uri: termSlash },
      ],
    })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  /**
   * List articles
   *
   * @param {Object} options
   * @param {Function} cb
   * @api private
   */

  list: function (cb) {
    this.find({}, { prefix: 1, titles: 1, _id: 0 })
      .sort({ prefix: 1 })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  listWithId: function (cb) {
    this.find({}, { prefix: 1, titles: 1, _id: 1 })
      .sort({ prefix: 1 })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  listVersions: function (cb) {
    this.find({}, { prefix: 1, versions: 1, _id: 0 })
      .sort({ prefix: 1 })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  listPrefixNspUri: function (cb) {
    this.find({}, { prefix: 1, nsp: 1, uri: 1, _id: 0 })
      .sort({ prefix: 1 })
      .exec(cb);
  },

  listPrefixNspUriTitles: function (cb) {
    this.find({}, { prefix: 1, nsp: 1, uri: 1, titles: 1, _id: 0 })
      .sort({ prefix: 1 })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  latestInsertion: function (nbItemsRequired, cb) {
    this.find({}, { prefix: 1, createdInLOVAt: 1, titles: 1, _id: 0 })
      .sort({ createdInLOVAt: -1 })
      .limit(nbItemsRequired)
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  latestModification: function (nbItemsRequired, cb) {
    this.find({}, { prefix: 1, lastModifiedInLOVAt: 1, titles: 1, _id: 0 })
      .sort({ lastModifiedInLOVAt: -1 })
      .limit(nbItemsRequired)
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  listVocabVersionsToReview: function (cb) {
    this.find(
      { "versions.isReviewed": false },
      { prefix: 1, lastModifiedInLOVAt: 1, titles: 1, _id: 0 }
    )
      .sort({ lastModifiedInLOVAt: -1 })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  filterListVocab: function (sortParam, tagFilter, cb) {
    var sortParamsEnabled = ["prefix"];
    if (!sortParam || sortParamsEnabled.indexOf(sortParam) < 0)
      sortParam = "prefix";
    this.find(!tagFilter ? {} : { tags: tagFilter }, {
      prefix: 1,
      uri: 1,
      nsp: 1,
      titles: 1,
      descriptions: 1,
      tags: 1,
      _id: 0,
    })
      .sort({ prefix: 1 })
      .exec(cb);
  },

  listCreatedPerAgent: function (agentId, cb) {
    this.find({ creatorIds: agentId }, { prefix: 1, _id: 0, tags: 1 })
      .sort({ prefix: 1 })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  listContributedPerAgent: function (agentId, cb) {
    this.find({ contributorIds: agentId }, { prefix: 1, _id: 0, tags: 1 })
      .sort({ prefix: 1 })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  listPublishedPerAgent: function (agentId, cb) {
    this.find({ publisherIds: agentId }, { prefix: 1, _id: 0, tags: 1 })
      .sort({ prefix: 1 })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  listVocabsForReview: function (cb) {
    this.find({}, { prefix: 1, _id: 0, reviews: 1 })
      .sort({ prefix: 1 })
      .then((vocabs) => {
        var vocs = [];
        for (i in vocabs) {
          var voc = vocabs[i];
          if (voc.reviews && voc.reviews.length > 0) {
            var latestReviewDate = null;
            for (j in voc.reviews) {
              var review = voc.reviews[j];
              if (review.createdAt) {
                if (
                  latestReviewDate == null ||
                  latestReviewDate < review.createdAt
                )
                  latestReviewDate = review.createdAt;
              }
            }
            if (latestReviewDate == null) vocs.push({ prefix: voc.prefix });
            else {
              var td = new Date();
              td.setMonth(td.getMonth() - 11);
              if (latestReviewDate < td)
                vocs.push({
                  prefix: voc.prefix,
                  latestReviewDate: latestReviewDate,
                });
            }
          } else vocs.push({ prefix: voc.prefix });
        }
        //sort by review date
        vocs.sort(function (a, b) {
          if (typeof a.latestReviewDate == "undefined") return -1;
          if (typeof b.latestReviewDate == "undefined") return 1;
          return a.latestReviewDate > b.latestReviewDate;
        });
        return cb(null, vocs);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  /**
   * List vocabularyprefix with all agents
   *
   * @param {Function} cb
   * @api private
   */

  listAgents: function (cb) {
    this.find(
      {},
      { prefix: 1, creatorIds: 1, contributorIds: 1, publisherIds: 1 }
    )
      .sort({ prefix: 1 })
      .exec(cb);
  },

  /**
   * List vocabularyprefix with all agents
   *
   * @param {Function} cb
   * @api private
   */
  listAgent: function (agentId, cb) {
    this.find(
      {
        $or: [
          { creatorIds: agentId },
          { contributorIds: agentId },
          { publisherIds: agentId },
        ],
      },
      { prefix: 1 }
    )
      .sort({ prefix: 1 })
      .exec(cb);
  },

  addVersion: function (vocabPrefix, version, cb) {
    this.findOneAndUpdate(
      { prefix: vocabPrefix },
      {
        $push: { versions: version },
        $set: { lastModifiedInLOVAt: new Date() },
      },
      { upsert: true }
    )
      .then(() => {
        cb(null);
      })
      .catch((err) => {
        cb(err);
      });
  },

  updateTagVocab: function (oldTag, newTag, cb) {
    this.updateMany(
      { tags: { $all: [oldTag] } },
      { $set: { "tags.$": newTag } }
    )
      .then(() => {
        cb(null);
      })
      .catch((err) => {
        cb(err);
      });
  },

  deleteTagVocab: function (oldTag, cb) {
    this.updateMany(
      { tags: { $all: [oldTag] } },
      { $pullAll: { tags: [oldTag] } }
    )
      .then(() => {
        cb(null);
      })
      .catch((err) => {
        cb(err);
      });
  },
};

mongoose.model("Vocabulary", VocabularySchema);
