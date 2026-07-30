import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { HeroGridShowcaseConfig } from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { ButtonEditorComponent } from '../../../../../shared/components/admin';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('GRID_SHOWCASE', path);

@Component({
  selector: 'app-hero-grid-showcase-settings-form',
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
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.GRID_SHOWCASE.PRIMARY_BUTTON.LABEL' | translate"
        [label]="localConfig().primaryButtonText"
        [url]="localConfig().primaryButtonUrl"
        [disabled]="disabled()"
        (labelChange)="setField('primaryButtonText', $event)"
        (urlChange)="setField('primaryButtonUrl', $event)"
      />

      <app-button-editor
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.GRID_SHOWCASE.SECONDARY_BUTTON.LABEL' | translate"
        [label]="localConfig().secondaryButtonText"
        [url]="localConfig().secondaryButtonUrl"
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
export class HeroGridShowcaseSettingsFormComponent {
  readonly config = input.required<HeroGridShowcaseConfig>();
  readonly disabled = input(false);
  readonly configChange = output<HeroGridShowcaseConfig>();

  /** Local accumulating copy of `config`, seeded once per mount — every `setField` merges onto
   * this instead of the frozen `config()` input, so successive edits within the same section don't
   * clobber each other (the previous "spread from `config()` on every keystroke" pattern only ever
   * kept the last-edited field, since `config()` itself is never re-fed after mount). */
  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'badgeText', control: 'text', ...KEY('BADGE_TEXT') },
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'titleAccent', control: 'text', ...KEY('TITLE_ACCENT') },
    { key: 'subtitle', control: 'textarea', rows: 2, ...KEY('SUBTITLE') },
    { key: 'backgroundImageUrl', control: 'media', recommendedSize: '1920×800px, JPG/WebP', ...KEY('BACKGROUND_IMAGE_URL') },
    { key: 'overlayImageUrl', control: 'media', recommendedSize: 'Transparent PNG', ...KEY('OVERLAY_IMAGE_URL') },
    { key: 'overlayOpacity', control: 'slider', min: 0, max: 1, step: 0.05, ...KEY('OVERLAY_OPACITY') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.localConfig() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const next = value === '' && this.isNullable(key) ? null : value;
    const updated = { ...this.localConfig(), [key]: next };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }

  private isNullable(key: string): boolean {
    return key === 'overlayImageUrl';
  }
}
