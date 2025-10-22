/**
 * Module dependencies.
 */
var mongoose = require("mongoose"),
  env = process.env.NODE_ENV || "development",
  config = require("../../config/config")[env],
  Schema = mongoose.Schema;

/**
 * Agent Language
 */
var LanguageSchema = new Schema({
  uri: { type: String, trim: true },
  label: { type: String, trim: true },
  iso639P3PCode: { type: String, trim: true },
  iso639P1Code: { type: String, trim: true },
});

/**
 * Statics
 */
LanguageSchema.statics = {
  /**
   * Find language by id
   *
   * @param {ObjectId} id
   * @param {Function} cb
   * @api private
   */
  load: function (id, cb) {
    this.findOne({ _id: id }).exec(cb);
  },
  listAllSortByP1Codes: function (cb) {
    this.find().sort({ iso639P1Code: 1 }).exec(cb);
  },

  loadByIso639P3PCode: function (iso639P3PCode, cb) {
    this.findOne({ iso639P3PCode: iso639P3PCode })
    .then((query) => {
      cb(null, query);
    })
    .catch((err) => {
      cb(err, null);
    });
  },

  listAll: function (cb) {
    this.find()
    .sort({ label: 1 })
    .then((query) => {
      cb(null, query);
    })
    .catch((err) => {
      cb(err, null);
    });
  },
};

mongoose.model("Language", LanguageSchema);
