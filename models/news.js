const mongoose = require('mongoose')

const newsSchema = mongoose.Schema({
  type: String,
  article: String,
  sent: Boolean
})

module.exports = mongoose.model('News', newsSchema)
