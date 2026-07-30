import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AiAssistantSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { ButtonEditorComponent } from '../../../../../shared/components/admin';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('AI_ASSISTANT', path);

@Component({
  selector: 'app-ai-assistant-settings-form',
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
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.AI_ASSISTANT.BUTTON.LABEL' | translate"
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
export class AiAssistantSettingsFormComponent {
  readonly config = input.required<AiAssistantSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<AiAssistantSectionConfig>();

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'statusText', control: 'text', ...KEY('STATUS_TEXT') },
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'titleAccent', control: 'text', ...KEY('TITLE_ACCENT') },
    { key: 'description', control: 'textarea', rows: 3, ...KEY('DESCRIPTION') },
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
