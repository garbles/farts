#!/usr/bin/env node

const path = require('path');
const watch = require('../src');

const args = process.argv.slice(2);
const watcher = watch(args[0]);

watcher.on('ready', pathName => {
  console.log('Now watching ' + pathName);
});
