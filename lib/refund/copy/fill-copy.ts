/** Fills `{name}` placeholders. A placeholder without a value is left as written, so a gap shows up in tests. */
export function fillCopy(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
