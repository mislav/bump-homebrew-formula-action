import { setFailed, getInput, debug } from '@actions/core'
import { context, GitHub } from '@actions/github'
import editGitHubBlob from './edit-github-blob'
import replaceFormulaFields from './replace-formula-fields'
import calculateDownloadChecksum from './calculate-download-checksum'

function tarballForRelease(tagName: string): string {
  const { owner, repo } = context.repo
  return `https://github.com/${owner}/${repo}/archive/${tagName}.tar.gz`
}

function api(token: string): GitHub {
  const gh = new GitHub(token)
  gh.hook.before('request', options => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: any = options
    const { url } = gh.request.endpoint(opts)
    if (url) debug(`${options.method} ${url}`)
  })
  return gh
}

const run = async (): Promise<void> => {
  const internalToken =
    process.env.GITHUB_TOKEN || process.env.COMMITTER_TOKEN || ''
  const externalToken = process.env.COMMITTER_TOKEN || ''

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
    await calculateDownloadChecksum(api(internalToken), downloadUrl, 'sha256')
  )

  const commitMessage = `${formulaName} ${tagName}

Created by https://github.com/mislav/bump-homebrew-formula-action`

  const createdUrl = await editGitHubBlob({
    apiClient: api(externalToken),
    owner,
    repo,
    branch,
    filePath,
    commitMessage,
    replace(oldContent) {
      return replaceFormulaFields(oldContent, replacements)
    },
  })
  console.log(createdUrl)
}

run().catch(error => {
  setFailed(error.toString())
})
