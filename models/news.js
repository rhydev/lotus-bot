const mongoose = require('mongoose')

const newsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  type: String,
  article: String
})

module.exports = mongoose.model('News', newsSchema)
