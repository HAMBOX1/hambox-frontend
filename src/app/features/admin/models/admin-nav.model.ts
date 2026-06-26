export type AdminNavId =
  | 'dashboard'
  | 'inventory'
  | 'categories'
  | 'orders'
  | 'analytics'
  | 'settings';

export interface AdminNavItem {
  readonly id: AdminNavId;
  readonly label: string;
  readonly route: string;
  readonly icon: string;
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', route: '/admin/dashboard', icon: 'pi pi-th-large' },
  { id: 'inventory', label: 'Inventory', route: '/admin/inventory', icon: 'pi pi-box' },
  { id: 'categories', label: 'Categories', route: '/admin/categories', icon: 'pi pi-tags' },
  { id: 'orders', label: 'Orders', route: '/admin/orders', icon: 'pi pi-shopping-bag' },
  { id: 'analytics', label: 'Analytics', route: '/admin/analytics', icon: 'pi pi-chart-line' },
  { id: 'settings', label: 'Settings', route: '/admin/settings', icon: 'pi pi-cog' },
] as const;
