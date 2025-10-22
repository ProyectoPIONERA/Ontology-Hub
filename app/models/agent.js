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

var getAltUris = function (altUris) {
  return altUris;
};

/**
 * Setters
 */

var setAltUris = function (altUris) {
  return altUris;
};

/**
 * Agent Schema
 */

var AgentSchema = new Schema({
  prefUri: { type: String, default: "", trim: true },
  name: { type: String, default: "", trim: true },
  altUris: { type: [], get: getAltUris, set: setAltUris },
  type: { type: String, default: "", trim: true },
});

/**
 * Statics
 */
AgentSchema.statics = {
  /**
   * Find agent by id
   *
   * @param {ObjectId} id
   * @param {Function} cb
   * @api private
   */
  loadFromName: function (name, cb) {
    this.findOne({ name: name })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  load: function (id, cb) {
    this.findOne({ _id: id })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },

  loadFromNameURIAltURI: function (nameURIAltURI, cb) {
    this.findOne(
      {
        $or: [
          //search for altURI or uri or name
          { name: nameURIAltURI },
          { prefUri: nameURIAltURI },
          { altUris: nameURIAltURI },
        ],
      },
      { _id: 0 }
    )
    .then((query) => {
      cb(null, query);
    })
    .catch((err) => {
      cb(err, null);
    });
  },

  listAgents: function (cb) {
    this.find({}, { _id: 0 })
      .sort({ name: 1 })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },
};

mongoose.model("Agent", AgentSchema);
