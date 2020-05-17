exports.run = async (client, msg, args) => {
  const ping = await msg.channel.send('Pinging...')
  ping.edit(`Bot response time is \`${ping.createdTimestamp - msg.createdTimestamp}ms\`. API response time is \`${Math.round(client.ping)}ms\`.`)
}

exports.help = {
  name: 'ping',
  category: 'Miscellaneous',
  description: 'Returns response time.',
  usage: ['ping']
}
