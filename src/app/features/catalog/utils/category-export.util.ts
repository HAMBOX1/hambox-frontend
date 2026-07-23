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
