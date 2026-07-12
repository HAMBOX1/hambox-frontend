export type AnalyticsPeriodPreset =
  | 'Today'
  | 'Yesterday'
  | 'Last7'
  | 'Last30'
  | 'Last90'
  | 'ThisMonth'
  | 'ThisYear'
  | 'Custom';

export type AnalyticsComparisonMode =
  | 'None'
  | 'PreviousPeriod'
  | 'PreviousMonth'
  | 'PreviousYear';

export type AnalyticsSection =
  | 'overview'
  | 'revenue'
  | 'orders'
  | 'products'
  | 'categories'
  | 'customers'
  | 'memberships'
  | 'promotions'
  | 'referrals'
  | 'search'
  | 'operations';

export type AnalyticsExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

export interface AnalyticsFilterState {
  readonly preset: AnalyticsPeriodPreset;
  readonly from: string | null;
  readonly to: string | null;
  readonly compare: AnalyticsComparisonMode;
}

export interface AnalyticsPeriodDto {
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly preset: string;
  readonly comparisonMode: string;
  readonly comparisonFrom: string | null;
  readonly comparisonTo: string | null;
}

export interface AnalyticsSeriesPointDto {
  readonly label: string;
  readonly value: number;
  readonly count: number | null;
}

export interface AnalyticsNamedValueDto {
  readonly name: string;
  readonly value: number;
  readonly count: number | null;
  readonly id: string | null;
}

export interface AnalyticsGrowthDto {
  readonly current: number;
  readonly previous: number;
  readonly percentChange: number | null;
}

export interface AnalyticsOverviewDto {
  readonly period: AnalyticsPeriodDto;
  readonly grossRevenue: number;
  readonly netRevenue: number;
  readonly pendingRevenue: number;
  readonly refundedRevenue: number;
  readonly averageOrderValue: number;
  readonly totalOrders: number;
  readonly completedOrders: number;
  readonly orderConversionRate: number;
  readonly newCustomers: number;
  readonly returningCustomers: number;
  readonly activeMemberships: number;
  readonly membershipMrr: number;
  readonly promotionRedemptions: number;
  readonly promotionDiscountTotal: number;
  readonly referralInvites: number;
  readonly successfulReferrals: number;
  readonly searchQueries: number;
  readonly zeroResultSearches: number;
  readonly productViews: number;
  readonly failedJobs: number;
  readonly api5xxCount: number;
  readonly revenueGrowth: AnalyticsGrowthDto;
  readonly ordersGrowth: AnalyticsGrowthDto;
  readonly revenueSeries: AnalyticsSeriesPointDto[];
  readonly ordersSeries: AnalyticsSeriesPointDto[];
}

export interface AnalyticsRevenueDto {
  readonly period: AnalyticsPeriodDto;
  readonly grossRevenue: number;
  readonly netRevenue: number;
  readonly pendingRevenue: number;
  readonly refundedRevenue: number;
  readonly averageOrderValue: number;
  readonly growth: AnalyticsGrowthDto;
  readonly membershipRevenue: number;
  readonly productRevenue: number;
  readonly series: AnalyticsSeriesPointDto[];
  readonly byCategory: AnalyticsNamedValueDto[];
  readonly byProduct: AnalyticsNamedValueDto[];
  readonly byMembershipPlan: AnalyticsNamedValueDto[];
}

export interface AnalyticsOrdersDto {
  readonly period: AnalyticsPeriodDto;
  readonly total: number;
  readonly pending: number;
  readonly processing: number;
  readonly completed: number;
  readonly cancelled: number;
  readonly refunded: number;
  readonly failed: number;
  readonly conversionRate: number;
  readonly averageProcessingSeconds: number | null;
  readonly averageFulfillmentSeconds: number | null;
  readonly growth: AnalyticsGrowthDto;
  readonly series: AnalyticsSeriesPointDto[];
  readonly byStatus: AnalyticsNamedValueDto[];
}

export interface AnalyticsProductsDto {
  readonly period: AnalyticsPeriodDto;
  readonly outOfStockVariants: number;
  readonly lowStockVariants: number;
  readonly inventoryValue: number;
  readonly turnoverRatio: number;
  readonly topByQuantity: AnalyticsNamedValueDto[];
  readonly topByRevenue: AnalyticsNamedValueDto[];
  readonly worstByQuantity: AnalyticsNamedValueDto[];
  readonly mostViewed: AnalyticsNamedValueDto[];
  readonly neverPurchased: AnalyticsNamedValueDto[];
}

export interface AnalyticsCategoriesDto {
  readonly period: AnalyticsPeriodDto;
  readonly byRevenue: AnalyticsNamedValueDto[];
  readonly byQuantity: AnalyticsNamedValueDto[];
  readonly series: AnalyticsSeriesPointDto[];
}

export interface AnalyticsCustomersDto {
  readonly period: AnalyticsPeriodDto;
  readonly newCustomers: number;
  readonly returningCustomers: number;
  readonly totalDistinctBuyers: number;
  readonly averageLifetimeValue: number;
  readonly growth: AnalyticsGrowthDto;
  readonly topByLifetimeValue: AnalyticsNamedValueDto[];
  readonly byCountry: AnalyticsNamedValueDto[];
  readonly newCustomersSeries: AnalyticsSeriesPointDto[];
}

export interface AnalyticsMembershipsDto {
  readonly period: AnalyticsPeriodDto;
  readonly activeCount: number;
  readonly newInPeriod: number;
  readonly renewalsInPeriod: number;
  readonly cancellationsInPeriod: number;
  readonly mrr: number;
  readonly arr: number;
  readonly conversionRate: number;
  readonly membershipRevenue: number;
  readonly revenueByPlan: AnalyticsNamedValueDto[];
  readonly series: AnalyticsSeriesPointDto[];
}

export interface AnalyticsPromotionsDto {
  readonly period: AnalyticsPeriodDto;
  readonly redemptions: number;
  readonly discountTotal: number;
  readonly revenueOnPromoOrders: number;
  readonly conversionRate: number;
  readonly roi: number | null;
  readonly topCoupons: AnalyticsNamedValueDto[];
  readonly topPromotions: AnalyticsNamedValueDto[];
  readonly series: AnalyticsSeriesPointDto[];
}

export interface AnalyticsReferralsDto {
  readonly period: AnalyticsPeriodDto;
  readonly invites: number;
  readonly successful: number;
  readonly conversionRate: number;
  readonly attributedRevenue: number;
  readonly growth: AnalyticsGrowthDto;
  readonly topReferrers: AnalyticsNamedValueDto[];
  readonly series: AnalyticsSeriesPointDto[];
}

export interface AnalyticsSearchDto {
  readonly period: AnalyticsPeriodDto;
  readonly totalQueries: number;
  readonly zeroResultQueries: number;
  readonly zeroResultRate: number;
  readonly conversionRate: number;
  readonly topTerms: AnalyticsNamedValueDto[];
  readonly zeroResultTerms: AnalyticsNamedValueDto[];
  readonly series: AnalyticsSeriesPointDto[];
}

export interface AnalyticsOperationsDto {
  readonly period: AnalyticsPeriodDto;
  readonly averageQueueSeconds: number | null;
  readonly averageDeliverySeconds: number | null;
  readonly failedJobs: number;
  readonly retrySuccessRate: number;
  readonly inactiveSuppliers: number;
  readonly api5xxCount: number;
  readonly workerUptimePercent: number | null;
  readonly failedJobsSeries: AnalyticsSeriesPointDto[];
  readonly api5xxSeries: AnalyticsSeriesPointDto[];
}

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilterState = {
  preset: 'Last30',
  from: null,
  to: null,
  compare: 'None',
};