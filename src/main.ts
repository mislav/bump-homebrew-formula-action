import { getInput, getBooleanInput } from '@actions/core'
import type { API } from './api'
import editGitHubBlob from './edit-github-blob'
import { Options as EditOptions } from './edit-github-blob'
import { removeRevisionLine, replaceFields } from './replace-formula-fields'
import calculateDownloadChecksum from './calculate-download-checksum'
import { context } from '@actions/github'

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
  const filePath = getInput('formula-path') || `Formula/${formulaName}.rb`
  const version = tagName.replace(/^v(\d)/, '$1')
  const downloadUrl =
    getInput('download-url') ||
    tarballForRelease(ctx.repo.owner, ctx.repo.repo, tagName)
  const messageTemplate = getInput('commit-message', { required: true })

  let makePR: boolean | undefined
  if (getInput('create-pullrequest')) {
    makePR = getBooleanInput('create-pullrequest')
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
    commitMessage,
    pushTo,
    makePR,
    replace(oldContent: string) {
      return removeRevisionLine(replaceFields(oldContent, replacements))
    },
  }
}
