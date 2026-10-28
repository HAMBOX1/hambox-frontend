import { parseCodeFile } from './parse-code-file';

/**
 * Reads the codes out of an uploaded stock file: TXT (one per line), CSV (first column) or an Excel workbook
 * (first column of the first sheet). Excel support loads the spreadsheet library only when an Excel file is
 * actually chosen, so the products list stays light for everyone else.
 */
export async function readCodeFile(file: File): Promise<string[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    const firstColumn = rows.map((row) => String(row[0] ?? '').trim()).join('\n');
    // Same rules as a CSV: blank lines dropped and a "code" header row skipped.
    return parseCodeFile(firstColumn, 'csv');
  }

  const text = await file.text();
  return parseCodeFile(text, name.endsWith('.csv') ? 'csv' : 'txt');
}
