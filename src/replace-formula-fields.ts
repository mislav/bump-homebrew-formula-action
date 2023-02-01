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
      (_: string, indent: string, sep: string, q: string): string => {
        return `${indent}${field}${sep}${q}${escape(value, q)}${q}`
      }
    )
  }
  return newContent
}

export function removeRevisionLine(oldContent: string): string {
  return oldContent.replace(/^[ \t]*revision \d+ *\r?\n/m, '')
}
