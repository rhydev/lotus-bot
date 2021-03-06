const { promisify } = require('util')
const { config } = require('dotenv')
const { Client, Collection, RichEmbed } = require('discord.js')
const fetch = require('node-fetch')
const { parse } = require('node-html-parser')
const readdir = promisify(require('fs').readdir)
const mongoose = require('mongoose')
const News = require('./models/news')

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
    await mongoose.connect(process.env.DATABASE, { useUnifiedTopology: true, useNewUrlParser: true })
  } catch (err) {
    client.logger.error(err)
    process.exit(1)
  }
  const db = mongoose.connection
  db.on('error', console.error.bind(console, 'db connection error:\n'))

  /* COMMANDS CURRENTLY DISABLED
  // Load commands
  const cmdFiles = await readdir('./commands')
  client.logger.log(`Loading a total of ${cmdFiles.length} commands.`)
  cmdFiles.forEach(file => {
    try {
      if (!file.endsWith('.js')) return
      client.logger.log(`Loading command ${file}`)
      const cmd = require(`./commands/${file}`)
      client.commands.set(cmd.help.name, cmd)
    } catch (e) {
      client.logger.error(`Unable to load command ${file}: ${e}`)
    }
  })
  */

  // Ready event, required for bot to work
  client.on('ready', async () => {
    client.logger.log(`Logged in as ${client.user.tag}!`, 'ready')
    client.user.setPresence({
      game: {
        name: 'for PSO2 news!',
        type: 'WATCHING'
      }
    })

    // Fetch PSO2 news
    setInterval(await batchFetch, 15000)
  })

  // Async batch fetch
  batchFetch = async () => {
    const types = ['announcements', 'server-info', 'urgent-quests', 'blogs']
    const fetches = []
    for (type of types) {
      fetches.push(crawl(type))
    }
    await Promise.all(fetches)
  }

  // Fetches PSO2 news webpage of given news type
  crawl = async (type) => {
    // Fetch the webpage and parse HTML
    try {
      const res = await fetch(`https://pso2.com/news/${type}?page=1`)
      const body = await res.text()
      const root = parse(body)

      // Log the fetch
      client.logger.log(`Fetched ${type} news.`)

      // Find the newest individual news item in the given section
      const item = root.querySelector('.all-news-section-wrapper').querySelector('.news-item')

      // Gather the pertinent information
      const title = item.querySelector('.title').innerHTML.trim()
      const article = item.querySelector('.image').outerHTML.trim()
      const id = article.slice(article.search(/ShowDetails\('/g) + 13, article.search(/\'\,/g))
      const image = article.slice(article.search(/url\(/g) + 4, article.search(/\)"></g))
      const desc = item.querySelector('.description').innerHTML.trim()
      const tag = item.querySelector('.tag').innerHTML.trim()
      const date = item.querySelector('.date').innerHTML.trim()

      // Check if the news is old and send Embed with fetched data
      let news = await News.findOne({ type: type })
      if (!news || (news && news.get('article') !== id) || (news && !news.get('sent'))) {
        if (!news) {
          const newNews = new News({
            _id: mongoose.Types.ObjectId(),
            type,
            article: id,
            sent: false
          })
          await newNews.save()
        } else if (news && news.get('article') !== id) {
          await news.updateOne({ article: id, sent: false })
        }

        const channel = client.channels.get('710366975519359027')
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

        // Get news again to update sent bool
        news = await News.findOne({ type: type })
        await news.updateOne({ sent: true })
      }
    } catch (err) {
      client.logger.error(err)
    }
  }

  /* COMMANDS CURRENTLY DISABLED
  // Event listener for msgs
  client.on('message', msg => {
    // Ignore messages from bots
    if (msg.author.bot) return
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
      cmd.run(client, db, msg, args)

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
      cmd.run(client, db, msg, args)

      // Log the command
      client.logger.cmd(`${msg.author.tag} (${msg.author.id}) ran command ${cmd.help.name}`)
    }
  })
  */

  // Log the bot in
  client.login(process.env.TOKEN)
}

init()
