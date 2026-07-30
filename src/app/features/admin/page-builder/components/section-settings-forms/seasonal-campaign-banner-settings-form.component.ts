import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SeasonalCampaignBannerConfig } from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { ButtonEditorComponent } from '../../../../../shared/components/admin';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('SEASONAL_CAMPAIGN', path);

@Component({
  selector: 'app-seasonal-campaign-banner-settings-form',
  standalone: true,
  imports: [SettingsFieldComponent, ButtonEditorComponent, TranslatePipe],
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

      <app-button-editor
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.SEASONAL_CAMPAIGN.BUTTON.LABEL' | translate"
        [label]="localConfig().buttonText"
        [url]="localConfig().buttonUrl"
        [disabled]="disabled()"
        (labelChange)="setField('buttonText', $event)"
        (urlChange)="setField('buttonUrl', $event)"
      />
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
export class SeasonalCampaignBannerSettingsFormComponent {
  readonly config = input.required<SeasonalCampaignBannerConfig>();
  readonly disabled = input(false);
  readonly configChange = output<SeasonalCampaignBannerConfig>();

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'eyebrowText', control: 'text', ...KEY('EYEBROW_TEXT') },
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'titleAccent', control: 'text', ...KEY('TITLE_ACCENT') },
    { key: 'subtitle', control: 'textarea', rows: 2, ...KEY('SUBTITLE') },
    { key: 'imageUrl', control: 'media', recommendedSize: '1600×500px, JPG/WebP', ...KEY('IMAGE_URL') },
    { key: 'countdownSeconds', control: 'stepper', min: 0, unit: 'seconds', ...KEY('COUNTDOWN_SECONDS') },
    { key: 'countdownEndsAtUtc', control: 'text', ...KEY('COUNTDOWN_ENDS_AT_UTC') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.localConfig() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const next = value === '' && key === 'countdownEndsAtUtc' ? null : value;
    const updated = { ...this.localConfig(), [key]: next };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }
}
