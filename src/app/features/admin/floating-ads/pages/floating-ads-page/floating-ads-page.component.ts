import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../../core/models/api-error.model';
import {
  FloatingAdAdmin,
  FloatingAdAudience,
  FloatingAdDesktopPosition,
  FloatingAdInput,
  FloatingAdMobilePosition,
  FloatingAdPage,
  FloatingAdPublic,
  FloatingAdStyle,
} from '../../../../../core/models/floating-ad.model';
import { MediaPickerComponent } from '../../../../../shared/components/admin/media-picker/media-picker.component';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { AdminPageHeaderComponent } from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionPipe } from '../../../../../shared/pipes/has-permission.pipe';
import { FloatingAdPreviewComponent } from '../../components/floating-ad-preview/floating-ad-preview.component';
import { FloatingAdsAdminApiService } from '../../services/floating-ads-admin-api.service';

const AUDIENCE_OPTIONS: readonly { label: string; value: FloatingAdAudience }[] = [
  { label: 'Everyone', value: 'Everyone' },
  { label: 'Visitors who are not signed in', value: 'Guests' },
  { label: 'Any signed-in customer', value: 'SignedIn' },
  { label: 'Customers without a membership', value: 'WithoutMembership' },
  { label: 'Customers with a membership', value: 'WithMembership' },
];

const STYLE_OPTIONS: readonly { label: string; value: FloatingAdStyle }[] = [
  { label: 'Mini card - small, text with a thumbnail', value: 'Mini' },
  { label: 'Product card - product picture and price', value: 'Product' },
  { label: 'Promo card - an offer or discount', value: 'Promo' },
];

const DESKTOP_POSITION_OPTIONS: readonly { label: string; value: FloatingAdDesktopPosition }[] = [
  { label: 'Bottom left', value: 'BottomLeft' },
  { label: 'Bottom right (above the assistant button)', value: 'BottomRight' },
];

const MOBILE_POSITION_OPTIONS: readonly { label: string; value: FloatingAdMobilePosition }[] = [
  { label: 'Bottom (above the bottom bar)', value: 'Bottom' },
  { label: 'Top (under the header)', value: 'Top' },
];

const PAGE_OPTIONS: readonly { label: string; value: FloatingAdPage }[] = [
  { label: 'Home', value: 'home' },
  { label: 'Products list', value: 'products' },
  { label: 'Product page', value: 'product' },
  { label: 'Category pages', value: 'category' },
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
  imageUrl: string;
  showCountdown: boolean;
  style: FloatingAdStyle;
  positionDesktop: FloatingAdDesktopPosition;
  positionMobile: FloatingAdMobilePosition;
  pages: FloatingAdPage[];
  priceText: string;
  oldPriceText: string;
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
  imageUrl: '',
  showCountdown: false,
  style: 'Mini',
  positionDesktop: 'BottomLeft',
  positionMobile: 'Bottom',
  pages: [],
  priceText: '',
  oldPriceText: '',
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
    MediaPickerComponent,
    MultiSelectModule,
    FloatingAdPreviewComponent,
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
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'ADMIN.NAV.FLOATING_ADS' });
  protected readonly audienceOptions = AUDIENCE_OPTIONS;
  protected readonly styleOptions = STYLE_OPTIONS;
  protected readonly desktopPositionOptions = DESKTOP_POSITION_OPTIONS;
  protected readonly mobilePositionOptions = MOBILE_POSITION_OPTIONS;
  protected readonly pageOptions = PAGE_OPTIONS;

  protected readonly ads = signal<readonly FloatingAdAdmin[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly form = signal<AdForm>({ ...EMPTY_FORM });
  protected readonly formError = signal<string | null>(null);

  /** The form as a visitor's card, for the live preview next to it. */
  protected readonly previewAd = computed<FloatingAdPublic>(() => {
    const f = this.form();
    return {
      id: f.id ?? 'preview',
      titleEn: f.titleEn || 'Your offer title',
      titleAr: f.titleAr || null,
      messageEn: f.messageEn || null,
      messageAr: f.messageAr || null,
      buttonLabelEn: f.buttonLabelEn || null,
      buttonLabelAr: f.buttonLabelAr || null,
      linkUrl: f.linkUrl || null,
      dismissHours: f.dismissHours,
      imageUrl: f.imageUrl || null,
      // A running countdown for the preview even before an end date is typed in.
      countdownEndsOnUtc: f.showCountdown
        ? (f.endsOn ? new Date(f.endsOn).toISOString() : new Date(Date.now() + 3 * 86_400_000).toISOString())
        : null,
      style: f.style,
      positionDesktop: f.positionDesktop,
      positionMobile: f.positionMobile,
      pages: f.pages,
      priceText: f.priceText || null,
      oldPriceText: f.oldPriceText || null,
    };
  });

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
      imageUrl: ad.imageUrl ?? '',
      showCountdown: ad.showCountdown,
      style: ad.style ?? 'Mini',
      positionDesktop: ad.positionDesktop ?? 'BottomLeft',
      positionMobile: ad.positionMobile ?? 'Bottom',
      pages: [...(ad.pages ?? [])],
      priceText: ad.priceText ?? '',
      oldPriceText: ad.oldPriceText ?? '',
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

    if (f.showCountdown && !f.endsOn) {
      this.formError.set('To show a countdown, set the date and time the offer ends (the "Ends" field).');
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
      imageUrl: f.imageUrl.trim() || null,
      showCountdown: f.showCountdown,
      style: f.style,
      positionDesktop: f.positionDesktop,
      positionMobile: f.positionMobile,
      pages: f.pages,
      priceText: f.style === 'Product' ? f.priceText.trim() || null : null,
      oldPriceText: f.style === 'Product' ? f.oldPriceText.trim() || null : null,
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
