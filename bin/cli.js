#!/usr/bin/env node

const path = require(`path`)
const ON_DEATH = require(`death`)
const chalk = require(`chalk`)
const flatten = require(`lodash/flatten`)
const padStart = require(`lodash/padStart`)
const watch = require(`../src`)
const version = require(`../package.json`).version

const args = process.argv.slice(2)
const watcher = watch(args[0])

console.log(chalk.yellow(`💩  Farts v${version}`))

const timestamp = () => {
  const date = new Date()
  const hours = `0${date.getHours()}`.slice(-2)
  const minutes = `0${date.getMinutes()}`.slice(-2)
  const seconds = `0${date.getSeconds()}`.slice(-2)

  return `[${hours}:${minutes}:${seconds}]`
}

const whitespace = padStart('', timestamp().length)

const log = (...msgs) => {
  const [head, ...tail] = flatten(msgs)

  console.log(timestamp(), chalk.green(head))

  tail.forEach(msg => {
    console.log(whitespace, chalk.green(msg))
  })
}

const error = msg =>
  console.log(timestamp(), chalk.red(`ERROR: ${msg}`))

watcher.on(`ready`, pathName => {
  const fullPath = path.resolve(process.cwd(), pathName)

  log(`Ready to go`)
  log(`Watching ${fullPath}`)
})

watcher.on(`data`, (newFilePath, templatePath) => {
  log([
    `File created:`,
    `  ${newFilePath}`,
    `Used scaffold:`,
    `  ${templatePath}`
  ])
})

watcher.on(`error`, error)

ON_DEATH((signal, err) => {
  watcher.kill()

  if (err) {
    error(`Crashing for some reason...`)
    error(err)
  } else {
    log(`Exiting...`)
  }
})
