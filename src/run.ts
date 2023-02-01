import { setFailed } from '@actions/core'
import { UpgradeError } from './errors'
import api from './api'
import run from './main'

run(api).catch((error) => {
  if (error instanceof UpgradeError) {
    console.warn('Skipping: %s', error.message)
    return
  }
  setFailed(error.toString())
  if (process.env.GITHUB_ACTIONS == undefined) {
    console.error(error.stack)
  }
})
