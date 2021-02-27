import test from 'ava'
import { replaceFields } from './replace-formula-fields'

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
