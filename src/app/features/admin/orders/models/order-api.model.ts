import { PagedResult } from '../../../catalog/models/category.model';

export type AdminOrderStatus =
  | 'Pending'
  | 'Processing'
  | 'Completed'
  | 'Cancelled'
  | 'Refunded'
  | 'Failed';

export type AdminPaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export type AdminDeliveryStatus =
  | 'Delivered'
  | 'Awaiting Delivery'
  | 'Partially Delivered';

export interface AdminOrderListItemDto {
  readonly id: string;
  readonly orderNumber: string;
  readonly customerName: string;
  readonly email: string;
  readonly itemsCount: number;
  readonly productsSummary: string;
  readonly orderTotal: number;
  readonly paymentMethod: string;
  readonly paymentStatus: string;
  readonly orderStatus: string;
  readonly deliveryStatus: string;
  readonly membershipDiscount: number;
  readonly couponCode: string | null;
  readonly purchaseDate: string;
}

export interface AdminOrderStatisticsDto {
  readonly todaysOrders: number;
  readonly pendingOrders: number;
  readonly revenueToday: number;
  readonly averageOrderValue: number;
  readonly refunds: number;
}

export interface AdminOrderItemDto {
  readonly id: string;
  readonly productId: string;
  readonly productVariantId: string | null;
  readonly productName: string;
  readonly variantSku: string | null;
  readonly productImageUrl: string | null;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discount: number;
  readonly subtotal: number;
  readonly deliveredCodesCount: number;
  readonly deliveryStatus: string;
}

export interface AdminOrderTimelineEventDto {
  readonly eventType: string;
  readonly description: string;
  readonly occurredOnUtc: string;
}

export interface AdminOrderLicenseKeyDto {
  readonly id: string;
  readonly orderItemId: string;
  readonly productId: string;
  readonly productName: string;
  readonly maskedKey: string;
  readonly deliveryStatus: string;
  readonly deliveredOnUtc: string | null;
  readonly canReveal: boolean;
}

export interface AdminOrderAdminNoteDto {
  readonly id: string;
  readonly body: string;
  readonly authorDisplayName: string;
  readonly createdOnUtc: string;
  readonly modifiedOnUtc: string | null;
}

export interface AdminOrderAuditEntryDto {
  readonly id: string;
  readonly eventType: string;
  readonly description: string;
  readonly actorDisplayName: string | null;
  readonly occurredOnUtc: string;
}

export interface AdminOrderPaymentCallbackDto {
  readonly id: string;
  readonly provider: string;
  readonly eventType: string;
  readonly status: string;
  readonly transactionId: string | null;
  readonly payloadJson: string;
  readonly occurredOnUtc: string;
}

export interface AdminCustomerOrderHistoryItemDto {
  readonly id: string;
  readonly orderNumber: string;
  readonly totalAmount: number;
  readonly orderStatus: string;
  readonly paymentStatus: string;
  readonly deliveryStatus: string;
  readonly purchaseDate: string;
}

export interface BulkAdminOrdersResultDto {
  readonly successCount: number;
  readonly failureCount: number;
  readonly errors: readonly string[];
}

export interface RetryAdminOrderFulfillmentResultDto {
  readonly codesDelivered: number;
  readonly orderCompleted: boolean;
}

export interface AdminOrderDetailDto {
  readonly id: string;
  readonly orderNumber: string;
  readonly orderStatus: string;
  readonly paymentStatus: string;
  readonly deliveryStatus: string;
  readonly email: string;
  readonly customerName: string;
  readonly country: string;
  readonly paymentMethod: string;
  readonly paymentProvider: string | null;
  readonly paymentTransactionId: string | null;
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly membershipDiscount: number;
  readonly taxAmount: number;
  readonly totalAmount: number;
  readonly couponCode: string | null;
  readonly couponPromotionName: string | null;
  readonly items: readonly AdminOrderItemDto[];
  readonly timeline: readonly AdminOrderTimelineEventDto[];
  readonly licenseKeys: readonly AdminOrderLicenseKeyDto[];
  readonly adminNotes: readonly AdminOrderAdminNoteDto[];
  readonly auditHistory: readonly AdminOrderAuditEntryDto[];
  readonly paymentCallbacks: readonly AdminOrderPaymentCallbackDto[];
  readonly customerOrderHistory: readonly AdminCustomerOrderHistoryItemDto[];
  readonly invoiceUrl: string | null;
  readonly createdOnUtc: string;
}

export type AdminOrderListResult = PagedResult<AdminOrderListItemDto>;

export interface AdminOrderListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly orderStatus?: string;
  readonly deliveryStatus?: string;
  readonly paymentStatus?: string;
  readonly dateRange?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly minAmount?: number;
  readonly maxAmount?: number;
  readonly sort?: string;
}

export const ORDER_STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Processing', value: 'Processing' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Cancelled', value: 'Cancelled' },
  { label: 'Refunded', value: 'Refunded' },
  { label: 'Failed', value: 'Failed' },
] as const;

export const ORDER_DELIVERY_OPTIONS = [
  { label: 'All delivery', value: 'all' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Awaiting Delivery', value: 'Awaiting Delivery' },
  { label: 'Partially Delivered', value: 'Partially Delivered' },
] as const;

export const ORDER_PAYMENT_OPTIONS = [
  { label: 'All payments', value: 'all' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Failed', value: 'Failed' },
  { label: 'Refunded', value: 'Refunded' },
] as const;

export const ORDER_DATE_RANGE_OPTIONS = [
  { label: 'All time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last7' },
  { label: 'Last 30 days', value: 'last30' },
  { label: 'Custom', value: 'custom' },
] as const;

export const ORDER_SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Highest total', value: 'highest' },
  { label: 'Lowest total', value: 'lowest' },
  { label: 'Customer name', value: 'customer' },
] as const;

export const ORDER_COLUMN_KEYS = [
  'orderNumber',
  'customer',
  'email',
  'itemsCount',
  'products',
  'orderTotal',
  'paymentMethod',
  'paymentStatus',
  'orderStatus',
  'purchaseDate',
  'deliveryStatus',
  'membershipDiscount',
  'coupon',
] as const;

export type OrderColumnKey = (typeof ORDER_COLUMN_KEYS)[number];
