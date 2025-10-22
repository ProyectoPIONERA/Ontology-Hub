
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

var LogSearchTermSchema = new Schema({
  searchWords: {type : String, trim : true},
  searchURL: {type : String},
  date: {type: Date},
  sessionId: {type : String},
  nbResults: {type : String},
  results: {type : String}  
})



mongoose.model('LogSearchTerm', LogSearchTermSchema)
