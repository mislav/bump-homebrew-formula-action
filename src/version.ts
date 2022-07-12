import { getInput } from '@actions/core'
import { basename } from 'path'
import { parseReleaseDownloadUrl } from './calculate-download-checksum'

const RE = /([0-9]+)|([a-zA-Z]+)/g

function parse(tag: string): ReadonlyArray<string | number> {
  const ver = filterTagPrefix(tag)
  const parts = []
  for (const m of ver.matchAll(RE)) {
    parts.push(m[1] ? parseInt(m[1]) : m[2])
  }
  if (parts[0] == 'v') parts.shift()
  return parts
}

export function compare(v1: string, v2: string): -1 | 0 | 1 {
  const p1 = parse(v1)
  const p2 = parse(v2)
  const len = Math.min(p1.length, p2.length)
  for (let i = 0; i <= len; i++) {
    const n1 = p1[i] || 0
    const n2 = p2[i] || 0
    if (typeof n1 == typeof n2) {
      if (n1 < n2) return -1
      if (n1 > n2) return 1
    } else {
      return typeof n1 == 'string' ? -1 : 1
    }
  }
  return 0
}

// TODO: https://github.com/Homebrew/brew/blob/675e38b5e4fe0290fa05f65af23c9a82d3e7cc76/Library/Homebrew/version.rb#L225-L363
export function fromUrl(url: string): string {
  const downloadMatch = parseReleaseDownloadUrl(new URL(url))
  if (downloadMatch) {
    return downloadMatch.tagname
  }
  return basename(url).replace(/\.(tar\.gz|tgz|zip)$/, '')
}

export function filterTagPrefix(tag: string): string {
  const tagPrefix = getInput('tag-prefix') || '^v'
  return tag.replace(new RegExp(`${tagPrefix}(\\d)`), '$1')
}
