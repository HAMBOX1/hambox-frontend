import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../../core/models/api-error.model';
import { AdminPageHeaderComponent } from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { CustomerFilters, CustomerListItem, CustomersApiService } from '../../services/customers-api.service';

const PAGE_SIZE = 25;

const EMPTY_FILTERS: CustomerFilters = { searchTerm: '', status: '', member: '', registeredFrom: '', registeredTo: '' };

/**
 * Customers: every account with what the store knows about it (orders and spend, membership, Stars balance, referral code),
 * searchable by email / name / phone, filterable by status, membership and registration date, exportable to CSV, with a
 * "customer 360" panel for the selected one.
 */
@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [FormsModule, ButtonModule, DrawerModule, AdminPageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-page customers">
      <app-admin-page-header
        title="Customers"
        subtitle="Every account with its orders, spend, membership, Stars and referral code. Search by email, name or phone."
        [breadcrumbs]="breadcrumbs"
      >
        <button adminHeaderActions pButton type="button" icon="pi pi-download" label="Export CSV" severity="secondary" [loading]="exporting()" (click)="exportCsv()"></button>
      </app-admin-page-header>

      <form class="customers__filters" (submit)="$event.preventDefault(); apply()">
        <input type="search" placeholder="Search email, name or phone" [ngModel]="filters().searchTerm" (ngModelChange)="patch({ searchTerm: $event })" name="q" />
        <select [ngModel]="filters().status" (ngModelChange)="patch({ status: $event })" name="status" aria-label="Status">
          <option value="">Any status</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Suspended">Suspended</option>
          <option value="Blocked">Blocked</option>
          <option value="Banned">Banned</option>
        </select>
        <select [ngModel]="filters().member" (ngModelChange)="patch({ member: $event })" name="member" aria-label="Membership">
          <option value="">Members and others</option>
          <option value="yes">Active members only</option>
          <option value="no">Not members</option>
        </select>
        <label>Registered from <input type="date" [ngModel]="filters().registeredFrom" (ngModelChange)="patch({ registeredFrom: $event })" name="from" /></label>
        <label>to <input type="date" [ngModel]="filters().registeredTo" (ngModelChange)="patch({ registeredTo: $event })" name="to" /></label>
        <button pButton type="submit" label="Search" icon="pi pi-search"></button>
        <button pButton type="button" severity="secondary" [text]="true" label="Clear" (click)="clear()"></button>
      </form>

      @if (error(); as message) {
        <p class="customers__error" role="alert">{{ message }}</p>
      }

      <div class="customers__table-wrap">
        <table class="customers__table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Status</th>
              <th>Registered</th>
              <th class="num">Orders</th>
              <th class="num">Spend (USD)</th>
              <th>Elite</th>
              <th class="num">Stars</th>
              <th>Referral code</th>
            </tr>
          </thead>
          <tbody>
            @for (customer of customers(); track customer.id) {
              <tr class="customers__row" tabindex="0" (click)="selected.set(customer)" (keydown.enter)="selected.set(customer)">
                <td>
                  <strong>{{ fullName(customer) }}</strong>
                  <span class="customers__sub">{{ customer.email }}</span>
                  @if (customer.phoneNumber) {
                    <span class="customers__sub">{{ customer.phoneNumber }}</span>
                  }
                </td>
                <td><span class="customers__badge" [attr.data-status]="customer.status">{{ customer.status }}</span></td>
                <td>{{ date(customer.registeredOnUtc) }}</td>
                <td class="num">{{ customer.paidOrderCount }}/{{ customer.orderCount }}</td>
                <td class="num">{{ customer.paidSpendUsd.toFixed(2) }}</td>
                <td>
                  @if (customer.membershipPlan) {
                    {{ customer.membershipPlan }} <span class="customers__sub">{{ customer.membershipStatus }}</span>
                  } @else {
                    <span class="customers__sub">—</span>
                  }
                </td>
                <td class="num">{{ customer.pointsBalance }}</td>
                <td>{{ customer.referralCode ?? '—' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="customers__empty">{{ loading() ? 'Loading…' : 'No customers match.' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="customers__pager">
        <span>{{ total() }} customer{{ total() === 1 ? '' : 's' }}</span>
        <button pButton type="button" severity="secondary" size="small" icon="pi pi-chevron-left" label="Previous" [disabled]="page() <= 1 || loading()" (click)="go(page() - 1)"></button>
        <span>Page {{ page() }} / {{ pages() }}</span>
        <button pButton type="button" severity="secondary" size="small" icon="pi pi-chevron-right" iconPos="right" label="Next" [disabled]="page() >= pages() || loading()" (click)="go(page() + 1)"></button>
      </div>
    </section>

    <p-drawer [visible]="!!selected()" (visibleChange)="!$event && selected.set(null)" position="right" header="Customer" [style]="{ width: 'min(28rem, 100vw)' }">
      @if (selected(); as c) {
        <div class="customers__detail">
          <h3>{{ fullName(c) }}</h3>
          <dl>
            <dt>Customer ID</dt><dd>{{ c.id }}</dd>
            <dt>Email</dt><dd>{{ c.email }} {{ c.emailConfirmed ? '(confirmed)' : '(not confirmed)' }}</dd>
            <dt>Phone</dt><dd>{{ c.phoneNumber ?? '—' }}</dd>
            <dt>Status</dt><dd>{{ c.status }}</dd>
            <dt>Registered</dt><dd>{{ date(c.registeredOnUtc) }}</dd>
            <dt>Language / currency</dt><dd>{{ c.preferredLanguage }} / {{ c.preferredCurrency }}</dd>
            <dt>Orders</dt><dd>{{ c.orderCount }} ({{ c.paidOrderCount }} paid)</dd>
            <dt>Paid spend</dt><dd>$ {{ c.paidSpendUsd.toFixed(2) }}</dd>
            <dt>Last order</dt><dd>{{ c.lastOrderOnUtc ? date(c.lastOrderOnUtc) : '—' }}</dd>
            <dt>Elite membership</dt>
            <dd>
              @if (c.membershipPlan) {
                {{ c.membershipPlan }} · {{ c.membershipStatus }} · until {{ date(c.membershipExpiresOnUtc) }}
              } @else {
                None
              }
            </dd>
            <dt>Stars balance</dt><dd>{{ c.pointsBalance }}</dd>
            <dt>Referral</dt><dd>{{ c.referralCode ?? '—' }} {{ c.referralTier ? '· ' + c.referralTier : '' }}</dd>
          </dl>
        </div>
      }
    </p-drawer>
  `,
  styles: `
    .customers__filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 1rem;
    }

    .customers__filters input,
    .customers__filters select {
      min-height: 2.5rem;
      padding: 0 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-input-bg, transparent);
      color: inherit;
    }

    .customers__filters input[type='search'] {
      flex: 1 1 16rem;
    }

    .customers__filters label {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
    }

    .customers__table-wrap {
      overflow-x: auto;
    }

    .customers__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .customers__table th,
    .customers__table td {
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid var(--color-border);
      text-align: start;
      vertical-align: top;
    }

    .customers__table .num {
      text-align: end;
      white-space: nowrap;
    }

    .customers__row {
      cursor: pointer;
    }

    .customers__row:hover,
    .customers__row:focus-visible {
      background: color-mix(in srgb, var(--color-primary, #3cdc96) 8%, transparent);
      outline: none;
    }

    .customers__sub {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }

    .customers__badge {
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      background: color-mix(in srgb, var(--color-text-secondary, #999) 20%, transparent);
    }

    .customers__badge[data-status='Active'] {
      background: color-mix(in srgb, var(--admin-accent-green, #34d399) 25%, transparent);
    }

    .customers__badge[data-status='Blocked'],
    .customers__badge[data-status='Banned'],
    .customers__badge[data-status='Suspended'] {
      background: color-mix(in srgb, var(--admin-accent-red, #f87171) 25%, transparent);
    }

    .customers__empty {
      padding: 2rem;
      text-align: center;
      color: var(--color-text-secondary);
    }

    .customers__pager {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1rem;
      font-size: 0.875rem;
    }

    .customers__error {
      color: var(--admin-accent-red, #f87171);
    }

    .customers__detail dl {
      display: grid;
      grid-template-columns: 9rem 1fr;
      gap: 0.5rem 0.75rem;
      margin: 0;
      font-size: 0.875rem;
    }

    .customers__detail dt {
      color: var(--color-text-secondary);
    }

    .customers__detail dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
  `,
})
export class CustomersPageComponent implements OnInit {
  private readonly api = inject(CustomersApiService);

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'ADMIN.NAV.CUSTOMERS' });

  protected readonly filters = signal<CustomerFilters>({ ...EMPTY_FILTERS });
  /** The filters of the search that is on screen (typing does not change the list until Search is pressed). */
  private readonly applied = signal<CustomerFilters>({ ...EMPTY_FILTERS });
  protected readonly customers = signal<readonly CustomerListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(false);
  protected readonly exporting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selected = signal<CustomerListItem | null>(null);

  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  ngOnInit(): void {
    void this.load(1);
  }

  protected patch(change: Partial<CustomerFilters>): void {
    this.filters.update((current) => ({ ...current, ...change }));
  }

  protected apply(): void {
    this.applied.set(this.filters());
    void this.load(1);
  }

  protected clear(): void {
    this.filters.set({ ...EMPTY_FILTERS });
    this.apply();
  }

  protected go(page: number): void {
    void this.load(page);
  }

  protected fullName(customer: CustomerListItem): string {
    return `${customer.firstName} ${customer.lastName}`.trim() || customer.email;
  }

  protected date(value: string | null): string {
    return value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  }

  protected async exportCsv(): Promise<void> {
    if (this.exporting()) {
      return;
    }

    this.exporting.set(true);
    this.error.set(null);
    try {
      const blob = await firstValueFrom(this.api.export(this.applied()));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.error.set(error instanceof ApiError && error.message ? error.message : 'Could not export the customers.');
    } finally {
      this.exporting.set(false);
    }
  }

  private async load(page: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.api.list(this.applied(), page, PAGE_SIZE));
      this.customers.set(result.items);
      this.total.set(result.totalCount);
      this.page.set(result.pageNumber);
    } catch (error) {
      this.customers.set([]);
      this.total.set(0);
      this.error.set(error instanceof ApiError && error.message ? error.message : 'Could not load the customers.');
    } finally {
      this.loading.set(false);
    }
  }
}
