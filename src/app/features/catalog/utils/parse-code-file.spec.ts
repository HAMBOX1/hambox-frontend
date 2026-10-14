import { parseCodeFile } from './parse-code-file';

describe('parseCodeFile', () => {
  it('reads one code per line from a TXT file, dropping blanks and whitespace', () => {
    const text = 'AAAA-1111\r\n  BBBB-2222  \r\n\r\nCCCC-3333\n';

    expect(parseCodeFile(text, 'txt')).toEqual(['AAAA-1111', 'BBBB-2222', 'CCCC-3333']);
  });

  it('takes only the first column of a CSV and ignores the rest', () => {
    const text = 'AAAA-1111,SN-1,note\nBBBB-2222,,\n';

    expect(parseCodeFile(text, 'csv')).toEqual(['AAAA-1111', 'BBBB-2222']);
  });

  it('skips a header row and a UTF-8 byte-order mark', () => {
    const text = '﻿Code,Serial\nAAAA-1111,SN-1\nBBBB-2222,SN-2';

    expect(parseCodeFile(text, 'csv')).toEqual(['AAAA-1111', 'BBBB-2222']);
  });

  it('keeps a quoted first cell that contains a comma intact', () => {
    const text = '"ABC,DEF",x\n"Q""Z",y';

    expect(parseCodeFile(text, 'csv')).toEqual(['ABC,DEF', 'Q"Z']);
  });

  it('does not treat a TXT code that looks like a header word as a header', () => {
    expect(parseCodeFile('code\nAAAA', 'txt')).toEqual(['code', 'AAAA']);
  });

  it('keeps duplicates so the server can report them per line', () => {
    expect(parseCodeFile('AAAA\nAAAA\n', 'txt')).toEqual(['AAAA', 'AAAA']);
  });

  it('returns nothing for an empty file', () => {
    expect(parseCodeFile('', 'csv')).toEqual([]);
    expect(parseCodeFile('\n\n  \n', 'txt')).toEqual([]);
  });
});
