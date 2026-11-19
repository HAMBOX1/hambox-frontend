import { CategoryTreeItem } from '../models/category.model';

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Header names must match CatalogImportParser's Categories column names
 * (Slug/NameEn/NameAr/ParentSlug/IsActive/SortOrder) so the file re-imports as-is.
 */
export function exportCategoriesToCsv(categories: readonly CategoryTreeItem[], filename = 'categories.csv'): void {
  if (!categories.length) {
    return;
  }

  const slugById = new Map(categories.map((category) => [category.id, category.slug]));
  const rows = categories.map((category) => [
    category.slug,
    category.nameEn,
    category.nameAr,
    category.parentId ? (slugById.get(category.parentId) ?? '') : '',
    String(category.isActive),
    String(category.sortOrder),
  ]);

  const csv = ['Slug,NameEn,NameAr,ParentSlug,IsActive,SortOrder', ...rows.map((row) => row.map(escapeCsvField).join(','))].join(
    '\n',
  );

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const FORBIDDEN_TAB_CHARS = new RegExp('[\\[\\]:*?/\\\\]');

const RESERVED_TABS = new Set(
  ['products', 'variant groups', 'variant options', 'variants', 'inventory codes', 'inventory', 'codes', 'categories', 'collections', 'instructions', 'readme', 'notes', 'lists', 'summary'],
);

/** The tab name for a parent category, or null when Excel (or the import's reserved names) would not allow it. */
export function categoryTabName(name: string): string | null {
  const tab = name.trim();
  if (!tab || tab.length > 31 || FORBIDDEN_TAB_CHARS.test(tab) || tab.startsWith("'") || tab.endsWith("'") || RESERVED_TABS.has(tab.toLowerCase())) {
    return null;
  }
  return tab;
}

/** Groups categories into the tabs of the Excel export: "Categories" (top level) and one tab per parent with its children. */
export function categorySheets(categories: readonly CategoryTreeItem[]): { readonly name: string; readonly rows: readonly CategoryTreeItem[] }[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const children = new Map<string, CategoryTreeItem[]>();
  const top: CategoryTreeItem[] = [];
  for (const category of categories) {
    const parent = category.parentId ? byId.get(category.parentId) : undefined;
    if (!parent) {
      top.push(category);
    } else {
      children.set(parent.id, [...(children.get(parent.id) ?? []), category]);
    }
  }

  const sheets: { name: string; rows: CategoryTreeItem[] }[] = [{ name: 'Categories', rows: [...top] }];
  const used = new Set<string>(['categories']);
  for (const parent of categories) {
    const kids = children.get(parent.id);
    if (!kids?.length) {
      continue;
    }
    const tab = categoryTabName(parent.nameEn);
    if (tab && !used.has(tab.toLowerCase()) && used.size < 60) {
      used.add(tab.toLowerCase());
      sheets.push({ name: tab, rows: [...kids] });
    } else {
      sheets[0].rows.push(...kids);
    }
  }
  return sheets;
}

/**
 * The same columns as the CSV (so the file re-imports as-is), as an Excel workbook: a "Categories" tab with the top level and one
 * tab per category that has sub-categories, named after it. ParentSlug is always filled, so a row means the same on any tab.
 */
export async function exportCategoriesToXlsx(categories: readonly CategoryTreeItem[], filename = 'categories.xlsx'): Promise<void> {
  if (!categories.length) {
    return;
  }

  const XLSX = await import('xlsx');
  const slugById = new Map(categories.map((category) => [category.id, category.slug]));
  const workbook = XLSX.utils.book_new();
  for (const sheet of categorySheets(categories)) {
    const rows = sheet.rows.map((category) => ({
      Slug: category.slug,
      NameEn: category.nameEn,
      NameAr: category.nameAr,
      ParentSlug: category.parentId ? (slugById.get(category.parentId) ?? '') : '',
      IsActive: String(category.isActive).toUpperCase(),
      SortOrder: category.sortOrder,
    }));
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rows, { header: ['Slug', 'NameEn', 'NameAr', 'ParentSlug', 'IsActive', 'SortOrder'] }),
      sheet.name,
    );
  }
  XLSX.writeFile(workbook, filename);
}
