const mongoose = require('mongoose')

const newsSchema = mongoose.Schema({
  type: String,
  article: String
})

module.exports = mongoose.model('News', newsSchema)
