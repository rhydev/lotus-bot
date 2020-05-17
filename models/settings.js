var mongoose = require('mongoose')

const settingsSchema = new mongoose.Schema({
	guild: String,
	prefix: String,
	alertChannel: String
})

module.exports = mongoose.model('Settings', settingsSchema)
