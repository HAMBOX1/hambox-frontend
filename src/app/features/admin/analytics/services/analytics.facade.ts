import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ANALYTICS_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import {
  AnalyticsCategoriesDto,
  AnalyticsCustomersDto,
  AnalyticsExportFormat,
  AnalyticsFilterState,
  AnalyticsMembershipsDto,
  AnalyticsOperationsDto,
  AnalyticsOrdersDto,
  AnalyticsOverviewDto,
  AnalyticsProductsDto,
  AnalyticsPromotionsDto,
  AnalyticsReferralsDto,
  AnalyticsRevenueDto,
  AnalyticsSearchDto,
  AnalyticsSection,
  DEFAULT_ANALYTICS_FILTERS,
} from '../models/analytics-api.model';
import {
  downloadBlob,
  filenameFromContentDisposition,
} from '../utils/analytics-download.util';

@Injectable()
export class AnalyticsFacade {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private readonly filtersState = signal<AnalyticsFilterState>({ ...DEFAULT_ANALYTICS_FILTERS });
  private readonly currentSectionState = signal<AnalyticsSection>('overview');
  private readonly loadingState = signal(false);
  private readonly exportingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  private readonly overviewState = signal<AnalyticsOverviewDto | null>(null);
  private readonly revenueState = signal<AnalyticsRevenueDto | null>(null);
  private readonly ordersState = signal<AnalyticsOrdersDto | null>(null);
  private readonly productsState = signal<AnalyticsProductsDto | null>(null);
  private readonly categoriesState = signal<AnalyticsCategoriesDto | null>(null);
  private readonly customersState = signal<AnalyticsCustomersDto | null>(null);
  private readonly membershipsState = signal<AnalyticsMembershipsDto | null>(null);
  private readonly promotionsState = signal<AnalyticsPromotionsDto | null>(null);
  private readonly referralsState = signal<AnalyticsReferralsDto | null>(null);
  private readonly searchState = signal<AnalyticsSearchDto | null>(null);
  private readonly operationsState = signal<AnalyticsOperationsDto | null>(null);

  readonly filters = this.filtersState.asReadonly();
  readonly currentSection = this.currentSectionState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly exporting = this.exportingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly overview = this.overviewState.asReadonly();
  readonly revenue = this.revenueState.asReadonly();
  readonly orders = this.ordersState.asReadonly();
  readonly products = this.productsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly customers = this.customersState.asReadonly();
  readonly memberships = this.membershipsState.asReadonly();
  readonly promotions = this.promotionsState.asReadonly();
  readonly referrals = this.referralsState.asReadonly();
  readonly search = this.searchState.asReadonly();
  readonly operations = this.operationsState.asReadonly();

  setCurrentSection(section: AnalyticsSection): void {
    this.currentSectionState.set(section);
  }

  setFilters(patch: Partial<AnalyticsFilterState>, reload = true): void {
    this.filtersState.update((current) => ({ ...current, ...patch }));
    if (reload) {
      void this.refreshCurrent();
    }
  }

  async loadOverview(): Promise<void> {
    this.setCurrentSection('overview');
    await this.run(async () => {
      this.overviewState.set(
        await firstValueFrom(
          this.api.get<AnalyticsOverviewDto>(ANALYTICS_API.overview, {
            params: this.queryParams(),
          }),
        ),
      );
    }, 'Unable to load analytics overview.');
  }

  async loadRevenue(): Promise<void> {
    this.setCurrentSection('revenue');
    await this.run(async () => {
      this.revenueState.set(
        await firstValueFrom(
          this.api.get<AnalyticsRevenueDto>(ANALYTICS_API.revenue, {
            params: this.queryParams(),
          }),
        ),
      );
    }, 'Unable to load revenue analytics.');
  }

  async loadOrders(): Promise<void> {
    this.setCurrentSection('orders');
    await this.run(async () => {
      this.ordersState.set(
        await firstValueFrom(
          this.api.get<AnalyticsOrdersDto>(ANALYTICS_API.orders, {
            params: this.queryParams(),
          }),
        ),
      );
    }, 'Unable to load orders analytics.');
  }

  async loadProducts(): Promise<void> {
    this.setCurrentSection('products');
    await this.run(async () => {
      this.productsState.set(
        await firstValueFrom(
          this.api.get<AnalyticsProductsDto>(ANALYTICS_API.products, {
            params: this.queryParams(),
          }),
        ),
      );
    }, 'Unable to load products analytics.');
  }

  async loadCategories(): Promise<void> {
    this.setCurrentSection('categories');
    await this.run(async () => {
      this.categoriesState.set(
        await firstValueFrom(
          this.api.get<AnalyticsCategoriesDto>(ANALYTICS_API.categories, {
            params: this.queryParams(),
          }),
        ),
      );
    }, 'Unable to load categories analytics.');
  }

  async loadCustomers(): Promise<void> {
    this.setCurrentSection('customers');
    await this.run(async () => {
      this.customersState.set(
        await firstValueFrom(
          this.api.get<AnalyticsCustomersDto>(ANALYTICS_API.customers, {
            params: this.queryParams(),
          }),
        ),
      );
    }, 'Unable to load customers analytics.');
  }

  async loadMemberships(): Promise<void> {
    this.setCurrentSection('memberships');
    await this.run(async () => {
      this.membershipsState.set(
        await firstValueFrom(
          this.api.get<AnalyticsMembershipsDto>(ANALYTICS_API.memberships, {
            params: this.queryParams(),
          }),
        ),
      );
    }, 'Unable to load memberships analytics.');
  }

  async loadPromotions(): Promise<void> {
    this.setCurrentSection('promotions');
    await this.run(async () => {
      this.promotionsState.set(
        await firstValueFrom(
          this.api.get<AnalyticsPromotionsDto>(ANALYTICS_API.promotions, {
            params: this.queryParams(),
          }),
        ),
      );
    }, 'Unable to load promotions analytics.');
  }

  async loadReferrals(): Promise<void> {
    this.setCurrentSection('referrals');
    await this.run(async () => {
      this.referralsState.set(
        await firstValueFrom(
          this.api.get<AnalyticsReferralsDto>(ANALYTICS_API.referrals, {
            params: this.queryParams(),
          }),
        ),
      );
    }, 'Unable to load referrals analytics.');
  }

  async loadSearch(): Promise<void> {
    this.setCurrentSection('search');
    await this.run(async () => {
      this.searchState.set(
        await firstValueFrom(
          this.api.get<AnalyticsSearchDto>(ANALYTICS_API.search, {
            params: this.queryParams(),
          }),
        ),
      );
    }, 'Unable to load search analytics.');
  }

  async loadOperations(): Promise<void> {
    this.setCurrentSection('operations');
    await this.run(async () => {
      this.operationsState.set(
        await firstValueFrom(
          this.api.get<AnalyticsOperationsDto>(ANALYTICS_API.operations, {
            params: this.queryParams(),
          }),
        ),
      );
    }, 'Unable to load operations analytics.');
  }

  async refreshCurrent(): Promise<void> {
    switch (this.currentSectionState()) {
      case 'overview':
        return this.loadOverview();
      case 'revenue':
        return this.loadRevenue();
      case 'orders':
        return this.loadOrders();
      case 'products':
        return this.loadProducts();
      case 'categories':
        return this.loadCategories();
      case 'customers':
        return this.loadCustomers();
      case 'memberships':
        return this.loadMemberships();
      case 'promotions':
        return this.loadPromotions();
      case 'referrals':
        return this.loadReferrals();
      case 'search':
        return this.loadSearch();
      case 'operations':
        return this.loadOperations();
    }
  }

  async exportSection(
    section: AnalyticsSection,
    format: AnalyticsExportFormat,
  ): Promise<void> {
    this.exportingState.set(true);
    this.errorState.set(null);
    try {
      const filters = this.filtersState();
      let params = new HttpParams()
        .set('section', section)
        .set('format', format)
        .set('preset', filters.preset)
        .set('compare', filters.compare);

      if (filters.preset === 'Custom' && filters.from) {
        params = params.set('from', filters.from);
      }
      if (filters.preset === 'Custom' && filters.to) {
        params = params.set('to', filters.to);
      }

      const response = await firstValueFrom(
        this.http.get(`${this.resolveUrl(ANALYTICS_API.export)}`, {
          params,
          responseType: 'blob',
          observe: 'response',
        }),
      );

      const fallback = `analytics-${section}.${this.extensionFor(format)}`;
      const filename = filenameFromContentDisposition(
        response.headers.get('content-disposition'),
        fallback,
      );
      downloadBlob(this.unwrapBlob(response), filename);
    } catch (error) {
      this.errorState.set(this.resolveError(error, 'Unable to export analytics.'));
    } finally {
      this.exportingState.set(false);
    }
  }

  private queryParams(): Record<string, string | number | boolean> {
    const filters = this.filtersState();
    const params: Record<string, string | number | boolean> = {
      preset: filters.preset,
      compare: filters.compare,
    };
    if (filters.preset === 'Custom' && filters.from) {
      params['from'] = filters.from;
    }
    if (filters.preset === 'Custom' && filters.to) {
      params['to'] = filters.to;
    }
    return params;
  }

  private extensionFor(format: AnalyticsExportFormat): string {
    switch (format) {
      case 'excel':
        return 'xlsx';
      case 'json':
        return 'json';
      case 'pdf':
        return 'pdf';
      default:
        return 'csv';
    }
  }

  private unwrapBlob(response: HttpResponse<Blob>): Blob {
    return response.body ?? new Blob();
  }

  private resolveUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const base = this.apiBaseUrl.replace(/\/$/, '');
    return `${base}${normalizedPath}`;
  }

  private async run(action: () => Promise<void>, fallback: string): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      await action();
    } catch (error) {
      this.errorState.set(this.resolveError(error, fallback));
    } finally {
      this.loadingState.set(false);
    }
  }

  private resolveError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    return fallback;
  }
}