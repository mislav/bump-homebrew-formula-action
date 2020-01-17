import { getInput } from '@actions/core'
import { context, GitHub } from '@actions/github'
import editGitHubBlob from './edit-github-blob'
import { replaceFields } from './replace-formula-fields'
import calculateDownloadChecksum from './calculate-download-checksum'

function tarballForRelease(tagName: string): string {
  const { owner, repo } = context.repo
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

export default async function(api: (token: string) => GitHub): Promise<void> {
  const internalToken =
    process.env.GITHUB_TOKEN || process.env.COMMITTER_TOKEN || ''
  const externalToken = process.env.COMMITTER_TOKEN || ''

  const [owner, repo] = getInput('homebrew-tap', { required: true }).split('/')
  const formulaName = getInput('formula-name', { required: true })
  const branch = getInput('base-branch')
  const filePath = `Formula/${formulaName}.rb`
  const tagName = context.ref.replace('refs/tags/', '')
  const version = tagName.replace(/^v(\d)/, '$1')
  const downloadUrl = getInput('download-url') || tarballForRelease(tagName)
  const messageTemplate = getInput('commit-message', { required: true })

  const replacements = new Map<string, string>()
  replacements.set('version', version)
  replacements.set('url', downloadUrl.toString())
  replacements.set(
    'sha256',
    await calculateDownloadChecksum(api(internalToken), downloadUrl, 'sha256')
  )

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
