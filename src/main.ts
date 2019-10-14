import { setFailed, getInput } from '@actions/core'
import { context, GitHub } from '@actions/github'
import editGitHubBlob from './edit-github-blob'
import replaceFormulaFields from './replace-formula-fields'
import calculateDownloadChecksum from './calculate-download-checksum'

function tarballForRelease(tagName: string): string {
  const { owner, repo } = context.repo
  return `https://github.com/${owner}/${repo}/archive/${tagName}.tar.gz`
}

const run = async (): Promise<void> => {
  const token = process.env.COMMITTER_TOKEN || ''
  const apiClient = new GitHub(token)

  const [owner, repo] = getInput('homebrew-tap', { required: true }).split('/')
  const formulaName = getInput('formula-name', { required: true })
  const branch = getInput('base-branch')
  const filePath = `Formula/${formulaName}.rb`
  const tagName = context.ref.replace('refs/tags/', '')
  const downloadUrl = getInput('download-url') || tarballForRelease(tagName)

  const replacements = new Map<string, string>()
  replacements.set('url', downloadUrl.toString())
  replacements.set(
    'sha256',
    await calculateDownloadChecksum(apiClient, downloadUrl, 'sha256')
  )

  await editGitHubBlob({
    apiClient,
    owner,
    repo,
    branch,
    filePath,
    replace(oldContent) {
      return replaceFormulaFields(oldContent, replacements)
    },
  })
}

run().catch(error => {
  setFailed(error.toString())
})
