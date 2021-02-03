import { isDebug } from '@actions/core'
import { Octokit } from '@octokit/core'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { requestLog } from '@octokit/plugin-request-log'

const GitHub = Octokit.plugin(restEndpointMethods, requestLog).defaults({
  baseUrl: 'https://api.github.com',
})

export type API = InstanceType<typeof GitHub>

type LogMethod = (msg: any, ...params: any[]) => void

type Logger = {
  info?: LogMethod
  debug?: LogMethod
}

export default function (token: string): API {
  const log: Logger = {
    info: console.log,
  }
  if (isDebug()) {
    log.debug = console.debug
  }

  return new GitHub({
    auth: `token ${token}`,
    log,
  })
}
