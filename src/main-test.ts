import test from 'ava'
import sinon from 'sinon'
import api from './api'
import { commitForRelease, prepareEdit } from './main'
import * as calculateDownloadChecksum from './calculate-download-checksum'

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

test('prepareEdit()', async (t) => {
  const ctx = {
    sha: 'TAGSHA',
    ref: 'refs/tags/v0.8.2',
    repo: {
      owner: 'OWNER',
      repo: 'REPO',
    },
  }

  process.env['INPUT_HOMEBREW-TAP'] = 'Homebrew/homebrew-core'
  process.env['INPUT_COMMIT-MESSAGE'] = 'Upgrade {{formulaName}} to {{version}}'

  sinon.stub(calculateDownloadChecksum, 'default').resolves('NEWSHA')
  const stubbedFetch = sinon.stub()

  const apiClient = api('ATOKEN', { fetch: stubbedFetch, logRequests: false })

  const opts = await prepareEdit(ctx, apiClient, apiClient)
  t.is(opts.owner, 'Homebrew')
  t.is(opts.repo, 'homebrew-core')
  t.is(opts.branch, '')
  t.is(opts.filePath, 'Formula/repo.rb')
  t.is(opts.commitMessage, 'Upgrade repo to 0.8.2')

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
      url "https://github.com/OWNER/REPO/archive/v0.8.2.tar.gz"
      sha256 "NEWSHA"
      head "git://example.com/repo.git",
        revision: "GITSHA"
    end
  `,
    opts.replace(oldFormula)
  )
})

test('prepareEdit() with unique tag-name', async (t) => {
  const ctx = {
    sha: 'TAGSHA',
    ref: 'refs/tags/@scope/package@1.1.0',
    repo: {
      owner: 'OWNER',
      repo: 'REPO',
    },
  }

  process.env['INPUT_HOMEBREW-TAP'] = 'Homebrew/homebrew-core'
  process.env['INPUT_COMMIT-MESSAGE'] = 'Upgrade {{formulaName}} to {{version}}'
  process.env['INPUT_TAG-NAME'] = '@scope/package@1.1.0'
  process.env['INPUT_VERSION-PATTERN'] = '@scope/package@(.*)'
  process.env['INPUT_DOWNLOAD-URL'] = 'NEWURL.git'

  const fetchStub = sinon
    .stub()
    .resolves({ data: { object: { sha: 'NEWSHA' } } })
  const apiClient = api('ATOKEN', { fetch: fetchStub, logRequests: false })

  const opts = await prepareEdit(ctx, apiClient, apiClient)
  t.is(opts.owner, 'Homebrew')
  t.is(opts.repo, 'homebrew-core')
  t.is(opts.branch, '')
  t.is(opts.filePath, 'Formula/repo.rb')
  t.is(opts.commitMessage, 'Upgrade repo to 1.1.0')

  const oldFormula = `
    class MyProgram < Formula
      url "OLDURL.git"
      sha256 "OLDSHA"
      version "1.0.0"
    end
  `
  t.is(
    `
    class MyProgram < Formula
      url "NEWURL.git"
      sha256 "NEWSHA"
      version "1.1.0"
    end
  `,
    opts.replace(oldFormula)
  )
})
