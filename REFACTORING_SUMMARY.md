# Token and Auth Type Input Changes Summary

## Overview

Successfully refactored the action to require explicit token and auth-type inputs instead of relying on environment variable detection and runtime authentication type detection.

## Key Changes Made

### 1. Action Configuration (action.yml)

- **Added required `token` input**: Users must now explicitly provide their authentication token
- **Added optional `auth-type` input**: Users can specify 'user' (default) or 'app' for authentication type
- **Removed environment variable dependencies**: No longer uses COMMITTER_TOKEN or GITHUB_TOKEN environment variables

### 2. Authentication Logic Simplification

- **Removed auth-utils.ts**: Eliminated the need for runtime authentication type detection
- **Simplified main.ts**: Now reads token and auth-type directly from inputs with validation
- **Updated edit-github-blob.ts**: Uses explicit auth-type parameter instead of detecting it at runtime

### 3. Error Handling Improvements

- **Clear validation**: Throws error for invalid auth-type values (must be 'user' or 'app')
- **Required token**: Action fails early if token input is missing
- **Better GitHub App errors**: Clear error message when GitHub Apps try to create personal forks

### 4. Test Updates

- **Updated all test cases**: Added required `authType` parameter to all editGithubBlob calls
- **Added new test**: Verifies GitHub App fork creation error handling
- **Maintained compatibility**: All existing tests still pass with new parameter structure

### 5. Documentation Updates (README.md)

- **Updated usage examples**: All examples now show required `token` and optional `auth-type` inputs
- **Simplified environment section**: Removed environment variables documentation
- **Updated GitHub App examples**: Show explicit `auth-type: app` configuration
- **Improved troubleshooting**: Updated error messages and solutions

## Migration Path for Users

### Before (Environment Variables)

```yml
- uses: mislav/bump-homebrew-formula-action@v3
  with:
    formula-name: my_formula
  env:
    COMMITTER_TOKEN: ${{ secrets.COMMITTER_TOKEN }}
```

### After (Input Parameters)

```yml
- uses: mislav/bump-homebrew-formula-action@v3
  with:
    token: ${{ secrets.COMMITTER_TOKEN }}
    auth-type: user # optional, defaults to 'user'
    formula-name: my_formula
```

### For GitHub Apps

```yml
- uses: mislav/bump-homebrew-formula-action@v3
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    auth-type: app
    formula-name: my_formula
```

## Benefits Achieved

1. **Clearer Configuration**: Users explicitly declare their authentication approach
2. **Better Error Messages**: No more guessing about authentication issues
3. **Simplified Code**: Removed complex runtime detection logic
4. **Explicit Behavior**: No hidden authentication fallback logic
5. **Better Testing**: Can test specific auth scenarios without mocking environment variables

## Backward Compatibility

This is a **breaking change** that requires users to update their workflow configurations. The benefits of explicit configuration and simplified logic outweigh the migration effort for most users.

## Validation

- ✅ All 15 tests pass
- ✅ Build successful (1239kB lib/index.js)
- ✅ GitHub App fork error handling verified
- ✅ Documentation updated with examples
- ✅ Auth-type validation working correctly
