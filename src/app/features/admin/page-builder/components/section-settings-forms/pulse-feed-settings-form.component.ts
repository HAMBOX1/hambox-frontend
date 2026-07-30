import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
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

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly tagToneOptions = TAG_TONE_OPTIONS;

  protected readonly headingFields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'titleAccent', control: 'text', ...KEY('TITLE_ACCENT') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.localConfig() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const updated = { ...this.localConfig(), [key]: value };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }

  protected updateItem(index: number, patch: Partial<PulseFeedItemConfig>): void {
    if (this.disabled()) {
      return;
    }
    const items = this.localConfig().items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    const updated = { ...this.localConfig(), items };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }

  protected addItem(): void {
    if (this.disabled()) {
      return;
    }
    const items: PulseFeedItemConfig[] = [
      ...this.localConfig().items,
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
    const updated = { ...this.localConfig(), items };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }

  protected removeItem(index: number): void {
    if (this.disabled()) {
      return;
    }
    const items = this.localConfig().items.filter((_, i) => i !== index);
    const updated = { ...this.localConfig(), items };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }

  protected onDrop(event: CdkDragDrop<readonly PulseFeedItemConfig[]>): void {
    if (this.disabled()) {
      return;
    }
    const items = [...this.localConfig().items];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    const updated = { ...this.localConfig(), items };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }
}
