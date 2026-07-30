import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { HeroSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { ButtonEditorComponent } from '../../../../../shared/components/admin';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('HERO', path);

@Component({
  selector: 'app-hero-section-settings-form',
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
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.HERO.PRIMARY_BUTTON.LABEL' | translate"
        [label]="config().primaryButtonText"
        [url]="config().primaryButtonUrl"
        [disabled]="disabled()"
        (labelChange)="setField('primaryButtonText', $event)"
        (urlChange)="setField('primaryButtonUrl', $event)"
      />

      <app-button-editor
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.HERO.SECONDARY_BUTTON.LABEL' | translate"
        [label]="config().secondaryButtonText"
        [url]="config().secondaryButtonUrl"
        [disabled]="disabled()"
        (labelChange)="setField('secondaryButtonText', $event)"
        (urlChange)="setField('secondaryButtonUrl', $event)"
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
export class HeroSectionSettingsFormComponent {
  readonly config = input.required<HeroSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<HeroSectionConfig>();

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'subtitle', control: 'textarea', rows: 2, ...KEY('SUBTITLE') },
    { key: 'backgroundImageUrl', control: 'media', recommendedSize: '1920×800px, JPG/WebP', ...KEY('BACKGROUND_IMAGE_URL') },
    { key: 'overlayImageUrl', control: 'media', recommendedSize: 'Transparent PNG', ...KEY('OVERLAY_IMAGE_URL') },
    { key: 'overlayOpacity', control: 'slider', min: 0, max: 1, step: 0.05, ...KEY('OVERLAY_OPACITY') },
    { key: 'badgeText', control: 'text', ...KEY('BADGE_TEXT') },
    { key: 'badgeColor', control: 'color', ...KEY('BADGE_COLOR') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.config() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const next = value === '' && this.isNullable(key) ? null : value;
    this.configChange.emit({ ...this.config(), [key]: next });
  }

  private isNullable(key: string): boolean {
    return key === 'overlayImageUrl';
  }
}
