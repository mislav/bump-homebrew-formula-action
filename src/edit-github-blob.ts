import type { API } from './api'
import { RequestError } from '@octokit/request-error'
import { basename } from 'path'

async function retry<T>(
  times: number,
  delay: number,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (times > 0) {
      return new Promise((resolve): void => {
        setTimeout(() => {
          resolve(retry(times - 1, delay, fn))
        }, delay)
      })
    }
    throw err
  }
}

export type Options = {
  owner: string
  repo: string
  filePath: string
  branch?: string
  apiClient: API
  replace: (oldContent: string) => string
  commitMessage?: string
  pushTo?: {
    owner: string
    repo: string
  }
  makePR?: boolean
}

export default async function (params: Options): Promise<string> {
  const baseRepo = {
    owner: params.owner,
    repo: params.repo,
  }
  let headRepo = params.pushTo == null ? baseRepo : params.pushTo
  const filePath = params.filePath
  const api = params.apiClient.rest

  const repoRes = await api.repos.get(baseRepo)
  const makeFork =
    params.pushTo == null &&
    (repoRes.data.permissions == null || !repoRes.data.permissions.push)
  const inFork =
    makeFork ||
    `${baseRepo.owner}/${baseRepo.repo}`.toLowerCase() !=
      `${headRepo.owner}/${headRepo.repo}`.toLowerCase()

  const baseBranch = params.branch ? params.branch : repoRes.data.default_branch
  let headBranch = baseBranch
  const branchRes = await api.repos.getBranch({
    ...baseRepo,
    branch: baseBranch,
  })
  const needsBranch =
    inFork || branchRes.data.protected || params.makePR === true

  if (makeFork) {
    const res = await Promise.all([
      api.repos.createFork(baseRepo),
      api.users.getAuthenticated(),
    ])
    headRepo = {
      owner: res[1].data.login,
      repo: baseRepo.repo,
    }
  }

  if (needsBranch) {
    const timestamp = Math.round(Date.now() / 1000)
    headBranch = `update-${basename(filePath)}-${timestamp}`
    if (inFork) {
      try {
        await api.repos.mergeUpstream({
          ...headRepo,
          branch: repoRes.data.default_branch,
        })
      } catch (err) {
        if (err instanceof RequestError && err.status === 409) {
          // ignore
        } else {
          throw err
        }
      }
    }
    await retry(makeFork ? 6 : 0, 5000, async () => {
      await api.git.createRef({
        ...headRepo,
        ref: `refs/heads/${headBranch}`,
        sha: branchRes.data.commit.sha,
      })
    })
  }

  const fileRes = await api.repos.getContent({
    ...headRepo,
    path: filePath,
    ref: headBranch,
  })
  const fileData = fileRes.data
  if (Array.isArray(fileData)) {
    throw new Error(`expected '${filePath}' is a file, got a directory`)
  }
  const content = ('content' in fileData && fileData.content) || ''
  const contentBuf = Buffer.from(content, 'base64')

  const oldContent = contentBuf.toString('utf8')
  const newContent = params.replace(oldContent)
  if (newContent == oldContent) {
    throw new Error('no replacements ocurred')
  }

  const commitMessage = params.commitMessage
    ? params.commitMessage
    : `Update ${filePath}`
  const commitRes = await api.repos.createOrUpdateFileContents({
    ...headRepo,
    path: filePath,
    message: commitMessage,
    content: Buffer.from(newContent).toString('base64'),
    sha: fileData.sha,
    branch: headBranch,
  })

  if (needsBranch && params.makePR !== false) {
    const parts = commitMessage.split('\n\n')
    const title = parts[0]
    const body = parts.slice(1).join('\n\n')

    const prRes = await api.pulls.create({
      ...baseRepo,
      base: baseBranch,
      head: `${headRepo.owner}:${headBranch}`,
      title,
      body,
    })
    return prRes.data.html_url
  } else {
    return commitRes.data.commit.html_url || ''
  }
}
