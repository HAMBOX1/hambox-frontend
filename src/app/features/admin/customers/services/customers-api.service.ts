import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { API_BASE_URL } from '../../../../core/tokens/api-base-url.token';
import { PagedResult } from '../../../catalog/models/category.model';

export interface CustomerListItem {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phoneNumber: string | null;
  readonly status: string;
  readonly emailConfirmed: boolean;
  readonly preferredLanguage: string;
  readonly preferredCurrency: string;
  readonly registeredOnUtc: string;
  readonly orderCount: number;
  readonly paidOrderCount: number;
  readonly paidSpendUsd: number;
  readonly lastOrderOnUtc: string | null;
  readonly membershipPlan: string | null;
  readonly membershipStatus: string | null;
  readonly membershipExpiresOnUtc: string | null;
  readonly pointsBalance: number;
  readonly referralCode: string | null;
  readonly referralTier: string | null;
}

export interface CustomerFilters {
  readonly searchTerm: string;
  readonly status: string;
  /** '' = everyone, 'yes' = active members only, 'no' = non-members only. */
  readonly member: '' | 'yes' | 'no';
  readonly registeredFrom: string;
  readonly registeredTo: string;
}

@Injectable({ providedIn: 'root' })
export class CustomersApiService {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(filters: CustomerFilters, pageNumber: number, pageSize: number): Observable<PagedResult<CustomerListItem>> {
    return this.api.get<PagedResult<CustomerListItem>>('/api/v1/admin/customers', {
      params: { ...this.toParams(filters), pageNumber, pageSize },
    });
  }

  /** The CSV of the same rows (account and activity columns only). */
  export(filters: CustomerFilters): Observable<Blob> {
    const params = new HttpParams({ fromObject: this.toParams(filters) });
    return this.http.get(`${this.baseUrl}/api/v1/admin/customers/export`, { params, responseType: 'blob' });
  }

  private toParams(filters: CustomerFilters): Record<string, string | boolean> {
    const params: Record<string, string | boolean> = {};
    if (filters.searchTerm.trim()) {
      params['searchTerm'] = filters.searchTerm.trim();
    }
    if (filters.status) {
      params['status'] = filters.status;
    }
    if (filters.member) {
      params['member'] = filters.member === 'yes';
    }
    if (filters.registeredFrom) {
      params['registeredFrom'] = new Date(filters.registeredFrom).toISOString();
    }
    if (filters.registeredTo) {
      // Up to the end of the chosen day.
      params['registeredTo'] = new Date(`${filters.registeredTo}T23:59:59`).toISOString();
    }
    return params;
  }
}
