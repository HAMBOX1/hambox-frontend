import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { CommunityNewsletterSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { ButtonEditorComponent } from '../../../../../shared/components/admin';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('COMMUNITY_NEWSLETTER', path);

@Component({
  selector: 'app-community-newsletter-settings-form',
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
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.COMMUNITY_NEWSLETTER.DISCORD_BUTTON.LABEL' | translate"
        [label]="localConfig().discordButtonText"
        [url]="localConfig().discordButtonUrl"
        [disabled]="disabled()"
        (labelChange)="setField('discordButtonText', $event)"
        (urlChange)="setField('discordButtonUrl', $event)"
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
export class CommunityNewsletterSettingsFormComponent {
  readonly config = input.required<CommunityNewsletterSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<CommunityNewsletterSectionConfig>();

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'discordTitle', control: 'text', validators: { required: true }, ...KEY('DISCORD_TITLE') },
    { key: 'discordDescription', control: 'textarea', rows: 2, ...KEY('DISCORD_DESCRIPTION') },
    { key: 'newsletterTitle', control: 'text', validators: { required: true }, ...KEY('NEWSLETTER_TITLE') },
    { key: 'newsletterDescription', control: 'textarea', rows: 2, ...KEY('NEWSLETTER_DESCRIPTION') },
    { key: 'newsletterPlaceholder', control: 'text', ...KEY('NEWSLETTER_PLACEHOLDER') },
    { key: 'newsletterButtonText', control: 'text', ...KEY('NEWSLETTER_BUTTON_TEXT') },
    { key: 'newsletterPrivacyText', control: 'text', ...KEY('NEWSLETTER_PRIVACY_TEXT') },
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
