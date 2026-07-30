import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { HeroEditorialSpotlightConfig } from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { ButtonEditorComponent } from '../../../../../shared/components/admin';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('EDITORIAL_SPOTLIGHT', path);

@Component({
  selector: 'app-hero-editorial-spotlight-settings-form',
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
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.EDITORIAL_SPOTLIGHT.VIEW_ALL_BUTTON.LABEL' | translate"
        [label]="localConfig().viewAllText"
        [url]="localConfig().viewAllUrl"
        [disabled]="disabled()"
        (labelChange)="setField('viewAllText', $event)"
        (urlChange)="setField('viewAllUrl', $event)"
      />

      <app-button-editor
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.EDITORIAL_SPOTLIGHT.FEATURED_BUTTON.LABEL' | translate"
        [label]="localConfig().featuredButtonText"
        [url]="localConfig().featuredButtonUrl"
        [disabled]="disabled()"
        (labelChange)="setField('featuredButtonText', $event)"
        (urlChange)="setField('featuredButtonUrl', $event)"
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
export class HeroEditorialSpotlightSettingsFormComponent {
  readonly config = input.required<HeroEditorialSpotlightConfig>();
  readonly disabled = input(false);
  readonly configChange = output<HeroEditorialSpotlightConfig>();

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'eyebrowText', control: 'text', ...KEY('EYEBROW_TEXT') },
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'featuredBadgeText', control: 'text', ...KEY('FEATURED_BADGE_TEXT') },
    { key: 'featuredImageUrl', control: 'media', recommendedSize: '1200×900px, JPG/WebP', ...KEY('FEATURED_IMAGE_URL') },
    { key: 'featuredTitle', control: 'text', ...KEY('FEATURED_TITLE') },
    { key: 'featuredSubtitle', control: 'textarea', rows: 2, ...KEY('FEATURED_SUBTITLE') },
    { key: 'secondaryImageUrl', control: 'media', recommendedSize: '800×600px, JPG/WebP', ...KEY('SECONDARY_IMAGE_URL') },
    { key: 'secondaryLabel', control: 'text', ...KEY('SECONDARY_LABEL') },
    { key: 'tertiaryImageUrl', control: 'media', recommendedSize: '800×600px, JPG/WebP', ...KEY('TERTIARY_IMAGE_URL') },
    { key: 'tertiaryLabel', control: 'text', ...KEY('TERTIARY_LABEL') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.localConfig() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const updated = { ...this.localConfig(), [key]: value };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }
}
