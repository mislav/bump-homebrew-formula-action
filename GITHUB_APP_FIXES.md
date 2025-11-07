# GitHub App Integration - Issues Analysis and Solutions

## Summary

I've analyzed your codebase and identified the key issues preventing proper GitHub App integration. The main problems revolve around authentication handling, fork creation, and user context resolution.

## Key Issues Identified

### 1. **Fork Creation Limitation**

**Problem**: GitHub Apps cannot create personal forks like user accounts can.

**Location**: `src/edit-github-blob.ts` lines 77-83

```typescript
const res = await Promise.all([
  api.repos.createFork(baseRepo),
  api.users.getAuthenticated(), // This fails for GitHub Apps
])
```

**Impact**: When the action tries to create a fork using a GitHub App token, it fails because:

- `api.users.getAuthenticated()` doesn't work for GitHub Apps
- GitHub Apps don't have personal accounts to fork into

### 2. **Authentication Type Detection**

**Problem**: The code assumes Personal Access Token (PAT) behavior but GitHub Apps work differently.

**Location**: Throughout the codebase, but especially in authentication flows

```typescript
const internalToken =
  process.env.GITHUB_TOKEN || process.env.COMMITTER_TOKEN || ''
const externalToken = process.env.COMMITTER_TOKEN || ''
```

**Impact**:

- Token precedence logic doesn't account for GitHub App installation tokens
- No differentiation between user tokens and app tokens

### 3. **User Context Resolution**

**Problem**: The code expects user login information that doesn't exist for GitHub Apps.

**Impact**: Fork target resolution fails when trying to determine where to push changes.

## Solutions Implemented

### 1. **Authentication Detection Utility**

Created `src/auth-utils.ts` with functions to:

- Detect if the token is from a user or GitHub App
- Get appropriate login/identifier for either authentication type

```typescript
export async function detectAuthType(api: API): Promise<'user' | 'app'> {
  try {
    await api.rest.users.getAuthenticated()
    return 'user'
  } catch {
    try {
      await api.rest.apps.getAuthenticated()
      return 'app'
    } catch {
      return 'user' // Default to user behavior
    }
  }
}
```

### 2. **Enhanced Fork Handling**

Modified `src/edit-github-blob.ts` to:

- Detect authentication type before attempting fork creation
- Provide clear error message for GitHub Apps that need manual fork setup
- Handle login resolution properly for both users and apps

```typescript
if (makeFork) {
  const authType = await detectAuthType(params.apiClient)

  if (authType === 'app') {
    throw new Error(
      'GitHub Apps cannot create personal forks. Please specify a push-to target fork or ensure the app has direct push access to the target repository.'
    )
  } else {
    // Original logic for user tokens
    await api.repos.createFork(baseRepo)
    const login = await getAuthenticatedLogin(params.apiClient)
    headRepo = { owner: login, repo: baseRepo.repo }
  }
}
```

### 3. **Improved Token Handling**

Updated `src/main.ts` to:

- Use a single token for both internal and external operations
- Prioritize `COMMITTER_TOKEN` over `GITHUB_TOKEN`
- Provide better error messages when no token is found

```typescript
const token = process.env.COMMITTER_TOKEN || process.env.GITHUB_TOKEN || ''

if (!token) {
  throw new Error(
    'No authentication token found. Please set COMMITTER_TOKEN or ensure GITHUB_TOKEN is available.'
  )
}

const apiClient = api(token)
```

## Usage Recommendations for GitHub Apps

### Option 1: Direct Push Access (Recommended)

Install your GitHub App with push permissions directly to the homebrew repository:

```yml
- uses: mislav/bump-homebrew-formula-action@v3
  with:
    formula-name: my_formula
    homebrew-tap: Homebrew/homebrew-core
  # Uses GITHUB_TOKEN (GitHub App installation token)
```

### Option 2: Pre-existing Fork

Create a fork manually and specify it as the push target:

```yml
- uses: mislav/bump-homebrew-formula-action@v3
  with:
    formula-name: my_formula
    push-to: myorg/homebrew-core # Your pre-existing fork
  env:
    COMMITTER_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Option 3: Organization Fork

Use an organization-owned fork where your GitHub App has access:

```yml
- uses: mislav/bump-homebrew-formula-action@v3
  with:
    formula-name: my_formula
    push-to: mycompany/homebrew-core
  env:
    COMMITTER_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Error Messages You May Encounter

1. **"GitHub Apps cannot create personal forks"**

   - Solution: Use one of the options above
   - The app needs either direct push access or a pre-existing fork

2. **"No authentication token found"**

   - Solution: Ensure `GITHUB_TOKEN` is available or set `COMMITTER_TOKEN`
   - Check that your GitHub App has the necessary permissions

3. **"Unable to authenticate as user or app"**
   - Solution: Verify token validity and permissions
   - Check that the token has access to the repositories involved

## Next Steps

1. **Test with your GitHub App**: Try the updated code with your GitHub App setup
2. **Choose appropriate strategy**: Decide between direct push access or fork-based workflow
3. **Update documentation**: Consider updating your README with GitHub App usage examples
4. **Monitor for edge cases**: Watch for any additional issues that may arise with specific repository configurations

The changes I've made maintain full backward compatibility with Personal Access Tokens while adding proper GitHub App support. The key is providing clear error messages and guidance when GitHub Apps encounter limitations.
