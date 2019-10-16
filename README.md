An action that bumps a Homebrew formula after a new release.

```yml
on:
  push:
    tags: 'v*'

jobs:
  homebrew:
    name: Bump Homebrew formula
    runs-on: ubuntu-latest
    steps:
      - uses: mislav/bump-homebrew-formula-action@v1.3
        with:
          formula-name: my_formula
          # homebrew-tap: Homebrew/homebrew-core
          # base-branch: master
          # download-url: https://example.com/foo/v0.1.tar.gz
        env:
          COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
          # GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The `COMMITTER_TOKEN` secret is required because this action will want to write
to an external repository. You can [generate a new PAT
here](https://github.com/settings/tokens) and give it `public_repo` or `repo`
scopes.

You should enable `GITHUB_TOKEN` if the repository that runs this Action is
private and `COMMITTER_TOKEN` has only the `public_repo` scope. The token will
be used for verifying the SHA256 sum of the downloadable archive for this
release.

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

This action will update the following formula fields if they exist:
- `url`
- `sha256`
- `version`

If you need to customize the value of `url` to something other than the standard
tarball URL, you can pass in the `download-url` input to this action.

If the current `COMMITTER_TOKEN` doesn't have push access to the repo specified
by the `homebrew-tap` input, the formula will be edited in a fork that is
automatically created, and a pull request will be opened.

If the token has push access, but the default branch of the tap repo is
protected, a pull request will be opened from a new branch in the same repo.

Otherwise, the formula will be edited via a direct push to the default branch.