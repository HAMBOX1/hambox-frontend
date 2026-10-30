import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { RoutePickerComponent } from '../../../../../shared/components/admin/route-picker/route-picker.component';
import { ImageBannerSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('IMAGE_BANNER', path);

@Component({
  selector: 'app-image-banner-settings-form',
  standalone: true,
  imports: [SettingsFieldComponent, RoutePickerComponent, TranslatePipe],
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

      <div class="section-settings-form__link">
        <label>{{ 'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.IMAGE_BANNER.LINK_URL.LABEL' | translate }}</label>
        <app-route-picker [value]="localConfig().linkUrl" [disabled]="disabled()" (valueChange)="setField('linkUrl', $event)" />
      </div>

      <div class="section-settings-form__link">
        <label>{{ 'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.IMAGE_BANNER.BUTTON_URL.LABEL' | translate }}</label>
        <app-route-picker [value]="localConfig().buttonUrl ?? null" [disabled]="disabled()" (valueChange)="setField('buttonUrl', $event)" />
      </div>
    </div>
  `,
  styles: `
    .section-settings-form {
      display: grid;
      gap: 0.85rem;
    }

    .section-settings-form__link {
      display: grid;
      gap: 0.35rem;
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageBannerSettingsFormComponent {
  readonly config = input.required<ImageBannerSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<ImageBannerSectionConfig>();

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'imageUrl', control: 'media', recommendedSize: '1600x420px, JPG/WebP', ...KEY('IMAGE_URL') },
    { key: 'mobileImageUrl', control: 'media', recommendedSize: '800x600px, JPG/WebP', ...KEY('MOBILE_IMAGE_URL') },
    { key: 'altText', control: 'text', ...KEY('ALT_TEXT') },
    { key: 'title', control: 'text', ...KEY('TITLE') },
    { key: 'subtitle', control: 'text', ...KEY('SUBTITLE') },
    { key: 'buttonText', control: 'text', ...KEY('BUTTON_TEXT') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.localConfig() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const nullable = ['mobileImageUrl', 'linkUrl', 'title', 'subtitle', 'buttonText', 'buttonUrl'];
    const next = value === '' && nullable.includes(key) ? null : value;
    const updated = { ...this.localConfig(), [key]: next };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }
}
