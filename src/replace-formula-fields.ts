function escape(value: string, char: string): string {
  return value.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`)
}

// TODO: abort if replacing "url"/"version" fields would result in a downgrade
export default function(
  oldContent: string,
  replacements: Map<string, string>
): string {
  let newContent = oldContent
  for (const [field, value] of replacements) {
    newContent = newContent.replace(
      new RegExp(`^(\\s*)${field} +(['"])[^'"]+['"]`, 'm'),
      (_, sp, q) => `${sp}${field} ${q}${escape(value, q)}${q}`
    )
  }
  return newContent
}
