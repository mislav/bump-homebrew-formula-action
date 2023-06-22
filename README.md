An action that bumps a Homebrew formula after a new release.

Minimal usage example:

```yml
on:
  push:
    tags: 'v*'

jobs:
  homebrew:
    name: Bump Homebrew formula
    runs-on: ubuntu-latest
    steps:
      - uses: mislav/bump-homebrew-formula-action@v2
        with:
          # A PR will be sent to github.com/Homebrew/homebrew-core to update this formula:
          formula-name: my_formula
        env:
          # the personal access token should have "repo" & "workflow" scopes
          COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
```

The `COMMITTER_TOKEN` secret is required because this action will want to write
to an external repository. You can [generate a new Personal Access Token (classic)
here](https://github.com/settings/tokens) and give it `repo` and `workflow` scopes.

Comprehensive usage example:

```yml
on:
  push:
    tags: 'v*'

jobs:
  homebrew:
    name: Bump Homebrew formula
    runs-on: ubuntu-latest
    steps:
      - name: Extract version
        id: extract-version
        run: |
          printf "::set-output name=%s::%s\n" tag-name "${GITHUB_REF#refs/tags/}"
      - uses: mislav/bump-homebrew-formula-action@v2
        if: "!contains(github.ref, '-')" # skip prereleases
        with:
          formula-name: my_formula
          formula-path: Formula/my_formula.rb
          homebrew-tap: Homebrew/homebrew-core
          base-branch: master
          download-url: https://example.com/foo/${{ steps.extract-version.outputs.tag-name }}.tar.gz
          commit-message: |
            {{formulaName}} {{version}}

            Created by https://github.com/mislav/bump-homebrew-formula-action
        env:
          COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
          # GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

You should enable `GITHUB_TOKEN` only if the repository that runs this Action is
private _and_ if `COMMITTER_TOKEN` has the `public_repo` scope only.
`GITHUB_TOKEN` will be used for verifying the SHA256 sum of the downloadable
archive for this release.


## Action inputs

Formula parameters:

* `formula-name`: the name of the Homebrew formula to bump. Defaults to
  lower-cased repository name.

* `formula-path`: the relative path of the Homebrew formula file to edit within the `homebrew-tap` repository. Defaults to
  `Formula/<formula-name>.rb`.

* `tag-name`: the git tag name to bump the formula to. Defaults to the
  currently pushed tag.

* `download-url`: the package download URL for the Homebrew formula.

  Defaults to `https://github.com/OWNER/REPO/archive/<tag-name>.tar.gz`, where `OWNER/REPO` is the repository that is running the Actions workflow.

* `download-sha256`: the SHA256 checksum of the archive at `download-url`.
  Defaults to calculating the checksum by fetching the archive at run time.

Repository parameters:

* `homebrew-tap`: the full GitHub repository name (in the `NAME/OWNER` format) where the Homebrew formula should be updated. Defaults
  to `Homebrew/homebrew-core`.

* `push-to`: a specific fork of `homebrew-tap` where the edit should be pushed to. Defaults to creating or reusing a personal fork of the owner of COMMITTER_TOKEN.

* `base-branch`: the branch name in the `homebrew-tap` repository where the
  formula should be updated. Defaults to the main branch of the repository.

* `create-pullrequest`: a boolean value to either force or prohibit submitting
  a pull request to `homebrew-tap`. Defaults to false if `COMMITTER_TOKEN` has
  the privileges to directly push to `base-branch` in `homebrew-tap`.

* `commit-message`: the git commit message template to use when updating the
  formula. The following placeholders be expanded:

  | Placeholder       | Description                                        |
  | ----------------- | -------------------------------------------------- |
  | `{{formulaName}}` | the name of the formula supplied in `formula-name` |
  | `{{version}}`     | the version number for this release                |

  It's recommended that `commit-message` has _both subject and body_, i.e. that
  it contains a subject line followed by a blank line followed by body text.
  Otherwise, pull requests to `Homebrew/homebrew-core` might get denied by
  their automation.

  Defaults to:
  ```
  {{formulaName}} {{version}}

  Created by https://github.com/mislav/bump-homebrew-formula-action
  ```


## How it works

Given a Homebrew formula `Formula/my_formula.rb` in the
[homebrew-core](https://github.com/Homebrew/homebrew-core) repo:

```rb
class MyFormula < Formula
  url "https://github.com/me/myproject/archive/v1.2.3.tar.gz"
  sha256 "<OLDSHA>"
  # ...
end
```

After we push a `v2.0.0` git tag to a project that has this action configured,
the formula will be updated to:

```rb
class MyFormula < Formula
  url "https://github.com/me/myproject/archive/v2.0.0.tar.gz"
  sha256 "<NEWSHA>"
  # ...
end
```

This action can update the following Homebrew formula fields:

- `version`
- `url`
- `sha256` - for non-git `download-url`
- `tag` - for git-based `download-url`
- `revision` - for git-based `download-url`

If the current `COMMITTER_TOKEN` doesn't have push access to the repo specified
by the `homebrew-tap` input, the formula will be edited in a fork that is
automatically created, and a pull request will be opened.

If the token has push access, but the default branch of the tap repo is
protected, a pull request will be opened from a new branch in the same repo.

Otherwise, the formula will be edited via a direct push to the default branch.
This can be overriden by setting `create-pullrequest`.


## Manual trigger

Here's an example of how to set up this action to be manually triggered instead
of being triggered by pushing to a git tag:

```yml
on:
  workflow_dispatch:
    inputs:
      tag-name:
        description: 'The git tag name to bump the formula to'
        required: true

jobs:
  homebrew:
    name: Bump Homebrew formula
    runs-on: ubuntu-latest
    steps:
      - uses: mislav/bump-homebrew-formula-action@v2
        with:
          formula-name: my_formula
          tag-name: ${{ github.event.inputs.tag-name }}
          download-url: https://example.com/foo/${{ github.event.inputs.tag-name }}.tar.gz
        env:
          COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
```
