const path = require('path')
const rimraf = require('rimraf')
const os = require('os')
const fs = require('fs')
const watcher = require('./index')

describe('index', () => {
  let tmp

  beforeEach(done => {
    tmp = path.join((os.tmpdir || os.tmpDir)(), `template-${Date.now()}`)
    fs.mkdir(tmp, 0o755, () => done())
  })

  afterEach(done => {
    rimraf(tmp, err => {
      expect(err).toBeFalsy()
      done()
    })
  })

  it('will append the module from the template', done => {
    const template = 'function () {}'
    const file = path.join(tmp, 'file.js')
    fs.writeFileSync(path.join(tmp, '.template.js'), template)

    watcher(tmp, function () {
      this.on('data', filePath => {
        const str = fs.readFileSync(file).toString()
        expect(str).toEqual(template)
        expect(file).toEqual(filePath)
        done()
      })

      fs.writeFileSync(file, '')
    })
  })

  it('interpolates the name of the file', done => {
    const template = 'function <%= name + name %> () {}'
    const file = path.join(tmp, 'file.js')
    fs.writeFileSync(path.join(tmp, '.template.js'), template)

    watcher(tmp, function () {
      this.on('data', () => {
        const str = fs.readFileSync(file).toString()
        expect(str).toEqual('function filefile () {}')
        done()
      })

      fs.writeFileSync(file, '')
    })
  })

  it('includes lodash/string as helpers', done => {
    const template = 'function <%= camelCase(name) %> () {}'
    const file = path.join(tmp, 'some-longFile_name.js')
    fs.writeFileSync(path.join(tmp, '.template.js'), template)

    watcher(tmp, function () {
      this.on('data', () => {
        const str = fs.readFileSync(file).toString()
        expect(str).toEqual('function someLongFileName () {}')
        done()
      })

      fs.writeFileSync(file, '')
    })
  })

  it('does nothing when a file is moved', done => {
    const template = 'function <%= camelCase(name) %> () {}'
    const startJs = path.join(tmp, 'start.js')
    const endJs = path.join(tmp, 'end.js')
    const cb = jest.fn()

    fs.writeFileSync(path.join(tmp, '.template.js'), template)
    fs.writeFileSync(startJs, '')

    watcher(tmp, function () {
      this.on('data', cb)

      fs.rename(startJs, endJs, err => {
        expect(err).toBeFalsy()

        process.nextTick(() => {
          expect(cb.mock.calls.length).toEqual(0)
          done()
        })
      })
    })
  })

  it('creates required files if they do not already exist', done => {
    const js = `
      import style from './styles.css'
      function <%= camelCase(name) %> () {}
    `
    const css = '.wrapper { color: blue }'
    const templateJsPath = path.join(tmp, '.template.js')
    const templateCssPath = path.join(tmp, '.template.css')
    const filePath = path.join(tmp, 'some-longFile_name.js')

    fs.writeFileSync(templateJsPath, js)
    fs.writeFileSync(templateCssPath, css)

    watcher(tmp, function () {
      let calls = 0
      this.on('data', () => {
        if (++calls === 2) {
          done()
        } else if (calls > 2) {
          throw new Error('Called too many times')
        }
      })

      fs.writeFileSync(filePath, '')
    })
  })
})
