import type { AdminBreadcrumbItem } from './admin-breadcrumb/admin-breadcrumb.component';

/** Shared admin breadcrumb roots — use with page-specific trailing crumbs. */
export const ADMIN_ROOT_BREADCRUMB: AdminBreadcrumbItem = {
  label: 'ADMIN.BREADCRUMB.ROOT',
  route: null,
};

export function adminBreadcrumbs(
  ...items: AdminBreadcrumbItem[]
): AdminBreadcrumbItem[] {
  return [ADMIN_ROOT_BREADCRUMB, ...items];
}
