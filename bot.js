const { promisify } = require('util')
const { config } = require('dotenv')
const { Client, Collection, RichEmbed } = require('discord.js')
const fetch = require('node-fetch')
const { parse } = require('node-html-parser')
const readdir = promisify(require('fs').readdir)
const mongoose = require('mongoose')

// Models
const News = require('./models/news')
const Settings = require('./models/settings')
// Managers
const storage = require('./managers/storage')

// Env file path
config({ path: `${__dirname}/.env` })

// Initialize bot client
const client = new Client({ disableEveryone: true })
client.config = require('./config')
client.logger = require('./logger')
client.commands = new Collection()

const init = async () => {
  // Connect to database
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true })
  } catch (err) {
    client.logger.error(err)
    process.exit(1)
  }
  const db = mongoose.connection
  db.on('error', console.error.bind(console, 'db connection error:\n'))

  // Load commands
  const cmdFiles = await readdir('./commands')
  client.logger.log(`Loading a total of ${cmdFiles.length} commands...`)
  cmdFiles.forEach(file => {
    try {
      if (!file.endsWith('.js')) return
      client.logger.log(`Loading command ${file}`)
      const cmd = require(`./commands/${file}`)
      client.commands.set(cmd.help.name, cmd)
    } catch (err) {
      client.logger.error(`Unable to load command ${file}: ${err}`)
    }
  })

  // Async batch fetch
  const batchFetch = async () => {
    const types = ['announcements', 'server-info', 'urgent-quests', 'blogs']
    const fetches = []
    for (type of types) {
      fetches.push(crawl(type))
    }
    await Promise.all(fetches)
  }

  // Fetches PSO2 news webpage of given news type
  const crawl = async (type) => {
    try {
      // Fetch the webpage and parse HTML
      const res = await fetch(`https://pso2.com/news/${type}?page=1`)
      const body = await res.text()
      const root = parse(body)

      // Log the fetch
      client.logger.log(`Fetched PSO2 ${type} news`)

      // Find the newest individual news item in the given section
      const item = root.querySelector('.all-news-section-wrapper').querySelector('.news-item')

      // Gather the pertinent information
      let title = item.querySelector('.title').innerHTML.trim()
      const article = item.querySelector('.image').outerHTML.trim()
      const id = article.slice(article.search(/ShowDetails\('/g) + 13, article.search(/\'\,/g))
      const image = article.slice(article.search(/url\(/g) + 4, article.search(/\)"></g))
      let desc = item.querySelector('.description').innerHTML.trim()
      const tag = item.querySelector('.tag').innerHTML.trim()
      const date = item.querySelector('.date').innerHTML.trim()

      // Fix HTML hex character codes in title and description
      const htmlHexRegex = /&#(x\d+);/
      let matches = htmlHexRegex.exec(title)
      if (matches) {
        matches.shift()
        title = title.replace(/&#(x\d+);/g, String.fromCharCode(parseInt(`0${matches.shift()}`)))
      }
      matches = htmlHexRegex.exec(desc)
      if (matches) {
        matches.shift()
        desc = desc.replace(/&#(x\d+);/g, String.fromCharCode(parseInt(`0${matches.shift()}`)))
      }

      // Update news data
      const news = await News.findOne({ type })
      if (!news) {
        const newNews = new News({
          type,
          article: id
        })
        await newNews.save()
      } else if (news && news.get('article') !== id) {
        await news.updateOne({ article: id })

        // Update guild sent values
        client.guilds.map(async (guild) => {
          const guildData = storage.get(guild.id)
          guildData.sentAlerts[type] = false
          await storage.update(guildData.guild, 'sentAlerts', guildData.sentAlerts)
        })
      }

      // Send updates to designated alertChannel for all guilds if it has not been sent
      client.guilds.map(async (guild) => {
        const guildData = storage.get(guild.id)
        if (guildData && guildData.alertChannel && !guildData.sentAlerts[type]) {
          const channel = client.channels.get(guildData.alertChannel)
          await channel.send(new RichEmbed()
            .setColor(type === 'announcements' ?
              '#0099E0' : type === 'server-info' ?
              '#00D42E' : type === 'urgent-quests' ?
              '#E00000' : type === 'blogs' ?
              '#FCA400' : '#FFFFFF')
            .setTitle(title)
            .setURL(`https://pso2.com/news/${type}/${id}`)
            .setDescription(desc)
            .setImage(image)
            .setFooter(`${tag} | ${date}`))

          // Update sent fields in each guild
          guildData.sentAlerts[type] = true
          await storage.update(guildData.guild, 'sentAlerts', guildData.sentAlerts)
        }
      })
    } catch (err) {
      client.logger.error(err)
    }
  }

  // Initialize the storage manager and update storage
  const initStorage = async () => {
    // Initialize the storage
    await storage.init()
    // Insert any new guild settings
    client.guilds.map(async (guild) => {
      if (!storage.get(guild.id)) {
        await storage.insert({
          guild: guild.id,
          prefix: client.config.prefix,
          alertChannel: '',
          sentAlerts: {
            announcements: false,
            'server-info': false,
            'urgent-quests': false,
            blogs: false
          }
        })
      }
    })
  }

  // Ready event, required for bot to work
  client.on('ready', async () => {
    client.logger.log(`Logged in as ${client.user.tag}!`, 'ready')
    client.user.setPresence({
      game: {
        name: 'for PSO2 news!',
        type: 'WATCHING'
      }
    })

    // Initialize the storage for each guild
    await initStorage()
    client.logger.log('Storage initialized')

    // Fetch PSO2 news
    setInterval(await batchFetch, 15000)
  })

  // Event listener for guild join
  client.on('guildCreate', async (guild) => {
    // Insert new guild settings
    await storage.insert({
      guild: guild.id,
      prefix: client.config.prefix,
      alertChannel: '',
      sentAlerts: {
        announcements: false,
        'server-info': false,
        'urgent-quests': false,
        blogs: false
      }
    })
  })

  // Event listener for messages
  client.on('message', msg => {
    // Ignore messages from bots
    if (msg.author.bot) return
    // Ignore messages in DM channels
    if (msg.channel.type === 'dm' || msg.channel.type === 'group') return
    // Ignore messages in channels the bot does not have send permissions
    if (!msg.channel.permissionsFor(client.user).has('SEND_MESSAGES')) return
    // Ignore messages that do not start with the prefix or bot mention
    if (msg.content.indexOf(client.config.prefix) !== 0 && (!msg.mentions.users.first() || (msg.mentions.users.first() && msg.mentions.users.first().id !== client.user.id))) return
    if (msg.mentions.users.first() && msg.mentions.users.first().id === client.user.id) {
      // Ignores the mention, then splits msg by spaces and newlines
      const args = msg.content.slice(msg.mentions.users.first().id.length + 3).trim().split(/ +|\n+/g)
      // Separates command from arguments
      const command = args.shift().toLowerCase()

      // Get and run the command
      const cmd = client.commands.get(command)
      if (!cmd) return
      cmd.run(client, msg, args)

      // Log the command
      client.logger.cmd(`${msg.author.tag} (${msg.author.id}) ran command ${cmd.help.name}`)
    } else if (msg.content.startsWith(client.config.prefix)) {
      // Ignores the prefix, then splits msg by spaces and newlines
      const args = msg.content.slice(client.config.prefix.length).trim().split(/ +|\n+/g)
      // Separates command from arguments
      const command = args.shift().toLowerCase()

      // Get and run the command
      const cmd = client.commands.get(command)
      if (!cmd) return
      cmd.run(client, msg, args)

      // Log the command
      client.logger.cmd(`${msg.author.tag} (${msg.author.id}) ran command ${cmd.help.name}`)
    }
  })

  // Log the bot in
  client.login(process.env.TOKEN)
}

init()
