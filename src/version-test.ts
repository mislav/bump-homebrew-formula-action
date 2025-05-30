import test from 'ava'
import { compare, fromUrl } from './version.js'

test('fromUrl()', (t) => {
  const cases = new Map<string, string>([
    [
      'https://github.com/me/myproject/archive/refs/tags/v1.2.3.tar.gz',
      'v1.2.3',
    ],
    [
      'https://github.com/me/myproject/releases/download/v1.2.3/file.tgz',
      'v1.2.3',
    ],
    ['http://myproject.net/download/v1.2.3.tgz', 'v1.2.3'],
    ['https://example.com/v1.2.3.zip', 'v1.2.3'],
    [
      'https://github.com/SmartThingsCommunity/smartthings-cli/releases/download/%40smartthings%2Fcli%401.7.0/smartthings-macos-arm64.tar.gz',
      '@smartthings/cli@1.7.0',
    ],
    [
      'https://github.com/SmartThingsCommunity/smartthings-cli/releases/download/@smartthings/cli@1.7.0/smartthings-macos-x64.tar.gz',
      '@smartthings/cli@1.7.0',
    ],
    [
      'https://github.com/orf/gping/archive/refs/tags/gping-v1.14.0.tar.gz',
      'gping-v1.14.0',
    ],
  ])
  for (const item of cases) {
    t.is(fromUrl(item[0]), item[1], item[0])
  }
})

test('compare()', (t) => {
  t.is(compare('v1.2.0', 'v1.2.1'), -1)
  t.is(compare('v1.2.0', 'v1.1.9.0'), 1)
  t.is(compare('gping-v1.13', 'gping-v1.14.0'), -1)
  t.is(compare('@smartthings/cli@1.7.0', '@smartthings/cli@1.7.0-rc2'), 1)
  t.is(compare('@smartthings/cli@1.7.0', '@smartthings/cli@1.7.0'), 0)
  t.is(compare('@smartthings/cli@1.7.0', '@smartthings/cli@1.10.0'), -1)
})
