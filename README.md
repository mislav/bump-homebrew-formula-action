A minimal GitHub action that uses the GitHub API to bump a Homebrew formula
after a new release in your repository.

Usage example:

```yml
on:
  push:
    tags: 'v*'

jobs:
  homebrew:
    name: Bump Homebrew formula
    runs-on: ubuntu-latest
    steps:
      - uses: mislav/bump-homebrew-formula-action@v3
        with:
          # By default, this will edit the `my_formula.rb` formula in
          # homebrew-core to update its "url" field to:
          # `https://github.com/OWNER/REPO/archive/refs/tags/<tag-name>.tar.gz`
          # The "sha256" formula field will get automatically recomputed.
          formula-name: my_formula
        env:
          # the personal access token should have "repo" & "workflow" scopes
          COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
```

The `COMMITTER_TOKEN` secret is required because this action will want to write
to an external repository. You can [generate a new Personal Access Token (classic)
here](https://github.com/settings/tokens) and give it `repo` and `workflow` scopes.

## How it works

Given a Homebrew formula `Formula/my_formula.rb` in the
[homebrew-core](https://github.com/Homebrew/homebrew-core) repo:

```rb
class MyFormula < Formula
  url "https://github.com/me/myproject/archive/refs/tags/v1.2.3.tar.gz"
  sha256 "<OLDSHA>"
  # ...
end
```

After we push a `v2.0.0` git tag to a project that has this action configured,
the formula will be updated to:

```rb
class MyFormula < Formula
  url "https://github.com/me/myproject/archive/refs/tags/v2.0.0.tar.gz"
  sha256 "<NEWSHA>"
  # ...
end
```

This action can update the following Homebrew formula fields:

- `version`
- `url`
- `sha256` - for non-git `download-url` action input
- `tag` - for git-based `download-url`
- `revision` - for git-based `download-url`

## Action inputs

Formula parameters:

- `formula-name`: the name of the Homebrew formula to bump. Defaults to
  lower-cased repository name.

- `formula-path`: the relative path of the Homebrew formula file to edit within the `homebrew-tap` repository. Defaults to
  `Formula/<letter>/<formula-name>.rb` for homebrew-core formulae and `Formula/<formula-name>.rb` otherwise.

- `tag-name`: the git tag name to bump the formula to. Defaults to the
  currently pushed tag.

- `download-url`: the package download URL for the Homebrew formula.

  Defaults to `https://github.com/OWNER/REPO/archive/refs/tags/<tag-name>.tar.gz`, where `OWNER/REPO` is the repository that is running the Actions workflow.

- `download-sha256`: the SHA256 checksum of the archive at `download-url`.
  Defaults to calculating the checksum by fetching the archive at run time.

Repository parameters:

- `homebrew-tap`: the full GitHub repository name (in the `NAME/OWNER` format) where the Homebrew formula should be updated. Defaults
  to `Homebrew/homebrew-core`.

- `push-to`: a specific fork of `homebrew-tap` where the edit should be pushed to.
  Defaults to creating or reusing a personal fork of the owner of COMMITTER_TOKEN.
  (Note: avoid using an organization-owned fork, as that
  [breaks automation for `homebrew-core`](https://github.com/foxglove/mcap/issues/1063)).

- `base-branch`: the branch name in the `homebrew-tap` repository where the
  formula should be updated. Defaults to the main branch of the repository.

- `create-pullrequest`: a boolean value to either force or prohibit submitting
  a pull request to `homebrew-tap`. Defaults to false if `COMMITTER_TOKEN` has
  the privileges to directly push to `base-branch` in `homebrew-tap`.

- `create-branch`: a boolean value to either force or prohibit creating a
  branch on `homebrew-tap`. Defaults to false if `COMMITTER_TOKEN` has
  the privileges to directly push to `base-branch` in `homebrew-tap`.
  You cannot set this to `false` if `create-pullrequest` is set to `true`.

- `commit-message`: the git commit message template to use when updating the
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

### Environment variables

- `COMMITTER_TOKEN` (required): needs _write access_ to the repository specified
  by the `homebrew-tap` input, or enough privileges to _fork the tap repo_
  (usually `homebrew-core`) and submit a PR to it.

  Recommended "classic" token scopes: `repo` & `workflow`.

- `GITHUB_TOKEN` (optional): needs _read access_ to the contents of the
  repository that is executing this action; will be used for verifying the
  SHA256 checksum of the downloadable archive for this release. Useful only if
  the repository that runs this Action is private _and_ if `COMMITTER_TOKEN` has
  the `public_repo` scope only.

## Examples

Comprehensive usage example:

```yml
on:
  push:
    tags: 'v*'
  # Alternatively, trigger this workflow after a stable release has been published:
  #release:
  #  types: [ released ]

jobs:
  homebrew:
    name: Bump Homebrew formula
    # Skip this job in case of git pushes to prerelease tags
    if: ${{ github.event_name != 'push' || !contains(github.ref, '-') }}
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Extract version
        id: extract-version
        # Strip a string prefix from the git tag name:
        run: |
          echo "tag-name=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - uses: mislav/bump-homebrew-formula-action@v3
        with:
          formula-name: my_formula
          formula-path: Formula/m/my_formula.rb
          homebrew-tap: Homebrew/homebrew-core
          base-branch: main
          download-url: https://example.com/packages/myformula-${{ steps.extract-version.outputs.tag-name }}.tar.gz
          commit-message: |
            {{formulaName}} {{version}}

            Created by https://github.com/mislav/bump-homebrew-formula-action
        env:
          COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
          # GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Manual trigger

How to set up this action to be manually triggered instead of being triggered by
pushing to a git tag:

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
      - uses: mislav/bump-homebrew-formula-action@v3
        with:
          formula-name: my_formula
          tag-name: ${{ github.event.inputs.tag-name }}
          download-url: https://example.com/foo/myproject-${{ github.event.inputs.tag-name }}.tar.gz
        env:
          COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
```

You could then use GitHub CLI to [trigger that workflow](https://cli.github.com/manual/gh_workflow_run):

```sh
gh workflow -R <OWNER>/<REPO> run release.yml --ref <BRANCH> -f "tag-name=v1.2.3"
```

## Known limitations

This action is designed to be minimal, fast, and to run with very few
requirements. For example, this action does not require a working Homebrew
installation, nor cloning the Homebrew tap repository (since cloning the massive
`Homebrew/homebrew-core` repository with git can take a long time). The only
thing it does is using the GitHub API to make file edits to a Homebrew formula
and to submit those edits as a PR.

Because of said design, this action is less featured than the [official `brew
bump-formula-pr` command][1] that ships with Homebrew. Known limitations are:

- Limited support for [bumping Homebrew casks](https://github.com/mislav/bump-homebrew-formula-action/issues/42#issuecomment-1410441868)

- Cannot bump formulae that need their versions to be [synced with other formulae](https://github.com/mislav/bump-homebrew-formula-action/issues/44)

- Cannot bump formulae which use Ruby `if...else` conditions to determine [alternate download locations](https://github.com/mislav/bump-homebrew-formula-action/issues/5) at runtime

- Cannot bump Python-based formulae which [declare their PyPI dependencies](https://github.com/ansible/ansible-lint/pull/3812#issuecomment-1747105780) as additional `resource` blocks

[1]: https://docs.brew.sh/How-To-Open-a-Homebrew-Pull-Request#submit-a-new-version-of-an-existing-formula
