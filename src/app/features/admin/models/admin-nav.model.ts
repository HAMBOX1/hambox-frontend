import { PERMISSIONS } from '../../../core/permissions/permission.constants';

export type AdminNavId =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'collections'
  | 'roles'
  | 'security'
  | 'promotions'
  | 'memberships'
  | 'themes'
  | 'campaigns'
  | 'page-builder'
  | 'faqs'
  | 'legal'
  | 'suppliers'
  | 'communication'
  | 'orders'
  | 'operations'
  | 'support'
  | 'analytics'
  | 'reports'
  | 'settings';

export interface AdminNavItem {
  readonly id: AdminNavId;
  readonly labelKey: string;
  readonly route: string;
  readonly icon: string;
  readonly permission?: string | readonly string[];
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'ADMIN.NAV.DASHBOARD',
    route: '/admin/dashboard',
    icon: 'pi pi-th-large',
    permission: PERMISSIONS.Dashboard.View,
  },
  {
    id: 'products',
    labelKey: 'ADMIN.NAV.PRODUCTS',
    route: '/admin/products',
    icon: 'pi pi-shopping-bag',
    permission: PERMISSIONS.Catalog.Products.View,
  },
  {
    id: 'categories',
    labelKey: 'ADMIN.NAV.CATEGORIES',
    route: '/admin/categories',
    icon: 'pi pi-tags',
    permission: PERMISSIONS.Catalog.Categories.View,
  },
  {
    id: 'collections',
    labelKey: 'ADMIN.NAV.COLLECTIONS',
    route: '/admin/collections',
    icon: 'pi pi-folder',
    permission: PERMISSIONS.Catalog.Collections.View,
  },
  {
    id: 'roles',
    labelKey: 'ADMIN.NAV.ROLES',
    route: '/admin/roles',
    icon: 'pi pi-shield',
    permission: PERMISSIONS.Roles.View,
  },
  {
    id: 'security',
    labelKey: 'ADMIN.NAV.SECURITY',
    route: '/admin/security',
    icon: 'pi pi-lock',
    permission: PERMISSIONS.Security.View,
  },
  {
    id: 'promotions',
    labelKey: 'ADMIN.NAV.PROMOTIONS',
    route: '/admin/promotions',
    icon: 'pi pi-percentage',
    permission: PERMISSIONS.Promotions.View,
  },
  {
    id: 'memberships',
    labelKey: 'ADMIN.NAV.MEMBERSHIPS',
    route: '/admin/memberships',
    icon: 'pi pi-id-card',
    permission: PERMISSIONS.Memberships.View,
  },
  {
    id: 'themes',
    labelKey: 'ADMIN.NAV.THEMES',
    route: '/admin/themes',
    icon: 'pi pi-palette',
    permission: PERMISSIONS.Themes.View,
  },
  {
    id: 'campaigns',
    labelKey: 'ADMIN.NAV.CAMPAIGNS',
    route: '/admin/campaigns',
    icon: 'pi pi-megaphone',
    permission: PERMISSIONS.Campaigns.View,
  },
  {
    id: 'page-builder',
    labelKey: 'ADMIN.NAV.PAGE_BUILDER',
    route: '/admin/page-builder',
    icon: 'pi pi-objects-column',
    permission: PERMISSIONS.PageBuilder.View,
  },
  {
    id: 'faqs',
    labelKey: 'ADMIN.NAV.FAQS',
    route: '/admin/faqs',
    icon: 'pi pi-question-circle',
    permission: PERMISSIONS.Faq.View,
  },
  {
    id: 'legal',
    labelKey: 'ADMIN.NAV.LEGAL',
    route: '/admin/legal',
    icon: 'pi pi-file-check',
    permission: PERMISSIONS.Legal.View,
  },
  {
    id: 'suppliers',
    labelKey: 'ADMIN.NAV.SUPPLIERS',
    route: '/admin/suppliers',
    icon: 'pi pi-truck',
    permission: PERMISSIONS.Suppliers.View,
  },
  {
    id: 'communication',
    labelKey: 'ADMIN.NAV.COMMUNICATION',
    route: '/admin/communication',
    icon: 'pi pi-send',
    permission: PERMISSIONS.Communication.View,
  },
  {
    id: 'orders',
    labelKey: 'ADMIN.NAV.ORDERS',
    route: '/admin/orders',
    icon: 'pi pi-shopping-bag',
    permission: PERMISSIONS.Orders.View,
  },
  {
    id: 'operations',
    labelKey: 'ADMIN.NAV.OPERATIONS',
    route: '/admin/operations',
    icon: 'pi pi-sitemap',
    permission: PERMISSIONS.Operations.View,
  },
  {
    id: 'support',
    labelKey: 'ADMIN.NAV.SUPPORT',
    route: '/admin/support',
    icon: 'pi pi-ticket',
    permission: PERMISSIONS.Support.View,
  },
  {
    id: 'analytics',
    labelKey: 'ADMIN.NAV.ANALYTICS',
    route: '/admin/analytics',
    icon: 'pi pi-chart-line',
    permission: PERMISSIONS.Analytics.View,
  },
  {
    id: 'reports',
    labelKey: 'ADMIN.NAV.REPORTS',
    route: '/admin/reports',
    icon: 'pi pi-file',
    permission: PERMISSIONS.Reports.View,
  },
  {
    id: 'settings',
    labelKey: 'ADMIN.NAV.SETTINGS',
    route: '/admin/settings',
    icon: 'pi pi-cog',
    permission: PERMISSIONS.Settings.View,
  },
] as const;
