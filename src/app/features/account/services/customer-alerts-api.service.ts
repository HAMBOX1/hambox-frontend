import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CUSTOMER_ALERTS_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { CreateAlertSubscriptionRequest, CustomerAlertSubscriptionApiDto } from '../models/customer-alert.model';

@Injectable({
  providedIn: 'root',
})
export class CustomerAlertsApiService {
  private readonly api = inject(ApiClientService);

  create(request: CreateAlertSubscriptionRequest): Observable<CustomerAlertSubscriptionApiDto> {
    return this.api.post<CustomerAlertSubscriptionApiDto>(CUSTOMER_ALERTS_API.base, request);
  }

  getMine(): Observable<readonly CustomerAlertSubscriptionApiDto[]> {
    return this.api.get<readonly CustomerAlertSubscriptionApiDto[]>(CUSTOMER_ALERTS_API.base);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(CUSTOMER_ALERTS_API.item(id));
  }

  claimGuestAlerts(): Observable<number> {
    return this.api.post<number>(CUSTOMER_ALERTS_API.claim, {});
  }
}
