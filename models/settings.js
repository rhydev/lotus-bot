var mongoose = require('mongoose')

const settingsSchema = new mongoose.Schema({
	guild: String,
	prefix: String,
	alertChannel: String,
	sentAlerts: {
		announcements: Boolean,
		'server-info': Boolean,
		'urgent-quests': Boolean,
		blogs: Boolean
	}
})

module.exports = mongoose.model('Settings', settingsSchema)
