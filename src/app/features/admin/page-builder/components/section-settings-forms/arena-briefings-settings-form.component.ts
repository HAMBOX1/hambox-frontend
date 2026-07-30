import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';

import {
  AdminIconButtonComponent,
  ButtonEditorComponent,
  MediaPickerComponent,
  RoutePickerComponent,
} from '../../../../../shared/components/admin';
import {
  ArenaBriefingSideItemConfig,
  ArenaBriefingsSectionConfig,
} from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('ARENA_BRIEFINGS', path);

/** Heading + featured-story fields use the flat `SettingsFieldConfig` renderer; `sideItems` is a
 * reorderable list, so it reuses the `cdkDropList`/`cdkDrag` pattern from `TrustBarSettingsFormComponent`.
 * Item order also determines left/right column placement (first half left, rest right). */
@Component({
  selector: 'app-arena-briefings-settings-form',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    DragDropModule,
    InputTextModule,
    SettingsFieldComponent,
    AdminIconButtonComponent,
    ButtonEditorComponent,
    MediaPickerComponent,
    RoutePickerComponent,
  ],
  templateUrl: './arena-briefings-settings-form.component.html',
  styleUrl: './arena-briefings-settings-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArenaBriefingsSettingsFormComponent {
  readonly config = input.required<ArenaBriefingsSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<ArenaBriefingsSectionConfig>();

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'featuredTagText', control: 'text', ...KEY('FEATURED_TAG_TEXT') },
    { key: 'featuredImageUrl', control: 'media', recommendedSize: '1200×800px, JPG/WebP', ...KEY('FEATURED_IMAGE_URL') },
    { key: 'featuredTitle', control: 'text', ...KEY('FEATURED_TITLE') },
    { key: 'featuredDescription', control: 'textarea', rows: 2, ...KEY('FEATURED_DESCRIPTION') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.config() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    this.configChange.emit({ ...this.config(), [key]: value });
  }

  protected updateItem(index: number, patch: Partial<ArenaBriefingSideItemConfig>): void {
    if (this.disabled()) {
      return;
    }
    const sideItems = this.config().sideItems.map((item, i) => (i === index ? { ...item, ...patch } : item));
    this.configChange.emit({ ...this.config(), sideItems });
  }

  protected addItem(): void {
    if (this.disabled()) {
      return;
    }
    const sideItems: ArenaBriefingSideItemConfig[] = [
      ...this.config().sideItems,
      { id: crypto.randomUUID(), tagText: '', title: '', imageUrl: '', linkUrl: '' },
    ];
    this.configChange.emit({ ...this.config(), sideItems });
  }

  protected removeItem(index: number): void {
    if (this.disabled()) {
      return;
    }
    const sideItems = this.config().sideItems.filter((_, i) => i !== index);
    this.configChange.emit({ ...this.config(), sideItems });
  }

  protected onDrop(event: CdkDragDrop<readonly ArenaBriefingSideItemConfig[]>): void {
    if (this.disabled()) {
      return;
    }
    const sideItems = [...this.config().sideItems];
    moveItemInArray(sideItems, event.previousIndex, event.currentIndex);
    this.configChange.emit({ ...this.config(), sideItems });
  }
}
