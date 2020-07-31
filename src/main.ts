import { getInput } from '@actions/core'
import type { API } from './api'
import editGitHubBlob from './edit-github-blob'
import { replaceFields } from './replace-formula-fields'
import calculateDownloadChecksum from './calculate-download-checksum'

function tarballForRelease(
  owner: string,
  repo: string,
  tagName: string
): string {
  return `https://github.com/${owner}/${repo}/archive/${tagName}.tar.gz`
}

export function commitForRelease(
  messageTemplate: string,
  params: { [key: string]: string } = {}
): string {
  return Object.keys(params).reduce(
    (currentMessage, tag) => currentMessage.replace(`{{${tag}}}`, params[tag]),
    messageTemplate
  )
}

export default async function (api: (token: string) => API): Promise<void> {
  const internalToken =
    process.env.GITHUB_TOKEN || process.env.COMMITTER_TOKEN || ''
  const externalToken = process.env.COMMITTER_TOKEN || ''

  const [contextOwner, contextRepoName] = (process.env
    .GITHUB_REPOSITORY as string).split('/')

  const [owner, repo] = getInput('homebrew-tap', { required: true }).split('/')
  const formulaName = getInput('formula-name') || contextRepoName.toLowerCase()
  const branch = getInput('base-branch')
  const filePath = `Formula/${formulaName}.rb`
  const tagName = (process.env.GITHUB_REF as string).replace('refs/tags/', '')
  const tagSha = process.env.GITHUB_SHA as string
  const version = getInput('formula-version') || tagName.replace(/^v(\d)/, '$1')
  const downloadUrl =
    getInput('download-url') ||
    tarballForRelease(contextOwner, contextRepoName, tagName)
  const messageTemplate = getInput('commit-message', { required: true })

  const replacements = new Map<string, string>()
  replacements.set('version', version)
  replacements.set('url', downloadUrl)
  if (downloadUrl.endsWith('.git')) {
    replacements.set('tag', tagName)
    replacements.set('revision', tagSha)
  } else {
    replacements.set(
      'sha256',
      await calculateDownloadChecksum(api(internalToken), downloadUrl, 'sha256')
    )
  }

  const commitMessage = commitForRelease(messageTemplate, {
    formulaName,
    version,
  })

  const createdUrl = await editGitHubBlob({
    apiClient: api(externalToken),
    owner,
    repo,
    branch,
    filePath,
    commitMessage,
    replace(oldContent) {
      return replaceFields(oldContent, replacements)
    },
  })
  console.log(createdUrl)
}
