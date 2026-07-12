function escapeCsv(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportRowsToCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
  filename: string,
): void {
  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\n');
  downloadTextFile(csv, filename, 'text/csv;charset=utf-8;');
}

export function exportRowsToExcel(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
  filename: string,
): void {
  const head = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`;
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ''}</td>`).join('')}</tr>`)
    .join('');
  downloadTextFile(
    `<table><thead>${head}</thead><tbody>${body}</tbody></table>`,
    filename,
    'application/vnd.ms-excel',
  );
}

export function exportRowsToJson(data: unknown, filename: string): void {
  downloadTextFile(JSON.stringify(data, null, 2), filename, 'application/json');
}
