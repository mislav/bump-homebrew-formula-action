import test from 'ava'
import { fromUrl } from './version'

test('version.fromUrl()', t => {
  t.is(
    fromUrl('https://github.com/me/myproject/archive/v1.2.3.tar.gz'),
    'v1.2.3'
  )
  t.is(fromUrl('http://myproject.net/download/v1.2.3.tgz'), 'v1.2.3')
  t.is(fromUrl('https://example.com/v1.2.3.zip'), 'v1.2.3')
})
