#!/usr/bin/env node

const ON_DEATH = require('death')
const watch = require('../src')

const args = process.argv.slice(2)
const watcher = watch(args[0])

watcher.on('ready', pathName => {
  console.log('Now watching ' + pathName)
})

ON_DEATH(watcher.kill)
