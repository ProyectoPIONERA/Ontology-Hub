/**
 * Module dependencies.
 */

var mongoose = require("mongoose"),
  env = process.env.NODE_ENV || "development",
  config = require("../../config/config")[env],
  Schema = mongoose.Schema;

/**
 * Article Schema
 */

var StattagSchema = new Schema({
  label: { type: String, default: "", trim: true },
  nbOccurrences: { type: Number },
});

/**
 * Statics
 */

StattagSchema.statics = {
  list: function (cb) {
    this.find({})
      .sort({ label: 1 })
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
  mostPopularTags: function (nbItemsRequired, cb) {
    this.find({}, { _id: 0 })
      .sort({ nbOccurrences: -1 })
      .limit(nbItemsRequired)
      .then((query, a) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },
  findLabel: function (label, cb) {
    this.findOne({ label: label })
      .then((query) => {
        cb(null, query);
      })
      .catch((err) => {
        cb(err, null);
      });
  },
  delete: function(tag, cb) {
    this.findOneAndDelete(tag)
      .then(() => {
        cb(null);
      })
      .catch((err) => {
        cb(err);
      });
  },
};

mongoose.model("Stattag", StattagSchema);
