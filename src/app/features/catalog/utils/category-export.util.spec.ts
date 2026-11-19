import { describe, expect, it } from 'vitest';

import { CategoryTreeItem } from '../models/category.model';
import { categorySheets, categoryTabName } from './category-export.util';

const cat = (id: string, nameEn: string, parentId: string | null): CategoryTreeItem =>
  ({ id, slug: nameEn.toLowerCase(), nameEn, nameAr: nameEn, parentId, isActive: true, sortOrder: 0, childrenCount: 0, productCount: 0 }) as CategoryTreeItem;

describe('category Excel export tabs', () => {
  it('puts the top level on "Categories" and each parent\'s children on a tab named after the parent', () => {
    const sheets = categorySheets([cat('1', 'Xbox', null), cat('2', 'Game Pass', '1'), cat('3', 'Live', '1'), cat('4', 'Steam', null)]);

    expect(sheets.map((s) => s.name)).toEqual(['Categories', 'Xbox']);
    expect(sheets[0].rows.map((c) => c.nameEn)).toEqual(['Xbox', 'Steam']);
    expect(sheets[1].rows.map((c) => c.nameEn)).toEqual(['Game Pass', 'Live']);
  });

  it('keeps the children on "Categories" when the parent name cannot be a tab name', () => {
    const sheets = categorySheets([cat('1', 'Games / PC', null), cat('2', 'Racing', '1')]);

    expect(sheets.map((s) => s.name)).toEqual(['Categories']);
    expect(sheets[0].rows.map((c) => c.nameEn)).toEqual(['Games / PC', 'Racing']);
  });

  it('rejects reserved, long and forbidden tab names', () => {
    expect(categoryTabName('Instructions')).toBeNull();
    expect(categoryTabName('A'.repeat(32))).toBeNull();
    expect(categoryTabName('a:b')).toBeNull();
    expect(categoryTabName(' Xbox ')).toBe('Xbox');
  });
});
