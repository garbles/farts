const EventEmitter = require('events');
const chokidar = require('chokidar');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const template = require('lodash/template');
const noop = require('lodash/noop');
const through = require('through2');
const j = require('jscodeshift');

const processTemplate = custom => through.obj(function(chunk, env, cb) {
  const config = Object.assign({}, require('lodash/string'), custom);
  const result = template(chunk.toString())(config);

  this.push(result);

  cb();
});

const createMissingImports = filePath => through.obj(function(chunk, env, cb) {
  const str = chunk.toString();

  j(str, {parser: require('jscodeshift/parser/flow')})
    .find(j.ImportDeclaration)
    .forEach(p => {
      const resolved = path.resolve(filePath.dir, p.get('source', 'value').value);
      fs.access(resolved, fs.F_OK, err => {
        if (err) {
          fs.writeFileSync(resolved, '');
        }
      });
    });

  this.push(chunk);
  cb();
});

module.exports = (pathName, cb = noop) => {
  const emitter = new EventEmitter();
  const watcher = chokidar.watch(pathName, {ignored: /[\/\\]\./});

  const api = {
    on: (...args) => emitter.on(...args),
    off: (...args) => emitter.off(...args)
  };

  watcher.on('ready', () => {
    cb.call(api);

    watcher.on('add', file => {
      fs.stat(file, (err, stats) => {
        if (stats.birthtime.getTime() !== stats.atime.getTime() || stats.size > 0) {
          return; // file moved
        }

        const fileURL = path.parse(file);
        const templateGlob = path.join(fileURL.dir, `.template${fileURL.ext}`);

        glob(templateGlob, (err, files) => {
          const templatePath = files[0];

          if (templatePath) {
            const reader = fs.createReadStream(templatePath);
            const writer = fs.createWriteStream(file);

            reader
              .pipe(processTemplate(fileURL))
              .pipe(createMissingImports(fileURL))
              .pipe(writer, {end: true});

            reader.on('end', () => {
              writer.end();
              emitter.emit('data', file);
            });
          }
        });
      });
    });

    emitter.emit('ready', pathName);
  });

  return api;
};
