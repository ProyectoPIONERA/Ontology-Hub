
/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , env = process.env.NODE_ENV || 'development'
  , config = require('../../config/config')[env]
  , Schema = mongoose.Schema


/**
 * Article Schema
 */

var LogQueryEventSchema = new Schema({
  searchWords: {type : String},
  filterTypes: {type : String},
  filterTags: {type : String},
  filterVocs: {type : String},
  page: {type : String},
  nbResults: {type : String},
  results: {type : String},
  sessionId: {type : String},
  date: {type: Date}
})


/**
 * Statics
 */

mongoose.model('LogQueryEvent', LogQueryEventSchema)
