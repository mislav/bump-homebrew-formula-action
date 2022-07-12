import test from 'ava'
import sinon from 'sinon'
import { replaceFields } from './replace-formula-fields'
import * as version from './version'

sinon.stub(version, 'compare').returns(1)

test('replaceFields()', (t) => {
  const input = `
  url "https://github.com/old/url.git",
    tag: 'v0.9.0',
    revision => "OLDREV"
`
  const expected = `
  url "https://github.com/cli/cli.git",
    tag: 'v0.11.1',
    revision => "NEWREV"
`

  const replacements = new Map<string, string>()
  replacements.set('url', 'https://github.com/cli/cli.git')
  replacements.set('tag', 'v0.11.1')
  replacements.set('revision', 'NEWREV')

  t.is(replaceFields(input, replacements), expected)
})

test('replaceFields() with url version', (t) => {
  const input = `
  url "https://github.com/me/myproject/releases/download/v1.2.3/file.tgz"
`
  const expected = `
  url "https://github.com/me/myproject/releases/download/v1.2.4/file.tgz"
`

  const replacements = new Map<string, string>()
  replacements.set(
    'url',
    'https://github.com/me/myproject/releases/download/v1.2.4/file.tgz'
  )

  t.is(replaceFields(input, replacements), expected)
})

test('replaceFields() with changed url version prefix', (t) => {
  const input = `
  url "https://github.com/org/project/archive/v1.2.1.tar.gz"
`
  const expected = `
  url "https://github.com/org/project/archive/package-v1.2.3.tar.gz"
`

  const replacements = new Map<string, string>()
  replacements.set(
    'url',
    'https://github.com/org/project/archive/package-v1.2.3.tar.gz'
  )

  t.is(replaceFields(input, replacements), expected)
})
