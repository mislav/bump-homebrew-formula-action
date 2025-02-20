import test from 'ava'
import api from './api.js'
import { commitForRelease, prepareEdit } from './main.js'

test('commitForRelease()', (t) => {
  t.is(
    commitForRelease('This is a fixed commit message', {
      formulaName: 'test formula',
    }),
    'This is a fixed commit message'
  )
  t.is(
    commitForRelease('chore({{formulaName}}): version {{version}}', {
      formulaName: 'test formula',
    }),
    'chore(test formula): version {{version}}'
  )
  t.is(
    commitForRelease('{formulaName} {version}', {
      formulaName: 'test formula',
      version: 'v1.2.3',
    }),
    '{formulaName} {version}'
  )
  t.is(
    commitForRelease('chore({{formulaName}}): upgrade to version {{version}}', {
      formulaName: 'test formula',
      version: 'v1.2.3',
    }),
    'chore(test formula): upgrade to version v1.2.3'
  )
  t.is(
    commitForRelease(
      '{{formulaName}} {{version}}: upgrade {{formulaName}} to version {{version}}',
      {
        formulaName: 'test formula',
        version: 'v1.2.3',
      }
    ),
    'test formula v1.2.3: upgrade test formula to version v1.2.3'
  )
  t.is(
    commitForRelease('{{constructor}}{{__proto__}}', {}),
    '{{constructor}}{{__proto__}}'
  )
  t.is(
    commitForRelease('{{version}}', { version: 'v{{version}}' }),
    'v{{version}}'
  )
})

test('prepareEdit() homebrew-core', async (t) => {
  const ctx = {
    sha: 'TAGSHA',
    ref: 'refs/tags/v1.9',
    repo: {
      owner: 'mislav',
      repo: 'bump-homebrew-formula-action',
    },
  }

  process.env['GITHUB_REPOSITORY'] = 'monalisa/hello-world'
  process.env['INPUT_HOMEBREW-TAP'] = 'Homebrew/homebrew-core'
  process.env['INPUT_COMMIT-MESSAGE'] = 'Upgrade {{formulaName}} to {{version}}'

  // FIXME: this tests results in a live HTTP request. Figure out how to stub
  // `stream()` and `resolveRedirect()` methods in calculate-download-checksum.
  const stubbedFetch = function (url: string) {
    throw url
  }
  const apiClient = api('', { fetch: stubbedFetch, logRequests: false })

  const opts = await prepareEdit(ctx, apiClient, apiClient)
  t.is(opts.owner, 'Homebrew')
  t.is(opts.repo, 'homebrew-core')
  t.is(opts.branch, '')
  t.is(opts.filePath, 'Formula/b/bump-homebrew-formula-action.rb')
  t.is(opts.commitMessage, 'Upgrade bump-homebrew-formula-action to 1.9')

  const oldFormula = `
    class MyProgram < Formula
      url "OLDURL"
      sha256 "OLDSHA"
      revision 12
      head "git://example.com/repo.git",
        revision: "GITSHA"
    end
  `
  t.is(
    `
    class MyProgram < Formula
      url "https://github.com/mislav/bump-homebrew-formula-action/archive/refs/tags/v1.9.tar.gz"
      sha256 "c036fbc44901b266f6d408d6ca36ba56f63c14cc97994a935fb9741b55edee83"
      head "git://example.com/repo.git",
        revision: "GITSHA"
    end
  `,
    opts.replace(oldFormula)
  )
})

test('prepareEdit() non-homebrew-core', async (t) => {
  const ctx = {
    sha: 'TAGSHA',
    ref: 'refs/tags/v0.8.2',
    repo: {
      owner: 'OWNER',
      repo: 'REPO',
    },
  }

  process.env['GITHUB_REPOSITORY'] = 'monalisa/hello-world'
  process.env['INPUT_HOMEBREW-TAP'] = 'myorg/homebrew-utils'
  process.env['INPUT_COMMIT-MESSAGE'] = 'Upgrade {{formulaName}} to {{version}}'
  process.env['INPUT_DOWNLOAD-SHA256'] = 'MOCK-SHA-256'

  const apiClient = api('ATOKEN', {
    fetch: function (url: string) {
      throw url
    },
    logRequests: false,
  })

  const opts = await prepareEdit(ctx, apiClient, apiClient)
  t.is(opts.owner, 'myorg')
  t.is(opts.repo, 'homebrew-utils')
  t.is(opts.branch, '')
  t.is(opts.filePath, 'Formula/repo.rb')
  t.is(opts.commitMessage, 'Upgrade repo to 0.8.2')
})
