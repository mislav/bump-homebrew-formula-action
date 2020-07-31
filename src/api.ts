import { Octokit } from '@octokit/core'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { requestLog } from '@octokit/plugin-request-log'

const GitHub = Octokit.plugin(
    restEndpointMethods,
    requestLog,
).defaults({
    baseUrl: "https://api.github.com",
})

export type API = InstanceType<typeof GitHub>

export default function (token: string): API {
    return new GitHub({
        auth: `token ${token}`,
        log: {
            info: console.log
        },
    })
}
