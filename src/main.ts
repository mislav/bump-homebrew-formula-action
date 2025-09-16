import { getInput, getBooleanInput, summary } from '@actions/core'
import type { API } from './api.js'
import editGitHubBlob from './edit-github-blob.js'
import { Options as EditOptions } from './edit-github-blob.js'
import { removeRevisionLine, replaceFields } from './replace-formula-fields.js'
import calculateDownloadChecksum from './calculate-download-checksum.js'
import { context } from '@actions/github'

function tarballForRelease(
  owner: string,
  repo: string,
  tagName: string
): string {
  return `https://github.com/${owner}/${repo}/archive/refs/tags/${tagName}.tar.gz`
}

function formulaPath(owner: string, repo: string, formulaName: string): string {
  if (
    owner.toLowerCase() == 'homebrew' &&
    repo.toLowerCase() == 'homebrew-core'
  ) {
    // respect formula sharding structure in `Homebrew/homebrew-core`
    return `Formula/${formulaName.charAt(0)}/${formulaName}.rb`
  }
  return `Formula/${formulaName}.rb`
}

export function commitForRelease(
  messageTemplate: string,
  params: { [key: string]: string } = {}
): string {
  return messageTemplate.replace(
    /\{\{(\w+)\}\}/g,
    (m: string, key: string): string => {
      if (Object.hasOwnProperty.call(params, key)) {
        return params[key]
      }
      return m
    }
  )
}

export default async function (api: (token: string) => API): Promise<void> {
  const internalToken =
    process.env.GITHUB_TOKEN || process.env.COMMITTER_TOKEN || ''
  const externalToken = process.env.COMMITTER_TOKEN || ''

  const options = await prepareEdit(
    context,
    api(internalToken),
    api(externalToken)
  )
  const createdUrl = await editGitHubBlob(options)
  console.log(createdUrl)

  if (options.formulaName && options.version) {
    summary.addRaw(`🍺 Bumped ${options.formulaName} to ${options.version} `)
    summary.addLink(createdUrl, createdUrl)
    summary.addEOL()
    summary.write()
  }
}

type Context = {
  ref: string
  sha: string
  repo: {
    owner: string
    repo: string
  }
}

export async function prepareEdit(
  ctx: Context,
  sameRepoClient: API,
  crossRepoClient: API
): Promise<EditOptions> {
  const tagName =
    getInput('tag-name') ||
    ((ref) => {
      if (!ref.startsWith('refs/tags/')) throw `invalid ref: ${ref}`
      return ref.replace('refs/tags/', '')
    })(ctx.ref)

  const [owner, repo] = getInput('homebrew-tap', { required: true }).split('/')
  let pushTo: { owner: string; repo: string } | undefined
  const pushToSpec = getInput('push-to')
  if (pushToSpec) {
    const [pushToOwner, pushToRepo] = pushToSpec.split('/')
    pushTo = { owner: pushToOwner, repo: pushToRepo }
  } else if (
    owner.toLowerCase() == context.repo.owner.toLowerCase() &&
    repo.toLowerCase() == context.repo.repo.toLowerCase()
  ) {
    // If the homebrew-tap to update is the same repository that is running the Actions workflow,
    // explicitly set the same repository as the push-to target to skip any attempt of making a
    // fork of the repository. This is because a generated GITHUB_TOKEN would still appear as it
    // doesn't have permissions to push to homebrew-tap, even though it does.
    pushTo = context.repo
  }
  const formulaName = getInput('formula-name') || ctx.repo.repo.toLowerCase()
  const branch = getInput('base-branch')
  const filePath =
    getInput('formula-path') || formulaPath(owner, repo, formulaName)
  const version = tagName.replace(/^v(\d)/, '$1')
  const downloadUrl =
    getInput('download-url') ||
    tarballForRelease(ctx.repo.owner, ctx.repo.repo, tagName)
  const messageTemplate = getInput('commit-message', { required: true })

  let makePR: boolean | undefined
  if (getInput('create-pullrequest')) {
    makePR = getBooleanInput('create-pullrequest')
  }

  let makeBranch: boolean | undefined
  if (getInput('create-branch')) {
    makeBranch = getBooleanInput('create-branch')
  }

  if (makePR === true && makeBranch === false) {
    throw new Error(
      'create-pullrequest cannot be true if create-branch is false'
    )
  }

  const replacements = new Map<string, string>()
  replacements.set('version', version)
  replacements.set('url', downloadUrl)
  if (downloadUrl.endsWith('.git')) {
    replacements.set('tag', tagName)
    replacements.set(
      'revision',
      await (async () => {
        if (ctx.ref == `refs/tags/${tagName}`) return ctx.sha
        else {
          const res = await sameRepoClient.rest.git.getRef({
            ...ctx.repo,
            ref: `tags/${tagName}`,
          })
          return res.data.object.sha
        }
      })()
    )
  } else {
    replacements.set(
      'sha256',
      getInput('download-sha256') ||
        (await calculateDownloadChecksum(sameRepoClient, downloadUrl, 'sha256'))
    )
  }

  const commitMessage = commitForRelease(messageTemplate, {
    formulaName,
    version,
  })

  return {
    apiClient: crossRepoClient,
    owner,
    repo,
    branch,
    filePath,
    formulaName,
    version,
    commitMessage,
    pushTo,
    makePR,
    makeBranch,
    replace(oldContent: string) {
      return removeRevisionLine(replaceFields(oldContent, replacements))
    },
  }
}
