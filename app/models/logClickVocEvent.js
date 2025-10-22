
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

var LogClickVocEventSchema = new Schema({
  sessionId: {type : String},
  date: {type: Date},
  clickedVoc: {type : String}
})


/**
 * Statics
 */

mongoose.model('LogClickVocEvent', LogClickVocEventSchema)
