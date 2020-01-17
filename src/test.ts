import test from 'ava'
import { commitForRelease } from './main'
import { fromUrl } from './version'

test('version.fromUrl()', t => {
  t.is(
    fromUrl('https://github.com/me/myproject/archive/v1.2.3.tar.gz'),
    'v1.2.3'
  )
  t.is(
    fromUrl(
      'https://github.com/me/myproject/releases/download/v1.2.3/file.tgz'
    ),
    'v1.2.3'
  )
  t.is(fromUrl('http://myproject.net/download/v1.2.3.tgz'), 'v1.2.3')
  t.is(fromUrl('https://example.com/v1.2.3.zip'), 'v1.2.3')
})

test('main.commitForRelease()', t => {
  t.is(
    commitForRelease('This is a fixed commit message', {
      formulaName: 'test formula',
    }),
    'This is a fixed commit message'
  )
  t.is(
    commitForRelease('chore({{formulaName}}): version {{version}}', {
      formulaName: 'test formula',
    }),
    'chore(test formula): version {{version}}'
  )
  t.is(
    commitForRelease('chore({{formulaName}}): upgrade to version {{version}}', {
      formulaName: 'test formula',
      version: 'v1.2.3',
    }),
    'chore(test formula): upgrade to version v1.2.3'
  )
})
