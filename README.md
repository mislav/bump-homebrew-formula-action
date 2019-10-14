An action that bumps a Homebrew formula after a new release.

```yml
on:
  push:
    tags: 'v*'

jobs:
  homebrew:
    name: Bump Homebrew
    runs-on: ubuntu-latest
    steps:
      - uses: mislav/bump-homebrew-formula-action@v1
        with:
          formula-name: hub
          # homebrew-tap: Homebrew/homebrew-core
          # download-url: ${{ format('https://github.com/{0}/archive/{2}.tar.gz', github.repository, github.ref) }}
        env:
          COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
```

The `COMMITTER_TOKEN` secret is required because this action will want to write
to an external repository. You can [generate a new PAT
here](https://github.com/settings/tokens) and give it `public_repo` or `repo`
scopes.

## How it works

Given a Homebrew formula `Formula/my_formula.rb` in the
[homebrew-core](https://github.com/Homebrew/homebrew-core) repo:

```rb
class MyFormula < Formula
  url "https://github.com/me/myproject/archive/v1.2.3.tar.gz"
  sha256 "<OLDSHA>"
  # ...
```

After we push a `v2.0.0` git tag to a project that has this action configured,
the formula will be updated to:

```rb
class MyFormula < Formula
  url "https://github.com/me/myproject/archive/v2.0.0.tar.gz"
  sha256 "<NEWSHA>"
  # ...
```

If the current `COMMITTER_TOKEN` doesn't have push access to the repo specified
by the `homebrew-tap` input, the formula will be edited in a fork that is
automatically created, and a pull request will be opened.

If the token has push access, but the default branch of the tap repo is
protected, a pull request will be opened from a new branch in the same repo.

Otherwise, the formula will be edited via a direct push to the default branch.