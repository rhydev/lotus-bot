/*
Logger class for easy and aesthetically pleasing console logging
*/
const chalk = require('chalk')
const moment = require('moment')
const stripAnsi = require('strip-ansi')
const { createWriteStream } = require('fs')

// Overload console.log to also write to log file
let day = moment().format('YYYY-MM-DD')
let stream = createWriteStream(`${__dirname}/logs/${day}.txt`, { flags: 'a' })
console.log = (msg) => {
  // Write to console
  process.stdout.write(msg + '\n')
  // Write to log file, organize log files by day
  const current = moment().format('YYYY-MM-DD')
  if (current !== day) {
    day = current
    stream = createWriteStream(`${__dirname}/logs/${day}.txt`, { flags: 'a' })
  }
  stream.write(stripAnsi(msg) + '\n')
}

exports.log = (content, type = 'log') => {
  const timestamp = `[${moment().format('YYYY-MM-DD HH:mm:ss')}]:`
  switch (type) {
    case 'log': {
      return console.log(`${timestamp} ${chalk.bgBlue(type.toUpperCase())} ${content} `)
    }
    case 'warn': {
      return console.log(`${timestamp} ${chalk.black.bgYellow(type.toUpperCase())} ${content} `)
    }
    case 'error': {
      return console.log(`${timestamp} ${chalk.bgRed(type.toUpperCase())} ${content} `)
    }
    case 'debug': {
      return console.log(`${timestamp} ${chalk.green(type.toUpperCase())} ${content} `)
    }
    case 'cmd': {
      return console.log(`${timestamp} ${chalk.black.bgWhite(type.toUpperCase())} ${content}`)
    }
    case 'ready': {
      return console.log(`${timestamp} ${chalk.black.bgGreen(type.toUpperCase())} ${content}`)
    }
    default: throw new TypeError('Logger type must be either warn, debug, log, ready, cmd or error.')
  }
}

exports.error = (...args) => this.log(...args, 'error')

exports.warn = (...args) => this.log(...args, 'warn')

exports.debug = (...args) => this.log(...args, 'debug')

exports.cmd = (...args) => this.log(...args, 'cmd')
