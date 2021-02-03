import type { API } from './api'
import { debug } from '@actions/core'
import { URL } from 'url'
import { createHash } from 'crypto'
import { get as HTTP } from 'http'
import { get as HTTPS } from 'https'

interface Headers {
  [name: string]: string
}

function stream(
  url: URL,
  headers: Headers,
  cb: (chunk: Buffer) => void
): Promise<void> {
  return new Promise((resolve, reject): void => {
    ;(url.protocol == 'https:' ? HTTPS : HTTP)(url, { headers }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
        const loc = res.headers['location']
        if (loc == null) throw `HTTP ${res.statusCode} but no Location header`
        const nextURL = new URL(loc)
        log(nextURL)
        resolve(stream(nextURL, headers, cb))
        return
      } else if (res.statusCode && res.statusCode >= 400) {
        throw new Error(`HTTP ${res.statusCode}`)
      }
      res.on('data', (d) => cb(d))
      res.on('end', () => resolve())
    }).on('error', (err) => reject(err))
  })
}

async function resolveDownload(api: API, url: URL): Promise<URL> {
  if (url.hostname == 'github.com') {
    const archive = url.pathname.match(
      /^\/([^/]+)\/([^/]+)\/archive\/([^/]+)(\.tar\.gz|\.zip)$/
    )
    if (archive != null) {
      const [, owner, repo, ref, ext] = archive
      const res = await api.repos.downloadArchive({
        owner,
        repo,
        archive_format: ext == '.zip' ? 'zipball' : 'tarball',
        ref,
        request: {
          redirect: 'manual',
        },
      })
      const loc = res.headers['location'] as string
      // HACK: removing "legacy" from the codeload URL ensures that we get the
      // same archive file as web download. Otherwise, the downloaded archive
      // contains resolved commit SHA instead of the tag name in directory path.
      return new URL(loc.replace('/legacy.', '/'))
    }

    const release = url.pathname.match(
      /^\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/
    )
    if (release != null) {
      const [, owner, repo, tag, path] = release
      const res = await api.repos.getReleaseByTag({ owner, repo, tag })
      const asset = res.data.assets.find((a) => a.name == path)
      if (asset == null) {
        throw new Error(`could not find asset '${path}' in '${tag}' release`)
      }
      const assetRes = await api.request(asset.url, {
        headers: { accept: 'application/octet-stream' },
        request: { redirect: 'manual' },
      })
      const loc = assetRes.headers['location'] as string
      return new URL(loc)
    }
  }
  return url
}

function log(url: URL): void {
  const params = Array.from(url.searchParams.keys())
  const q = params.length > 0 ? `?${params.join(',')}` : ''
  debug(`GET ${url.protocol}//${url.hostname}${url.pathname}${q}`)
}

export default async function (
  api: API,
  url: string,
  algorithm: string
): Promise<string> {
  const downloadUrl = await resolveDownload(api, new URL(url))
  const requestHeaders = { accept: 'application/octet-stream' }
  const hash = createHash(algorithm)
  log(downloadUrl)
  await stream(downloadUrl, requestHeaders, (chunk) => hash.update(chunk))
  return hash.digest('hex')
}
