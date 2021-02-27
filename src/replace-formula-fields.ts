import { compare, fromUrl } from './version'

export class UpgradeError extends Error {}

function assertNewer(v1: string, v2: string): void {
  const c = compare(v1, v2)
  if (c == 0) {
    throw new UpgradeError(`the formula is already at version '${v1}'`)
  } else if (c == -1) {
    throw new UpgradeError(`the formula version '${v2}' is newer than '${v1}'`)
  }
}

function escape(value: string, char: string): string {
  return value.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`)
}

export function replaceFields(
  oldContent: string,
  replacements: Map<string, string>
): string {
  let newContent = oldContent
  for (const [field, value] of replacements) {
    newContent = newContent.replace(
      new RegExp(`^(\\s*)${field}((?::| *=>)? *)(['"])([^'"]+)\\3`, 'm'),
      (
        _: string,
        indent: string,
        sep: string,
        q: string,
        old: string
      ): string => {
        if (field == 'version') assertNewer(value, old)
        else if (field == 'url' && !value.endsWith('.git'))
          assertNewer(fromUrl(value), fromUrl(old))
        return `${indent}${field}${sep}${q}${escape(value, q)}${q}`
      }
    )
  }
  return newContent
}

export function removeRevisionLine(oldContent: string): string {
  return oldContent.replace(/^[ \t]*revision \d+ *\r?\n/m, '')
}
