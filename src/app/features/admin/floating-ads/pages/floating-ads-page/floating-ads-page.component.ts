import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../../core/models/api-error.model';
import { FloatingAdAdmin, FloatingAdAudience, FloatingAdInput } from '../../../../../core/models/floating-ad.model';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { AdminPageHeaderComponent } from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionPipe } from '../../../../../shared/pipes/has-permission.pipe';
import { FloatingAdsAdminApiService } from '../../services/floating-ads-admin-api.service';

const AUDIENCE_OPTIONS: readonly { label: string; value: FloatingAdAudience }[] = [
  { label: 'Everyone', value: 'Everyone' },
  { label: 'Visitors who are not signed in', value: 'Guests' },
  { label: 'Any signed-in customer', value: 'SignedIn' },
  { label: 'Customers without a membership', value: 'WithoutMembership' },
  { label: 'Customers with a membership', value: 'WithMembership' },
];

/** A `datetime-local` input wants "yyyy-MM-ddTHH:mm" in local time; the API stores UTC. */
function toLocalInput(iso: string | null): string {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

interface AdForm {
  id: string | null;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  buttonLabelEn: string;
  buttonLabelAr: string;
  linkUrl: string;
  audience: FloatingAdAudience;
  isActive: boolean;
  startsOn: string;
  endsOn: string;
  sortOrder: number;
  dismissHours: number;
}

const EMPTY_FORM: AdForm = {
  id: null,
  titleEn: '',
  titleAr: '',
  messageEn: '',
  messageAr: '',
  buttonLabelEn: '',
  buttonLabelAr: '',
  linkUrl: '',
  audience: 'Everyone',
  isActive: true,
  startsOn: '',
  endsOn: '',
  sortOrder: 0,
  dismissHours: 24,
};

/**
 * Floating ads: a small offer card that floats over the storefront (e.g. "20% off Premium"), shown only to the
 * audience chosen here — guests, signed-in customers, or customers without / with a membership.
 */
@Component({
  selector: 'app-floating-ads-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToastModule,
    HasPermissionPipe,
    AdminPageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './floating-ads-page.component.html',
  styleUrl: './floating-ads-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingAdsPageComponent implements OnInit {
  private readonly api = inject(FloatingAdsAdminApiService);
  private readonly messages = inject(MessageService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Floating ads' });
  protected readonly audienceOptions = AUDIENCE_OPTIONS;

  protected readonly ads = signal<readonly FloatingAdAdmin[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly form = signal<AdForm>({ ...EMPTY_FORM });
  protected readonly formError = signal<string | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  protected audienceLabel(value: FloatingAdAudience): string {
    return AUDIENCE_OPTIONS.find((o) => o.value === value)?.label ?? value;
  }

  protected schedule(ad: FloatingAdAdmin): string {
    const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : null);
    const start = fmt(ad.startsOnUtc);
    const end = fmt(ad.endsOnUtc);
    if (!start && !end) {
      return 'Always';
    }

    return `${start ?? 'Now'} → ${end ?? 'No end'}`;
  }

  protected openCreate(): void {
    this.form.set({ ...EMPTY_FORM });
    this.formError.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(ad: FloatingAdAdmin): void {
    this.form.set({
      id: ad.id,
      titleEn: ad.titleEn,
      titleAr: ad.titleAr ?? '',
      messageEn: ad.messageEn ?? '',
      messageAr: ad.messageAr ?? '',
      buttonLabelEn: ad.buttonLabelEn ?? '',
      buttonLabelAr: ad.buttonLabelAr ?? '',
      linkUrl: ad.linkUrl ?? '',
      audience: ad.audience,
      isActive: ad.isActive,
      startsOn: toLocalInput(ad.startsOnUtc),
      endsOn: toLocalInput(ad.endsOnUtc),
      sortOrder: ad.sortOrder,
      dismissHours: ad.dismissHours,
    });
    this.formError.set(null);
    this.dialogOpen.set(true);
  }

  protected patch<K extends keyof AdForm>(key: K, value: AdForm[K]): void {
    this.form.update((current) => ({ ...current, [key]: value }));
  }

  protected async save(): Promise<void> {
    const f = this.form();
    if (!f.titleEn.trim()) {
      this.formError.set('A title is required.');
      return;
    }

    const input: FloatingAdInput = {
      titleEn: f.titleEn.trim(),
      titleAr: f.titleAr.trim() || null,
      messageEn: f.messageEn.trim() || null,
      messageAr: f.messageAr.trim() || null,
      buttonLabelEn: f.buttonLabelEn.trim() || null,
      buttonLabelAr: f.buttonLabelAr.trim() || null,
      linkUrl: f.linkUrl.trim() || null,
      audience: f.audience,
      isActive: f.isActive,
      startsOnUtc: fromLocalInput(f.startsOn),
      endsOnUtc: fromLocalInput(f.endsOn),
      sortOrder: f.sortOrder ?? 0,
      dismissHours: f.dismissHours ?? 24,
    };

    this.saving.set(true);
    this.formError.set(null);
    try {
      await firstValueFrom(f.id ? this.api.update(f.id, input) : this.api.create(input));
      this.dialogOpen.set(false);
      this.messages.add({ severity: 'success', summary: 'Floating ad saved', life: 3000 });
      await this.load();
    } catch (error) {
      this.formError.set(error instanceof ApiError && error.message ? error.message : 'Could not save the ad. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggleActive(ad: FloatingAdAdmin): Promise<void> {
    try {
      await firstValueFrom(this.api.setActive(ad.id, !ad.isActive));
      await this.load();
    } catch {
      this.messages.add({ severity: 'error', summary: 'Could not change the ad', life: 4000 });
    }
  }

  protected async remove(ad: FloatingAdAdmin): Promise<void> {
    if (!confirm(`Delete the floating ad “${ad.titleEn}”?`)) {
      return;
    }

    try {
      await firstValueFrom(this.api.delete(ad.id));
      this.messages.add({ severity: 'success', summary: 'Floating ad deleted', life: 3000 });
      await this.load();
    } catch {
      this.messages.add({ severity: 'error', summary: 'Could not delete the ad', life: 4000 });
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.ads.set(await firstValueFrom(this.api.list()));
    } catch {
      this.messages.add({ severity: 'error', summary: 'Could not load the floating ads', life: 4000 });
    } finally {
      this.loading.set(false);
    }
  }
}
