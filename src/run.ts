import { setFailed, debug } from '@actions/core'
import { GitHub } from '@actions/github'
import { UpgradeError } from './replace-formula-fields'
import run from './main'

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

run(api).catch(error => {
  if (error instanceof UpgradeError) {
    console.warn('Skipping: %s', error.message)
    return
  }
  setFailed(error.toString())
})
