import { basename } from 'path'

const RE = /([0-9]+)|([a-zA-Z]+)/g

function parse(ver: string): ReadonlyArray<string | number> {
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

const ghDownloadRE =
  /^https:\/\/github.com\/[^/]+\/[^/]+\/releases\/download\/([^/]+)/

// TODO: https://github.com/Homebrew/brew/blob/675e38b5e4fe0290fa05f65af23c9a82d3e7cc76/Library/Homebrew/version.rb#L225-L363
export function fromUrl(url: string): string {
  const downloadMatch = url.match(ghDownloadRE)
  if (downloadMatch) {
    return downloadMatch[1]
  }
  return basename(url).replace(/\.(tar\.gz|tgz|zip)$/, '')
}
