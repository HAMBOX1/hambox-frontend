import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { AdminSectionCardComponent } from '../../../../../shared/components/admin';
import { SettingsFieldConfig, TWITTER_CARD_OPTIONS } from '../../models/platform-settings.model';
import { SettingsFieldComponent } from '../settings-field/settings-field.component';

export interface StorefrontNavLinkSetting {
  readonly id: string;
  readonly labelEn: string;
  readonly labelAr: string;
  readonly visible: boolean;
}

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
  imports: [TranslatePipe, FormsModule, AdminSectionCardComponent, SettingsFieldComponent],
  templateUrl: './storefront-settings-editor.component.html',
  styleUrl: './storefront-settings-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontSettingsEditorComponent {
  readonly payload = input.required<Record<string, unknown>>();
  readonly disabled = input(false);
  readonly payloadChange = output<Record<string, unknown>>();

  protected readonly footerFields: SettingsFieldConfig[] = [
    { key: 'companyName', control: 'text', validators: { required: true }, ...storefrontFieldKeys('FOOTER.COMPANY_NAME') },
    { key: 'copyright', control: 'text', ...storefrontFieldKeys('FOOTER.COPYRIGHT') },
    { key: 'supportEmail', control: 'email', validators: { format: 'email' }, ...storefrontFieldKeys('FOOTER.SUPPORT_EMAIL') },
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
    {
      key: 'openGraphImageUrl',
      control: 'media',
      recommendedSize: '1200×630px, JPG/PNG/WebP',
      ...storefrontFieldKeys('SEO.OPEN_GRAPH_IMAGE_URL'),
    },
    {
      key: 'twitterCard',
      control: 'select',
      options: TWITTER_CARD_OPTIONS,
      ...storefrontFieldKeys('SEO.TWITTER_CARD'),
    },
    { key: 'canonicalUrl', control: 'url', validators: { required: true }, ...storefrontFieldKeys('SEO.CANONICAL_URL') },
  ];

  protected readonly navigationLinks = computed<readonly StorefrontNavLinkSetting[]>(() => {
    const value = this.payload()['navigationLinks'];
    return Array.isArray(value) ? (value as StorefrontNavLinkSetting[]) : [];
  });

  protected updateNavLink(id: string, patch: Partial<StorefrontNavLinkSetting>): void {
    const next = structuredClone(this.payload()) as Record<string, unknown>;
    const links = this.navigationLinks().map((link) => (link.id === id ? { ...link, ...patch } : link));
    next['navigationLinks'] = links;
    this.payloadChange.emit(next);
  }

  protected section(key: string): Record<string, unknown> {
    const value = this.payload()[key];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
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
}
