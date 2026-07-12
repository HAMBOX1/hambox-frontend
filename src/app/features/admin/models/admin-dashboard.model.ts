export interface AdminDashboardOrderMetricsDto {
  readonly todaysOrders: number;
  readonly pendingOrders: number;
  readonly failedOrders: number;
  readonly manualReviewOrders: number;
  readonly revenueToday: number;
  readonly totalRevenue: number;
  readonly averageOrderValue: number;
  readonly refunds: number;
}

export interface AdminDashboardInventoryMetricsDto {
  readonly lowStockVariants: number;
  readonly outOfStockVariants: number;
  readonly availableCodes: number;
  readonly inventoryValue: number;
}

export interface AdminDashboardPromotionMetricsDto {
  readonly activePromotions: number;
  readonly activeCoupons: number;
  readonly redemptionsToday: number;
}

export interface AdminDashboardMembershipMetricsDto {
  readonly activeSubscriptions: number;
  readonly expiringWithinWeek: number;
  readonly monthlyRecurringRevenue: number;
}

export interface AdminDashboardAlertsDto {
  readonly failedOrders: number;
  readonly failedPayments: number;
  readonly lowStockVariants: number;
  readonly outOfStockVariants: number;
}

export interface AdminDashboardRecentOrderDto {
  readonly id: string;
  readonly orderNumber: string;
  readonly customerName: string;
  readonly email: string;
  readonly totalAmount: number;
  readonly orderStatus: string;
  readonly paymentStatus: string;
  readonly deliveryStatus: string;
  readonly purchaseDate: string;
}

export interface AdminDashboardRecentCustomerDto {
  readonly email: string;
  readonly customerName: string;
  readonly orderCount: number;
  readonly totalSpent: number;
  readonly lastOrderDate: string;
}

export interface AdminDashboardLowStockItemDto {
  readonly variantId: string;
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly availableStock: number;
  readonly lowStockThreshold: number;
  readonly isOutOfStock: boolean;
}

export interface AdminDashboardDto {
  readonly orders: AdminDashboardOrderMetricsDto;
  readonly inventory: AdminDashboardInventoryMetricsDto;
  readonly promotions: AdminDashboardPromotionMetricsDto;
  readonly memberships: AdminDashboardMembershipMetricsDto;
  readonly alerts: AdminDashboardAlertsDto;
  readonly recentOrders: readonly AdminDashboardRecentOrderDto[];
  readonly recentCustomers: readonly AdminDashboardRecentCustomerDto[];
  readonly lowStockItems: readonly AdminDashboardLowStockItemDto[];
}
