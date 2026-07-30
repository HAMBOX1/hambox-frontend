import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import {
  AdminIconButtonComponent,
  ButtonEditorComponent,
  MediaPickerComponent,
} from '../../../../../shared/components/admin';
import {
  CollectionShowcaseCardConfig,
  CollectionShowcaseSectionConfig,
} from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('COLLECTION_SHOWCASE', path);

/** Heading fields use the flat `SettingsFieldConfig` renderer (like `HeroSectionSettingsFormComponent`);
 * `cards` is a reorderable list, so it reuses the `cdkDropList`/`cdkDrag` pattern from
 * `TrustBarSettingsFormComponent` scoped to this section's card shape. */
@Component({
  selector: 'app-collection-showcase-settings-form',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    DragDropModule,
    InputTextModule,
    TextareaModule,
    SettingsFieldComponent,
    AdminIconButtonComponent,
    ButtonEditorComponent,
    MediaPickerComponent,
  ],
  templateUrl: './collection-showcase-settings-form.component.html',
  styleUrl: './collection-showcase-settings-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionShowcaseSettingsFormComponent {
  readonly config = input.required<CollectionShowcaseSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<CollectionShowcaseSectionConfig>();

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly headingFields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'titleAccent', control: 'text', ...KEY('TITLE_ACCENT') },
    { key: 'subtitle', control: 'textarea', rows: 2, ...KEY('SUBTITLE') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.localConfig() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const updated = { ...this.localConfig(), [key]: value };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }

  protected updateCard(index: number, patch: Partial<CollectionShowcaseCardConfig>): void {
    if (this.disabled()) {
      return;
    }
    const cards = this.localConfig().cards.map((card, i) => (i === index ? { ...card, ...patch } : card));
    const updated = { ...this.localConfig(), cards };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }

  protected addCard(): void {
    if (this.disabled()) {
      return;
    }
    const cards: CollectionShowcaseCardConfig[] = [
      ...this.localConfig().cards,
      { id: crypto.randomUUID(), imageUrl: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' },
    ];
    const updated = { ...this.localConfig(), cards };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }

  protected removeCard(index: number): void {
    if (this.disabled()) {
      return;
    }
    const cards = this.localConfig().cards.filter((_, i) => i !== index);
    const updated = { ...this.localConfig(), cards };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }

  protected onDrop(event: CdkDragDrop<readonly CollectionShowcaseCardConfig[]>): void {
    if (this.disabled()) {
      return;
    }
    const cards = [...this.localConfig().cards];
    moveItemInArray(cards, event.previousIndex, event.currentIndex);
    const updated = { ...this.localConfig(), cards };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }
}
