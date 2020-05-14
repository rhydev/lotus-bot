const mongoose = require('mongoose')

const newsSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  type: String,
  article: String,
  sent: Boolean
})

module.exports = mongoose.model('News', newsSchema)
