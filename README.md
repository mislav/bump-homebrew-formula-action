A minimal GitHub action that uses the GitHub API to bump a Homebrew formula
after a new release in your repository.

Usage examples:

**Option 1 - Using input parameters (recommended):**

```yml
on:
  push:
    tags: 'v*'

jobs:
  homebrew:
    name: Bump Homebrew formula
    runs-on: ubuntu-latest
    permissions:
      contents: read # Required for GitHub Apps
    steps:
      - uses: mislav/bump-homebrew-formula-action@v3
        with:
          token: ${{ secrets.COMMITTER_TOKEN }} # or ${{ secrets.GITHUB_TOKEN }} for GitHub Apps
          auth-type: user # or 'app' for GitHub Apps (defaults to 'user')
          formula-name: my_formula
```

**Option 2 - Using environment variables (legacy):**

```yml
on:
  push:
    tags: 'v*'

jobs:
  homebrew:
    name: Bump Homebrew formula
    runs-on: ubuntu-latest
    permissions:
      contents: read # Required for GitHub Apps
    steps:
      - uses: mislav/bump-homebrew-formula-action@v3
        with:
          # By default, this will edit the `my_formula.rb` formula in
          # homebrew-core to update its "url" field to:
          # `https://github.com/OWNER/REPO/archive/refs/tags/<tag-name>.tar.gz`
          # The "sha256" formula field will get automatically recomputed.
          formula-name: my_formula
        env:
          # For Personal Access Tokens, use COMMITTER_TOKEN
          # For GitHub Apps, GITHUB_TOKEN is used automatically
          COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
```

### Authentication Options

This action supports two ways to provide authentication tokens:

1. **Input Parameter (Recommended):** Use the `token` input parameter for explicit configuration
2. **Environment Variables (Legacy):** Use `COMMITTER_TOKEN` or `GITHUB_TOKEN` environment variables

**GitHub App Setup:**
Install a GitHub App with appropriate permissions. Use `GITHUB_TOKEN` or pass it via the `token` input with `auth-type: app`.

**Personal Access Token Setup:**
Generate a [Personal Access Token (classic)](https://github.com/settings/tokens) with `repo` and `workflow` scopes. Use `COMMITTER_TOKEN` environment variable or pass it via the `token` input.

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

Authentication parameters:

- `token` (optional): GitHub token for authentication. Use a Personal Access Token with `repo` and `workflow` scopes, or a GitHub App installation token with appropriate permissions. If not provided, falls back to `COMMITTER_TOKEN` or `GITHUB_TOKEN` environment variables.

- `auth-type` (optional): Type of authentication being used. Set to `user` for Personal Access Tokens or `app` for GitHub Apps. Defaults to `user`.

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

Environment variables are supported for backward compatibility when the `token` input is not provided:

- `COMMITTER_TOKEN` (legacy): GitHub Personal Access Token with `repo` and `workflow` scopes for writing to external repositories.

- `GITHUB_TOKEN` (legacy): GitHub App installation token or PAT for repository access. Automatically available in GitHub Actions workflows.

**Note:** Using the `token` input parameter is recommended over environment variables for clearer configuration.

## GitHub App Integration

This action supports both Personal Access Tokens (PATs) and GitHub Apps. GitHub Apps are the recommended approach for organizations as they provide better security and permission management.

### GitHub App Setup

1. **Create a GitHub App** in your organization or personal account
2. **Grant the following permissions**:
   - Contents: Read & Write (to read formula files and create commits)
   - Metadata: Read (to access repository information)
   - Pull requests: Write (if creating pull requests)
   - Issues: Write (if the tap repo uses issue linking)
3. **Install the app** on repositories containing your formulas and the homebrew tap repository

### GitHub App Usage Options

#### Option 1: Direct Push Access (Recommended)

Grant your GitHub App push access directly to the homebrew tap repository:

```yml
on:
  push:
    tags: 'v*'

jobs:
  homebrew:
    name: Bump Homebrew formula
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: mislav/bump-homebrew-formula-action@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          auth-type: app
          formula-name: my_formula
          homebrew-tap: Homebrew/homebrew-core
```

#### Option 2: Fork-based Workflow

For homebrew-core contributions where direct push isn't possible, create a fork manually:

```yml
on:
  push:
    tags: 'v*'

jobs:
  homebrew:
    name: Bump Homebrew formula
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: mislav/bump-homebrew-formula-action@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          auth-type: app
          formula-name: my_formula
          homebrew-tap: Homebrew/homebrew-core
          push-to: myorg/homebrew-core # Your organization's fork
```

#### Option 3: Organization-owned Fork

Use an organization-owned fork where your GitHub App has access:

```yml
- uses: mislav/bump-homebrew-formula-action@v3
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    auth-type: app
    formula-name: my_formula
    homebrew-tap: Homebrew/homebrew-core
    push-to: mycompany/homebrew-core # Pre-existing organization fork
```

### GitHub App vs Personal Access Token

| Feature                   | GitHub App                                  | Personal Access Token                    |
| ------------------------- | ------------------------------------------- | ---------------------------------------- |
| **Security**              | ✅ Better - scoped to specific repositories | ⚠️ Broader access to user's repositories |
| **Fork Creation**         | ❌ Cannot create personal forks             | ✅ Can create personal forks             |
| **Organization Use**      | ✅ Recommended for organizations            | ⚠️ Tied to individual user account       |
| **Permission Management** | ✅ Fine-grained repository permissions      | ⚠️ Broader scope requirements            |
| **Setup Complexity**      | ⚠️ Requires app installation                | ✅ Simple token generation               |

### Troubleshooting GitHub Apps

**Error: "GitHub Apps cannot create personal forks"**

This occurs when the action tries to create a fork but you're using a GitHub App token. Solutions:

- Use Option 1 (direct push access) if possible
- Create a fork manually and use the `push-to` parameter
- Switch to a Personal Access Token if fork creation is required

**Error: "No authentication token found"**

Provide authentication either via input parameter or environment variable:

```yml
# Option 1: Input parameter
- uses: mislav/bump-homebrew-formula-action@v3
  with:
    token: ${{ secrets.GITHUB_TOKEN }} # or ${{ secrets.COMMITTER_TOKEN }}
    auth-type: app # or 'user'
    formula-name: my_formula

# Option 2: Environment variable
- uses: mislav/bump-homebrew-formula-action@v3
  with:
    formula-name: my_formula
  env:
    COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
```

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
          token: ${{ secrets.COMMITTER_TOKEN }} # Optional: use input parameter
          auth-type: user # Optional: specify auth type (defaults to 'user')
          formula-name: my_formula
          formula-path: Formula/m/my_formula.rb
          homebrew-tap: Homebrew/homebrew-core
          base-branch: main
          download-url: https://example.com/packages/myformula-${{ steps.extract-version.outputs.tag-name }}.tar.gz
          commit-message: |
            {{formulaName}} {{version}}

            Created by https://github.com/mislav/bump-homebrew-formula-action
        # Alternative: use environment variables instead of token input
        # env:
        #   COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
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

- **GitHub Apps cannot create personal forks**: When using GitHub App authentication, you must either have direct push access to the target repository or specify an existing fork via the `push-to` parameter.

- Limited support for [bumping Homebrew casks](https://github.com/mislav/bump-homebrew-formula-action/issues/42#issuecomment-1410441868)

- Cannot bump formulae that need their versions to be [synced with other formulae](https://github.com/mislav/bump-homebrew-formula-action/issues/44)

- Cannot bump formulae which use Ruby `if...else` conditions to determine [alternate download locations](https://github.com/mislav/bump-homebrew-formula-action/issues/5) at runtime

- Cannot bump Python-based formulae which [declare their PyPI dependencies](https://github.com/ansible/ansible-lint/pull/3812#issuecomment-1747105780) as additional `resource` blocks

[1]: https://docs.brew.sh/How-To-Open-a-Homebrew-Pull-Request#submit-a-new-version-of-an-existing-formula
