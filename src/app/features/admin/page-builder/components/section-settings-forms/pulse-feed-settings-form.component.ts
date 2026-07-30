import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { AdminIconButtonComponent, RoutePickerComponent } from '../../../../../shared/components/admin';
import {
  PulseFeedItemConfig,
  PulseFeedSectionConfig,
  PulseFeedTagTone,
} from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('PULSE_FEED', path);

const TAG_TONE_OPTIONS: { label: string; value: PulseFeedTagTone }[] = [
  { label: 'Success', value: 'success' },
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warning' },
  { label: 'Danger', value: 'danger' },
];

/** Heading fields use the flat `SettingsFieldConfig` renderer; `items` is a reorderable list, so it
 * reuses the `cdkDropList`/`cdkDrag` pattern from `TrustBarSettingsFormComponent`. */
@Component({
  selector: 'app-pulse-feed-settings-form',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    DragDropModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    SettingsFieldComponent,
    AdminIconButtonComponent,
    RoutePickerComponent,
  ],
  templateUrl: './pulse-feed-settings-form.component.html',
  styleUrl: './pulse-feed-settings-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PulseFeedSettingsFormComponent {
  readonly config = input.required<PulseFeedSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<PulseFeedSectionConfig>();

  protected readonly tagToneOptions = TAG_TONE_OPTIONS;

  protected readonly headingFields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'titleAccent', control: 'text', ...KEY('TITLE_ACCENT') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.config() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    this.configChange.emit({ ...this.config(), [key]: value });
  }

  protected updateItem(index: number, patch: Partial<PulseFeedItemConfig>): void {
    if (this.disabled()) {
      return;
    }
    const items = this.config().items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    this.configChange.emit({ ...this.config(), items });
  }

  protected addItem(): void {
    if (this.disabled()) {
      return;
    }
    const items: PulseFeedItemConfig[] = [
      ...this.config().items,
      {
        id: crypto.randomUUID(),
        tagText: '',
        tagTone: 'info',
        timestampText: '',
        title: '',
        description: '',
        linkUrl: '',
      },
    ];
    this.configChange.emit({ ...this.config(), items });
  }

  protected removeItem(index: number): void {
    if (this.disabled()) {
      return;
    }
    const items = this.config().items.filter((_, i) => i !== index);
    this.configChange.emit({ ...this.config(), items });
  }

  protected onDrop(event: CdkDragDrop<readonly PulseFeedItemConfig[]>): void {
    if (this.disabled()) {
      return;
    }
    const items = [...this.config().items];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.configChange.emit({ ...this.config(), items });
  }
}
