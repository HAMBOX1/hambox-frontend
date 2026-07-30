import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FooterSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('FOOTER', path);

@Component({
  selector: 'app-footer-settings-form',
  standalone: true,
  imports: [SettingsFieldComponent],
  template: `
    <div class="section-settings-form">
      @for (field of fields; track field.key) {
        <app-settings-field
          [field]="field"
          [value]="fieldValue(field.key)"
          [disabled]="disabled()"
          (valueChange)="setField(field.key, $event)"
        />
      }
    </div>
  `,
  styles: `
    .section-settings-form {
      display: grid;
      gap: 0.85rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterSettingsFormComponent {
  readonly config = input.required<FooterSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<FooterSectionConfig>();

  private static readonly NULLABLE_KEYS = new Set([
    'facebookUrl',
    'instagramUrl',
    'xUrl',
    'discordUrl',
    'telegramUrl',
    'youTubeUrl',
    'tikTokUrl',
    'whatsAppUrl',
  ]);

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'companyName', control: 'text', validators: { required: true }, ...KEY('COMPANY_NAME') },
    { key: 'copyright', control: 'text', ...KEY('COPYRIGHT') },
    { key: 'supportEmail', control: 'email', validators: { format: 'email' }, ...KEY('SUPPORT_EMAIL') },
    { key: 'supportPhone', control: 'text', ...KEY('SUPPORT_PHONE') },
    { key: 'address', control: 'textarea', rows: 2, ...KEY('ADDRESS') },
    { key: 'workingHours', control: 'text', ...KEY('WORKING_HOURS') },
    { key: 'facebookUrl', control: 'url', group: 'SOCIAL', ...KEY('FACEBOOK_URL') },
    { key: 'instagramUrl', control: 'url', group: 'SOCIAL', ...KEY('INSTAGRAM_URL') },
    { key: 'xUrl', control: 'url', group: 'SOCIAL', ...KEY('X_URL') },
    { key: 'discordUrl', control: 'url', group: 'SOCIAL', ...KEY('DISCORD_URL') },
    { key: 'telegramUrl', control: 'url', group: 'SOCIAL', ...KEY('TELEGRAM_URL') },
    { key: 'youTubeUrl', control: 'url', group: 'SOCIAL', ...KEY('YOUTUBE_URL') },
    { key: 'tikTokUrl', control: 'url', group: 'SOCIAL', ...KEY('TIKTOK_URL') },
    { key: 'whatsAppUrl', control: 'url', group: 'SOCIAL', ...KEY('WHATSAPP_URL') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.config() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const next = value === '' && FooterSettingsFormComponent.NULLABLE_KEYS.has(key) ? null : value;
    this.configChange.emit({ ...this.config(), [key]: next });
  }
}
