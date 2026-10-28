import * as XLSX from 'xlsx';

import { readCodeFile } from './read-code-file';

function sheetFile(rows: string[][], name: string): File {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Codes');
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new File([bytes], name);
}

describe('readCodeFile', () => {
  it('reads one code per line from a TXT file', async () => {
    const codes = await readCodeFile(new File(['AAA\n\n BBB \nCCC'], 'codes.txt'));

    expect(codes).toEqual(['AAA', 'BBB', 'CCC']);
  });

  it('takes the first CSV column and skips a header row', async () => {
    const codes = await readCodeFile(new File(['code,note\nAAA,first\nBBB,second'], 'codes.csv'));

    expect(codes).toEqual(['AAA', 'BBB']);
  });

  it('reads the first column of an Excel sheet, ignoring blanks and the header', async () => {
    const codes = await readCodeFile(sheetFile([['Code', 'Note'], ['AAA', 'x'], ['', 'y'], ['BBB', 'z']], 'codes.xlsx'));

    expect(codes).toEqual(['AAA', 'BBB']);
  });
});
