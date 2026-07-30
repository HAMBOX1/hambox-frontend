import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthContextType } from '../auth/auth-context';
import { SupportApiService } from './support-api.service';
import { SupportHubService } from './support-hub.service';
import { mapCategory, mapPriority, mapTag } from './support-mapper';
import { TicketCategory, TicketPriority, TicketTag } from './support.model';

/**
 * Shared cross-cutting Support state: lookups (categories/priorities/tags, used by both the
 * customer and admin surfaces) and the SignalR connection lifecycle. Per-ticket data lives in
 * each surface's own facade (AccountSupportFacade / AdminSupportFacade) since customer vs. agent
 * scoping/permissions differ too much to share a single ticket list.
 */
@Injectable({ providedIn: 'root' })
export class SupportTicketsStore {
  private readonly api = inject(SupportApiService);
  readonly hub = inject(SupportHubService);

  private readonly categoriesState = signal<readonly TicketCategory[]>([]);
  private readonly prioritiesState = signal<readonly TicketPriority[]>([]);
  private readonly tagsState = signal<readonly TicketTag[]>([]);
  private readonly lookupsLoadedState = signal(false);
  private connectedContext: AuthContextType | null = null;

  readonly categories = this.categoriesState.asReadonly();
  readonly priorities = this.prioritiesState.asReadonly();
  readonly tags = this.tagsState.asReadonly();
  readonly lookupsLoaded = this.lookupsLoadedState.asReadonly();

  async loadLookups(): Promise<void> {
    if (this.lookupsLoadedState()) {
      return;
    }

    const [categories, priorities] = await Promise.all([
      firstValueFrom(this.api.getCategories()),
      firstValueFrom(this.api.getPriorities()),
    ]);
    this.categoriesState.set(categories.map((c) => mapCategory(c)!));
    this.prioritiesState.set(priorities.map((p) => mapPriority(p)!));
    this.lookupsLoadedState.set(true);
  }

  async loadTags(): Promise<void> {
    const tags = await firstValueFrom(this.api.getTags());
    this.tagsState.set(tags.map(mapTag));
  }

  async connectRealtime(context: AuthContextType): Promise<void> {
    if (this.connectedContext === context) {
      return;
    }
    await this.hub.connect(context);
    this.connectedContext = context;
  }
}
