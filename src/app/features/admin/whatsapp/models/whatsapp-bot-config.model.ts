/** Matches backend WhatsAppMenuAction — the fixed, closed set. Never extend this from the client;
 * a new action requires a new engine handler on the backend, not an admin-editable value. */
export type WhatsAppMenuAction =
  | 'BrowseProducts'
  | 'SearchProducts'
  | 'Cart'
  | 'Orders'
  | 'Alerts'
  | 'Support'
  | 'Language';

export interface WhatsAppMenuItemDto {
  action: WhatsAppMenuAction;
  isEnabled: boolean;
  sortOrder: number;
  labelEn: string;
  labelAr: string;
}

export interface WhatsAppBotConfigurationDto {
  welcomeMessageEn: string;
  welcomeMessageAr: string;
  fallbackMessageEn: string;
  fallbackMessageAr: string;
  items: WhatsAppMenuItemDto[];
}

/** Identifies which fixed action a row represents — shown next to the editable label fields,
 * never itself editable. */
export const WHATSAPP_ACTION_LABEL_KEYS: Record<WhatsAppMenuAction, string> = {
  BrowseProducts: 'ADMIN.WHATSAPP.ACTIONS.BROWSE_PRODUCTS',
  SearchProducts: 'ADMIN.WHATSAPP.ACTIONS.SEARCH_PRODUCTS',
  Cart: 'ADMIN.WHATSAPP.ACTIONS.CART',
  Orders: 'ADMIN.WHATSAPP.ACTIONS.ORDERS',
  Alerts: 'ADMIN.WHATSAPP.ACTIONS.ALERTS',
  Support: 'ADMIN.WHATSAPP.ACTIONS.SUPPORT',
  Language: 'ADMIN.WHATSAPP.ACTIONS.LANGUAGE',
};
