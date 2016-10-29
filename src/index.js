const EventEmitter = require(`events`)
const chokidar = require(`chokidar`)
const fs = require(`fs`)
const glob = require(`glob`)
const path = require(`path`)
const template = require(`lodash/template`)
const noop = require(`lodash/noop`)
const last = require(`lodash/last`)
const through = require(`through2`)
const j = require(`jscodeshift`)

const processTemplate = fileURL => through.obj(function (chunk, env, cb) {
  // should nest fileURL in file param
  const config = Object.assign({}, require(`lodash`), fileURL)
  const result = template(chunk.toString())(config)

  this.push(result)

  cb()
})

const createMissingImports = filePath => through.obj(function (chunk, env, cb) {
  const str = chunk.toString()

  j(str, {parser: require(`jscodeshift/parser/flow`)})
    .find(j.ImportDeclaration)
    .forEach(p => {
      const resolved = path.resolve(filePath.dir, p.get(`source`, `value`).value)
      fs.access(resolved, fs.F_OK, err => {
        if (err) {
          fs.writeFileSync(resolved, ``)
        }
      })
    })

  this.push(chunk)
  cb()
})

module.exports = (pathName = `./`, cb = noop) => {
  const emitter = new EventEmitter()
  const cwd = process.cwd()
  const watchPath = path.resolve(cwd, pathName)
  const watcher = chokidar.watch(pathName, {ignored: /[\/\\]\./})

  const api = {
    on: (...args) => emitter.on(...args),
    off: (...args) => emitter.off(...args),
    kill: () => watcher.unwatch(pathName)
  }

  watcher.on(`ready`, () => {
    cb.call(api)

    watcher.on(`add`, file => {
      fs.stat(file, (err, stats) => {
        if (err) {
          emitter.emit(`error`, err)
          return
        }

        if (stats.birthtime.getTime() !== stats.atime.getTime() || stats.size > 0) {
          return // file moved
        }

        const fileURL = path.parse(file)

        const folders =
          path.relative(watchPath, fileURL.dir)
            .split('/')
            .reduce(
              (acc, next) => acc.concat(acc[acc.length - 1] + '/' + next),
              [watchPath])
            .join(',')

        const matches = `.template.${fileURL.base},.template${fileURL.ext}`
        const pattern = `{${folders}}/{${matches}}`

        glob(pattern, (err, files) => {
          if (err) {
            emitter.emit(`error`, err)
            return
          }

          const template = last(files)

          if (template) {
            const reader = fs.createReadStream(template)
            const writer = fs.createWriteStream(file)

            reader
              .pipe(processTemplate(fileURL))
              .pipe(createMissingImports(fileURL))
              .pipe(writer, {end: true})

            reader.on(`error`, err => {
              reader.close()
              writer.close()
              emitter.emit(`error`, err)
            })

            reader.on(`end`, () => {
              writer.end()
              emitter.emit(
                `data`,
                path.relative(cwd, file),
                path.relative(cwd, template)
              )
            })
          }
        })
      })
    })

    emitter.emit(`ready`, pathName)
  })

  return api
}
