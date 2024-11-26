import { setFailed } from '@actions/core'
import api from './api.js'
import { UpgradeError } from './replace-formula-fields.js'
import run from './main.js'

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
