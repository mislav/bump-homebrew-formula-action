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

async function resolveDownload(apiClient: API, url: URL): Promise<URL> {
  if (url.hostname == 'github.com') {
    const api = apiClient.rest
    const archive = parseArchiveUrl(url)
    if (archive != null) {
      const { owner, repo, ref } = archive
      const res = await (archive.ext == '.zip'
        ? api.repos.downloadZipballArchive
        : api.repos.downloadTarballArchive)({
        owner,
        repo,
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

    const download = parseReleaseDownloadUrl(url)
    if (download != null) {
      const { owner, repo } = download
      const tag = download.tagname
      const res = await api.repos.getReleaseByTag({ owner, repo, tag })
      const asset = res.data.assets.find((a) => a.name == download.name)
      if (asset == null) {
        throw new Error(
          `could not find asset '${download.name}' in '${tag}' release`
        )
      }
      const assetRes = await apiClient.request(asset.url, {
        headers: { accept: 'application/octet-stream' },
        request: { redirect: 'manual' },
      })
      const loc = assetRes.headers['location'] as string
      return new URL(loc)
    }
  }
  return url
}

type archive = {
  owner: string
  repo: string
  ref: string
  ext: string
}

export function parseArchiveUrl(url: URL): archive | null {
  const match = url.pathname.match(
    /^\/([^/]+)\/([^/]+)\/archive\/(.+)(\.tar\.gz|\.zip)$/
  )
  if (match == null) {
    return null
  }
  return {
    owner: match[1],
    repo: match[2],
    ref: match[3],
    ext: match[4],
  }
}

type asset = {
  owner: string
  repo: string
  tagname: string
  name: string
}

export function parseReleaseDownloadUrl(url: URL): asset | null {
  const match = url.pathname.match(
    /^\/([^/]+)\/([^/]+)\/releases\/download\/(.+)$/
  )
  if (match == null) {
    return null
  }
  const parts = match[3].split('/')
  if (parts.length < 2) {
    return null
  }
  const name = parts.pop() || ''
  return {
    owner: match[1],
    repo: match[2],
    tagname: decodeURIComponent(parts.join('/')),
    name: name,
  }
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
