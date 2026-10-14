/**
 * Turns the text of an uploaded stock file into the list of codes to import.
 *
 * - `txt`: one code per line.
 * - `csv`: the code is the first column of each line (extra columns such as a serial or a note are ignored).
 *
 * Blank lines and surrounding whitespace are dropped. A UTF-8 byte-order mark (Excel adds one) and a header row
 * named "code" / "digitalcode" are skipped so they never end up imported as a code. Duplicates are left in on
 * purpose: the server reports them per line, which is the report the admin needs to see.
 */
export function parseCodeFile(text: string, kind: 'txt' | 'csv'): string[] {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/);

  const codes = lines
    .map((line) => (kind === 'csv' ? firstCsvColumn(line) : line.trim()))
    .filter((value) => value.length > 0);

  if (kind === 'csv' && codes.length > 0 && /^(code|digitalcode|digital code|key|serial)$/i.test(codes[0])) {
    return codes.slice(1);
  }

  return codes;
}

function firstCsvColumn(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith('"')) {
    // A quoted first cell may itself contain commas: read up to the closing quote ("" is an escaped quote).
    let value = '';
    for (let i = 1; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (char === '"') {
        if (trimmed[i + 1] === '"') {
          value += '"';
          i++;
          continue;
        }

        break;
      }

      value += char;
    }

    return value.trim();
  }

  return (trimmed.split(',')[0] ?? '').trim();
}
