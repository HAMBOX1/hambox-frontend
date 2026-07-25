import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

import { AdminSectionCardComponent } from '../../../../../shared/components/admin';
import {
  ANNOUNCEMENT_POSITION_OPTIONS,
  CATEGORY_SORT_OPTIONS,
  DISPLAY_STYLE_OPTIONS,
  FLASH_DEALS_SORT_OPTIONS,
  SettingsFieldConfig,
  TWITTER_CARD_OPTIONS,
} from '../../models/platform-settings.model';
import { SettingsFieldComponent } from '../settings-field/settings-field.component';

/** Storefront translations live at ADMIN.SETTINGS.STOREFRONT.* (a sibling of ADMIN.SETTINGS.FIELDS.*,
 * matching how TITLE_CARD/DESCRIPTION_CARD are referenced directly in the template) — the shared
 * `fieldKeys()` helper always prefixes with FIELDS., so it doesn't fit here. */
function storefrontFieldKeys(path: string): { labelKey: string; helperKey: string; tooltipKey: string } {
  const base = `ADMIN.SETTINGS.STOREFRONT.${path}`;
  return { labelKey: `${base}.LABEL`, helperKey: `${base}.HELP`, tooltipKey: `${base}.TOOLTIP` };
}

@Component({
  selector: 'app-storefront-settings-editor',
  standalone: true,
  imports: [TranslatePipe, ButtonModule, AdminSectionCardComponent, SettingsFieldComponent],
  templateUrl: './storefront-settings-editor.component.html',
  styleUrl: './storefront-settings-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontSettingsEditorComponent {
  readonly payload = input.required<Record<string, unknown>>();
  readonly disabled = input(false);
  readonly payloadChange = output<Record<string, unknown>>();

  protected readonly heroFields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', validators: { required: true }, ...storefrontFieldKeys('HERO.TITLE') },
    { key: 'subtitle', control: 'textarea', rows: 3, ...storefrontFieldKeys('HERO.SUBTITLE') },
    { key: 'primaryButtonText', control: 'text', ...storefrontFieldKeys('HERO.PRIMARY_BUTTON_TEXT') },
    {
      key: 'primaryButtonUrl',
      control: 'url',
      ...storefrontFieldKeys('HERO.PRIMARY_BUTTON_URL'),
    },
    { key: 'secondaryButtonText', control: 'text', ...storefrontFieldKeys('HERO.SECONDARY_BUTTON_TEXT') },
    {
      key: 'secondaryButtonUrl',
      control: 'url',
      ...storefrontFieldKeys('HERO.SECONDARY_BUTTON_URL'),
    },
    {
      key: 'backgroundImageUrl',
      control: 'url',
      validators: { required: true },
      ...storefrontFieldKeys('HERO.BACKGROUND_IMAGE_URL'),
    },
    { key: 'overlayImageUrl', control: 'url', ...storefrontFieldKeys('HERO.OVERLAY_IMAGE_URL') },
    {
      key: 'overlayOpacity',
      control: 'slider',
      min: 0,
      max: 1,
      step: 0.05,
      ...storefrontFieldKeys('HERO.OVERLAY_OPACITY'),
    },
    { key: 'badgeText', control: 'text', ...storefrontFieldKeys('HERO.BADGE_TEXT') },
    { key: 'badgeColor', control: 'color', ...storefrontFieldKeys('HERO.BADGE_COLOR') },
    { key: 'visible', control: 'toggle', ...storefrontFieldKeys('HERO.VISIBLE') },
  ];

  protected readonly announcementBarFields: SettingsFieldConfig[] = [
    { key: 'text', control: 'textarea', rows: 2, validators: { required: true }, ...storefrontFieldKeys('ANNOUNCEMENT.TEXT') },
    { key: 'link', control: 'url', ...storefrontFieldKeys('ANNOUNCEMENT.LINK') },
    { key: 'buttonText', control: 'text', ...storefrontFieldKeys('ANNOUNCEMENT.BUTTON_TEXT') },
    { key: 'backgroundColor', control: 'color', ...storefrontFieldKeys('ANNOUNCEMENT.BACKGROUND_COLOR') },
    { key: 'textColor', control: 'color', ...storefrontFieldKeys('ANNOUNCEMENT.TEXT_COLOR') },
    {
      key: 'displayPosition',
      control: 'radio',
      options: ANNOUNCEMENT_POSITION_OPTIONS,
      ...storefrontFieldKeys('ANNOUNCEMENT.DISPLAY_POSITION'),
    },
    { key: 'visible', control: 'toggle', ...storefrontFieldKeys('ANNOUNCEMENT.VISIBLE') },
  ];

  protected readonly promotionalBannerFields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', validators: { required: true }, ...storefrontFieldKeys('PROMO_BANNER.TITLE') },
    { key: 'subtitle', control: 'textarea', rows: 2, ...storefrontFieldKeys('PROMO_BANNER.SUBTITLE') },
    { key: 'imageUrl', control: 'url', validators: { required: true }, ...storefrontFieldKeys('PROMO_BANNER.IMAGE_URL') },
    { key: 'buttonText', control: 'text', ...storefrontFieldKeys('PROMO_BANNER.BUTTON_TEXT') },
    { key: 'buttonUrl', control: 'url', ...storefrontFieldKeys('PROMO_BANNER.BUTTON_URL') },
    {
      key: 'countdownSeconds',
      control: 'stepper',
      min: 0,
      unit: 'seconds',
      ...storefrontFieldKeys('PROMO_BANNER.COUNTDOWN_SECONDS'),
    },
    {
      key: 'countdownEndsAtUtc',
      control: 'text',
      ...storefrontFieldKeys('PROMO_BANNER.COUNTDOWN_ENDS_AT_UTC'),
    },
    { key: 'backgroundColor', control: 'color', ...storefrontFieldKeys('PROMO_BANNER.BACKGROUND_COLOR') },
    { key: 'visible', control: 'toggle', ...storefrontFieldKeys('PROMO_BANNER.VISIBLE') },
  ];

  protected readonly flashDealsFields: SettingsFieldConfig[] = [
    { key: 'sectionTitle', control: 'text', ...storefrontFieldKeys('FLASH_DEALS.SECTION_TITLE') },
    { key: 'sectionSubtitle', control: 'text', ...storefrontFieldKeys('FLASH_DEALS.SECTION_SUBTITLE') },
    {
      key: 'maximumProducts',
      control: 'stepper',
      min: 1,
      max: 24,
      ...storefrontFieldKeys('FLASH_DEALS.MAXIMUM_PRODUCTS'),
    },
    {
      key: 'sortMethod',
      control: 'select',
      options: FLASH_DEALS_SORT_OPTIONS,
      ...storefrontFieldKeys('FLASH_DEALS.SORT_METHOD'),
    },
    {
      key: 'countdownSeconds',
      control: 'stepper',
      min: 0,
      unit: 'seconds',
      ...storefrontFieldKeys('FLASH_DEALS.COUNTDOWN_SECONDS'),
    },
    {
      key: 'countdownDateUtc',
      control: 'text',
      ...storefrontFieldKeys('FLASH_DEALS.COUNTDOWN_DATE_UTC'),
    },
    { key: 'countdownEnabled', control: 'toggle', ...storefrontFieldKeys('FLASH_DEALS.COUNTDOWN_ENABLED') },
    { key: 'visible', control: 'toggle', ...storefrontFieldKeys('FLASH_DEALS.VISIBLE') },
  ];

  protected readonly featuredCollectionsFields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', ...storefrontFieldKeys('FEATURED_COLLECTIONS.TITLE') },
    { key: 'subtitle', control: 'text', ...storefrontFieldKeys('FEATURED_COLLECTIONS.SUBTITLE') },
    {
      key: 'maximumItems',
      control: 'stepper',
      min: 1,
      max: 24,
      ...storefrontFieldKeys('FEATURED_COLLECTIONS.MAXIMUM_ITEMS'),
    },
    {
      key: 'displayStyle',
      control: 'radio',
      options: DISPLAY_STYLE_OPTIONS,
      ...storefrontFieldKeys('FEATURED_COLLECTIONS.DISPLAY_STYLE'),
    },
    { key: 'visible', control: 'toggle', ...storefrontFieldKeys('FEATURED_COLLECTIONS.VISIBLE') },
  ];

  protected readonly popularCategoriesFields: SettingsFieldConfig[] = [
    { key: 'sectionTitle', control: 'text', ...storefrontFieldKeys('POPULAR_CATEGORIES.SECTION_TITLE') },
    {
      key: 'maximumCategories',
      control: 'stepper',
      min: 1,
      max: 24,
      ...storefrontFieldKeys('POPULAR_CATEGORIES.MAXIMUM_CATEGORIES'),
    },
    {
      key: 'sortOrder',
      control: 'select',
      options: CATEGORY_SORT_OPTIONS,
      ...storefrontFieldKeys('POPULAR_CATEGORIES.SORT_ORDER'),
    },
    { key: 'visible', control: 'toggle', ...storefrontFieldKeys('POPULAR_CATEGORIES.VISIBLE') },
  ];

  protected readonly featuredProductFields: SettingsFieldConfig[] = [
    { key: 'productId', control: 'text', ...storefrontFieldKeys('FEATURED_PRODUCT.PRODUCT_ID') },
    { key: 'badge', control: 'text', ...storefrontFieldKeys('FEATURED_PRODUCT.BADGE') },
    { key: 'callToAction', control: 'text', ...storefrontFieldKeys('FEATURED_PRODUCT.CALL_TO_ACTION') },
    { key: 'visible', control: 'toggle', ...storefrontFieldKeys('FEATURED_PRODUCT.VISIBLE') },
  ];

  protected readonly footerFields: SettingsFieldConfig[] = [
    { key: 'companyName', control: 'text', validators: { required: true }, ...storefrontFieldKeys('FOOTER.COMPANY_NAME') },
    { key: 'copyright', control: 'text', ...storefrontFieldKeys('FOOTER.COPYRIGHT') },
    {
      key: 'supportEmail',
      control: 'email',
      validators: { format: 'email' },
      ...storefrontFieldKeys('FOOTER.SUPPORT_EMAIL'),
    },
    { key: 'supportPhone', control: 'text', ...storefrontFieldKeys('FOOTER.SUPPORT_PHONE') },
    { key: 'address', control: 'textarea', rows: 2, ...storefrontFieldKeys('FOOTER.ADDRESS') },
    { key: 'workingHours', control: 'text', ...storefrontFieldKeys('FOOTER.WORKING_HOURS') },
    { key: 'facebookUrl', control: 'url', ...storefrontFieldKeys('FOOTER.FACEBOOK_URL') },
    { key: 'instagramUrl', control: 'url', ...storefrontFieldKeys('FOOTER.INSTAGRAM_URL') },
    { key: 'xUrl', control: 'url', ...storefrontFieldKeys('FOOTER.X_URL') },
    { key: 'discordUrl', control: 'url', ...storefrontFieldKeys('FOOTER.DISCORD_URL') },
    { key: 'telegramUrl', control: 'url', ...storefrontFieldKeys('FOOTER.TELEGRAM_URL') },
    { key: 'youTubeUrl', control: 'url', ...storefrontFieldKeys('FOOTER.YOUTUBE_URL') },
    { key: 'tikTokUrl', control: 'url', ...storefrontFieldKeys('FOOTER.TIKTOK_URL') },
    { key: 'whatsAppUrl', control: 'url', ...storefrontFieldKeys('FOOTER.WHATSAPP_URL') },
  ];

  protected readonly seoFields: SettingsFieldConfig[] = [
    { key: 'defaultMetaTitle', control: 'text', ...storefrontFieldKeys('SEO.DEFAULT_META_TITLE') },
    { key: 'defaultMetaDescription', control: 'textarea', rows: 3, ...storefrontFieldKeys('SEO.DEFAULT_META_DESCRIPTION') },
    { key: 'openGraphImageUrl', control: 'url', ...storefrontFieldKeys('SEO.OPEN_GRAPH_IMAGE_URL') },
    {
      key: 'twitterCard',
      control: 'select',
      options: TWITTER_CARD_OPTIONS,
      ...storefrontFieldKeys('SEO.TWITTER_CARD'),
    },
    { key: 'canonicalUrl', control: 'url', validators: { required: true }, ...storefrontFieldKeys('SEO.CANONICAL_URL') },
  ];

  protected readonly trustItemFields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', validators: { required: true }, ...storefrontFieldKeys('TRUST_ITEM.TITLE') },
    { key: 'description', control: 'textarea', rows: 2, ...storefrontFieldKeys('TRUST_ITEM.DESCRIPTION') },
    { key: 'iconUrl', control: 'url', ...storefrontFieldKeys('TRUST_ITEM.ICON_URL') },
    { key: 'sortOrder', control: 'stepper', min: 1, ...storefrontFieldKeys('TRUST_ITEM.SORT_ORDER') },
    { key: 'visible', control: 'toggle', ...storefrontFieldKeys('TRUST_ITEM.VISIBLE') },
  ];

  protected section(key: string): Record<string, unknown> {
    const value = this.payload()[key];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  protected trustItems(): Record<string, unknown>[] {
    const items = this.payload()['trustBar'];
    return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
  }

  protected previewText(sectionKey: string, key: string): string {
    const value = this.section(sectionKey)[key];
    return value == null ? '' : String(value);
  }

  protected setSectionField(sectionKey: string, field: string, value: unknown): void {
    const next = structuredClone(this.payload()) as Record<string, unknown>;
    const section = {
      ...((next[sectionKey] as Record<string, unknown> | undefined) ?? {}),
      [field]: value,
    };
    next[sectionKey] = section;
    this.payloadChange.emit(next);
  }

  protected setTrustField(index: number, field: string, value: unknown): void {
    const next = structuredClone(this.payload()) as Record<string, unknown>;
    const items = Array.isArray(next['trustBar'])
      ? [...(next['trustBar'] as Record<string, unknown>[])]
      : [];
    items[index] = { ...items[index], [field]: value };
    next['trustBar'] = items;
    this.payloadChange.emit(next);
  }

  protected addTrustItem(): void {
    const next = structuredClone(this.payload()) as Record<string, unknown>;
    const items = Array.isArray(next['trustBar'])
      ? [...(next['trustBar'] as Record<string, unknown>[])]
      : [];
    items.push({
      id: `trust-${Date.now()}`,
      iconUrl: '/assets/images/trust/instant-delivery.svg',
      title: 'New trust item',
      description: '',
      sortOrder: items.length + 1,
      visible: true,
    });
    next['trustBar'] = items;
    this.payloadChange.emit(next);
  }

  protected removeTrustItem(index: number): void {
    const next = structuredClone(this.payload()) as Record<string, unknown>;
    const items = Array.isArray(next['trustBar'])
      ? [...(next['trustBar'] as Record<string, unknown>[])]
      : [];
    items.splice(index, 1);
    next['trustBar'] = items;
    this.payloadChange.emit(next);
  }
}
