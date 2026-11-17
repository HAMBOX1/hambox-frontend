import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MediaPickerComponent } from '../../../../../shared/components/admin/media-picker/media-picker.component';
import { InfoBlockSectionConfig } from '../../../../home/section-registry/models/section-config.model';

@Component({
  selector: 'app-info-block-settings-form',
  standalone: true,
  imports: [FormsModule, MediaPickerComponent],
  template: `
    <div class="info-form">
      <label class="info-form__field">
        <span>Title</span>
        <input type="text" maxlength="200" [disabled]="disabled()" [ngModel]="localConfig().title" (ngModelChange)="setField('title', $event)" />
      </label>
      <label class="info-form__field">
        <span>Text</span>
        <textarea rows="6" maxlength="4000" [disabled]="disabled()" [ngModel]="localConfig().body" (ngModelChange)="setField('body', $event)"></textarea>
        <small>Each new line becomes a new paragraph. Use it for instructions, an announcement or a campaign message.</small>
      </label>
      <div class="info-form__field">
        <span>Picture (optional)</span>
        <app-media-picker
          [value]="localConfig().imageUrl || null"
          [disabled]="disabled()"
          recommendedSize="Landscape JPG, PNG or WebP, about 900×600px"
          (valueChange)="setField('imageUrl', $event ?? '')"
        />
      </div>
      <div class="info-form__field">
        <span>Accent colour (border and tint)</span>
        <div class="info-form__color">
          <input type="color" [disabled]="disabled()" [value]="localConfig().accentColor || '#3cdc96'" (input)="setField('accentColor', $any($event.target).value)" />
          <button type="button" [disabled]="disabled() || !localConfig().accentColor" (click)="setField('accentColor', '')">Use the store colour</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .info-form {
      display: grid;
      gap: 0.85rem;
    }

    .info-form__field {
      display: grid;
      gap: 0.35rem;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .info-form__field small {
      color: var(--admin-text-secondary);
      font-weight: 400;
    }

    .info-form__field input[type='text'],
    .info-form__field textarea {
      padding: 0.5rem 0.6rem;
      border: 1px solid var(--admin-border-default, rgba(255, 255, 255, 0.2));
      border-radius: 0.5rem;
      background: var(--admin-bg-surface, transparent);
      color: inherit;
      font: inherit;
    }

    .info-form__color {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .info-form__color button {
      border: none;
      background: none;
      color: var(--admin-accent-blue, #60a5fa);
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoBlockSettingsFormComponent {
  readonly config = input.required<InfoBlockSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<InfoBlockSectionConfig>();

  protected readonly localConfig = linkedSignal(() => this.config());

  protected setField(key: keyof InfoBlockSectionConfig, value: string): void {
    const updated = { ...this.localConfig(), [key]: value };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }
}
