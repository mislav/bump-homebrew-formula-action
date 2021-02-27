import { isDebug } from '@actions/core'
import { Octokit } from '@octokit/core'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { requestLog } from '@octokit/plugin-request-log'

const GitHub = Octokit.plugin(restEndpointMethods, requestLog).defaults({
  baseUrl: 'https://api.github.com',
})

export type API = InstanceType<typeof GitHub>

export default function (token: string, options?: {fetch?: any}): API {
  return new GitHub({
    request: {fetch: options?.fetch},
    auth: `token ${token}`,
    log: {
      info(msg: string) {
        return console.info(msg)
      },
      debug(msg: string) {
        if (!isDebug()) return
        return console.debug(msg)
      },
      warn(msg: string) {
        return console.warn(msg)
      },
      error(msg: string) {
        return console.error(msg)
      },
    },
  })
}
