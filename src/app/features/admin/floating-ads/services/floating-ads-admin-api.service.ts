import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { FLOATING_ADS_API } from '../../../../core/api/api-endpoints';
import { FloatingAdAdmin, FloatingAdInput } from '../../../../core/models/floating-ad.model';

@Injectable({ providedIn: 'root' })
export class FloatingAdsAdminApiService {
  private readonly api = inject(ApiClientService);

  list(): Observable<FloatingAdAdmin[]> {
    return this.api.get<FloatingAdAdmin[]>(FLOATING_ADS_API.admin);
  }

  create(input: FloatingAdInput): Observable<FloatingAdAdmin> {
    return this.api.post<FloatingAdAdmin>(FLOATING_ADS_API.admin, input);
  }

  update(id: string, input: FloatingAdInput): Observable<FloatingAdAdmin> {
    return this.api.put<FloatingAdAdmin>(FLOATING_ADS_API.adminItem(id), input);
  }

  setActive(id: string, active: boolean): Observable<void> {
    return this.api.post<void>(active ? FLOATING_ADS_API.activate(id) : FLOATING_ADS_API.deactivate(id));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(FLOATING_ADS_API.adminItem(id));
  }
}
