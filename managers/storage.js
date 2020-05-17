const logger = require('../logger')
const Settings = require('../models/settings')

const storage = {}

const init = async () => {
	// Get all guild settings from DB
	let settingsArr = await Settings.find((err, settingsArr) => {
		if (err) return logger.error(err)
		return settingsArr
	})
	// Convert array to object for efficiency
	if (settingsArr.length > 0) {
		settingsArr.forEach(settings => {
			storage[settings.guild] = settings;
		})
	}
}

const get = (guild) => {
	return storage[guild]
}

const insert = async (settings) => {
	try {
		const newSettings = new Settings(settings)
		await newSettings.save()
		storage[settings.guild] = settings
	} catch (err) {
		logger.error(err)
	}
}

const remove = async (guild) => {
	try {
		if (storage.hasOwnProperty(guild)) {
			await Settings.deleteOne({ guild })
			delete storage[guild]
		}
	} catch (err) {
		logger.error(err)
	}
}

const update = async (guild, property, value) => {
	try {
		if (storage.hasOwnProperty(guild)) {
			await Settings.updateOne({ guild }, { [property]: value })
			storage[guild][property] = value
		}
	} catch (err) {
		logger.error(err)
	}
}

const clear = () => {
	for (var guild in storage) {
		if (storage.hasOwnProperty(guild)) {
			delete storage[guild]
		}
	}
}

module.exports = {
	init,
	get,
	insert,
	remove,
	update,
	clear
}
