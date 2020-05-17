const storage = require('../managers/storage')

exports.run = async (client, msg, args) => {
  try {
    // User permission check
    if (!msg.member.hasPermission('ADMINISTRATOR')) return
    await storage.update(msg.guild.id, 'alertChannel', msg.channel.id)
    msg.channel.send(`Set the alert channel in **${msg.guild}** to ${msg.channel}.`)
  } catch (err) {
    msg.channel.send('Oops! Something went wrong, failed to set the alert channel.')
    client.logger.error(err)
  }
}

exports.help = {
  name: 'alert',
  category: 'System',
  description: 'Requires `ADMINISTRATOR` permissions. Sets the PSO2 alerts channel.',
  usage: ['alert']
}
