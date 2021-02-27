import test from 'ava'
import api from './api'
import { commitForRelease, prepareEdit } from './main'
import { Response } from 'node-fetch'

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
    commitForRelease('chore({{formulaName}}): upgrade to version {{version}}', {
      formulaName: 'test formula',
      version: 'v1.2.3',
    }),
    'chore(test formula): upgrade to version v1.2.3'
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

  // FIXME: this tests results in a live HTTP request. Figure out how to stub the `stream()` method in
  // calculate-download-checksum.
  const stubbedFetch = function (url: string) {
    if (url == 'https://api.github.com/repos/OWNER/REPO/tarball/v0.8.2') {
      return Promise.resolve(
        new Response('', {
          status: 301,
          headers: {
            Location:
              'https://github.com/mislav/bump-homebrew-formula-action/archive/v1.9.tar.gz',
          },
        })
      )
    }
    throw url
  }
  const apiClient = api('ATOKEN', { fetch: stubbedFetch })

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
      sha256 "c036fbc44901b266f6d408d6ca36ba56f63c14cc97994a935fb9741b55edee83"
      head "git://example.com/repo.git",
        revision: "GITSHA"
    end
  `,
    opts.replace(oldFormula)
  )
})
