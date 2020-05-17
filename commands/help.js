const { RichEmbed } = require('discord.js')

exports.run = (client, msg, args) => {
  // Help commands
  if (!args[0] || args[0].toLowerCase() === 'all') {
    // Help header
    let helpMsg = '\n**∴ __Available Commands__ ∴**\n'
    helpMsg += `*For detailed command information use ${client.config.prefix}help <commandname>*\n`

    // Get spacing for command descriptions
    const commandNames = client.commands.keyArray()
    const longest = commandNames.reduce((long, str) => Math.max(long, str.length), 0)

    // Sort and output commands and descriptions
    let category = ''
    const sorted = client.commands.array().sort((p, c) => p.help.category > c.help.category ? 1 : p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1)
    sorted.forEach(command => {
      if (category !== command.help.category) {
        helpMsg += `\n**❯ ${command.help.category}**\n`
        category = command.help.category
      }
      helpMsg += `${client.config.prefix}${command.help.name}${' '.repeat(longest - command.help.name.length)} :: ${command.help.description}\n`
    })

    // Send the help message in DM
    msg.author.createDM().then(channel => { channel.send(helpMsg) })
    if (msg.channel.type !== 'dm') msg.channel.send(`${msg.author.tag}, information was DMed.`)
  } else if (client.commands.get(args[0])) {
    // Help for specific command
    const cmd = client.commands.get(args[0])
    msg.channel.send(new RichEmbed()
      .addField(`Command: ${cmd.help.name}`, `${cmd.help.description}`)
      .addField('❯ Category', cmd.help.category)
      .addField('❯ Usage', `\`${client.config.prefix}${cmd.help.usage.join(` ${client.config.prefix}`)}\``)
    )
  } else {
    msg.channel.send(`Could not find the specified command. Use \`${client.config.prefix}help\` to view all commands.`)
  }
}

exports.help = {
  name: 'help',
  category: 'System',
  description: 'Returns list of all commands or specific command information.',
  usage: [
    'help',
    'help ping'
  ]
}
