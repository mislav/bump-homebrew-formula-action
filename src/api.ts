import { isDebug } from '@actions/core'
import { Octokit } from '@octokit/core'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { requestLog } from '@octokit/plugin-request-log'
import { Response } from 'node-fetch'

const GitHub = Octokit.plugin(restEndpointMethods, requestLog).defaults({
  baseUrl: 'https://api.github.com',
})

export type API = InstanceType<typeof GitHub>

type fetch = (url: string, options: fetchOptions) => Promise<Response>
type fetchOptions = {
  method: string
  body: string | null
}

export default function (
  token: string,
  options?: { logRequests?: boolean; fetch?: fetch }
): API {
  return new GitHub({
    request: { fetch: options && options.fetch },
    auth: `token ${token}`,
    log: {
      info(msg: string) {
        if (options && options.logRequests === false) return
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
