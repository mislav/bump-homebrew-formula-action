import test, { ExecutionContext } from 'ava'
import { compare, fromUrl, filterTagPrefix } from './version'

test('fromUrl()', (t) => {
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

test('fromUrl() unique tag format', (t) => {
  t.is(
    fromUrl('https://github.com/me/myproject/archive/package-v1.2.3.tar.gz'),
    'package-v1.2.3'
  )
  t.is(
    fromUrl(
      'https://github.com/me/myproject/releases/download/package-v1.2.3/file.tgz'
    ),
    'package-v1.2.3'
  )
  t.is(
    fromUrl('http://myproject.net/download/package-v1.2.3.tgz'),
    'package-v1.2.3'
  )
  t.is(fromUrl('https://example.com/package-v1.2.3.zip'), 'package-v1.2.3')
})

const compareMacro = (
  t: ExecutionContext,
  newV: string,
  oldV: string,
  expected: number
) => t.is(compare(newV, oldV), expected)

test('compare equal', compareMacro, 'v1.2.3', 'v1.2.3', 0)
test('compare older', compareMacro, 'v1.2.3', 'v1.2.4', -1)
test('compare newer ', compareMacro, 'v1.2.4', 'v1.2.3', 1)
test('compare older no prefix', compareMacro, '0.2.3', '1.2.0', -1)
test('compare newer no prefix', compareMacro, '0.0.3', '0.0.2', 1)
test('compare equal mixed prefix', compareMacro, '0.0.0', 'v0.0.0', 0)

test(
  'compare newer pre-release',
  compareMacro,
  'v1.0.0-beta.7',
  'v1.0.0-beta.6',
  1
)

test(
  'compare newer leaving pre-release',
  compareMacro,
  'v1.0.0',
  'v1.0.0-beta.6',
  1
)

test(
  'compare equal pre-release',
  compareMacro,
  'v1.0.0-alpha.1',
  'v1.0.0-alpha.1',
  0
)

test('compare newer tag prefix change', (t) => {
  process.env['INPUT_TAG-PREFIX'] = 'gping-v'
  compareMacro(t, 'gping-v1.2.3', 'v1.2.1', 1)
})

test('compare older tag prefix change', (t) => {
  process.env['INPUT_TAG-PREFIX'] = '@scope/package@'
  compareMacro(t, '@scope/package@1.0.0-beta.4', 'v1.0.0-beta.10', -1)
})

test('versionFromTag() correctly filters prefix', (t) => {
  process.env['INPUT_TAG-PREFIX'] = '@scope/package@'
  t.is(filterTagPrefix('@scope/package@1.0.0-beta.1'), '1.0.0-beta.1')
})

test('versionFromTag() ignores tag with no prefix match', (t) => {
  process.env['INPUT_TAG-PREFIX'] = '@scope/package@'
  t.is(filterTagPrefix('v1.0.0'), 'v1.0.0')
})
