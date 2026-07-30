import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { HardwareShowcaseSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { ButtonEditorComponent } from '../../../../../shared/components/admin';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('HARDWARE_SHOWCASE', path);

@Component({
  selector: 'app-hardware-showcase-settings-form',
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
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.HARDWARE_SHOWCASE.PRIMARY_BUTTON.LABEL' | translate"
        [label]="config().primaryButtonText"
        [url]="config().primaryButtonUrl"
        [disabled]="disabled()"
        (labelChange)="setField('primaryButtonText', $event)"
        (urlChange)="setField('primaryButtonUrl', $event)"
      />

      <app-button-editor
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.HARDWARE_SHOWCASE.SECONDARY_BUTTON.LABEL' | translate"
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
export class HardwareShowcaseSettingsFormComponent {
  readonly config = input.required<HardwareShowcaseSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<HardwareShowcaseSectionConfig>();

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'eyebrowText', control: 'text', ...KEY('EYEBROW_TEXT') },
    { key: 'badgeText', control: 'text', ...KEY('BADGE_TEXT') },
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'description', control: 'textarea', rows: 3, ...KEY('DESCRIPTION') },
    { key: 'imageUrl', control: 'media', recommendedSize: 'Transparent PNG, 1000×1000px', ...KEY('IMAGE_URL') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.config() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    this.configChange.emit({ ...this.config(), [key]: value });
  }
}
