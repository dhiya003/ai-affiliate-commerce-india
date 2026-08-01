export function safeCsvCell(value: string | number | null) {
  let text = value == null ? "" : String(value);
  if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
