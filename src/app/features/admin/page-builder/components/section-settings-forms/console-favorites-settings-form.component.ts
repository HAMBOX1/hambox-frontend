import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';

import {
  AdminIconButtonComponent,
  ButtonEditorComponent,
  MediaPickerComponent,
} from '../../../../../shared/components/admin';
import {
  ConsoleFavoriteCardConfig,
  ConsoleFavoritesSectionConfig,
} from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('CONSOLE_FAVORITES', path);

/** `tags` is stored as a string array but edited as one comma-separated text field — a full nested
 * array-of-arrays editor would be overkill for a short tag list. */
@Component({
  selector: 'app-console-favorites-settings-form',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    DragDropModule,
    InputTextModule,
    CheckboxModule,
    SettingsFieldComponent,
    AdminIconButtonComponent,
    ButtonEditorComponent,
    MediaPickerComponent,
  ],
  templateUrl: './console-favorites-settings-form.component.html',
  styleUrl: './console-favorites-settings-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsoleFavoritesSettingsFormComponent {
  readonly config = input.required<ConsoleFavoritesSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<ConsoleFavoritesSectionConfig>();

  protected readonly headingFields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.config() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    this.configChange.emit({ ...this.config(), [key]: value });
  }

  protected tagsText(card: ConsoleFavoriteCardConfig): string {
    return card.tags.join(', ');
  }

  protected updateCard(index: number, patch: Partial<ConsoleFavoriteCardConfig>): void {
    if (this.disabled()) {
      return;
    }
    const cards = this.config().cards.map((card, i) => (i === index ? { ...card, ...patch } : card));
    this.configChange.emit({ ...this.config(), cards });
  }

  protected updateTags(index: number, value: string): void {
    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    this.updateCard(index, { tags });
  }

  protected addCard(): void {
    if (this.disabled()) {
      return;
    }
    const cards: ConsoleFavoriteCardConfig[] = [
      ...this.config().cards,
      {
        id: crypto.randomUUID(),
        imageUrl: '',
        title: '',
        tags: [],
        badgeText: '',
        buttonText: '',
        buttonUrl: '',
        featured: false,
      },
    ];
    this.configChange.emit({ ...this.config(), cards });
  }

  protected removeCard(index: number): void {
    if (this.disabled()) {
      return;
    }
    const cards = this.config().cards.filter((_, i) => i !== index);
    this.configChange.emit({ ...this.config(), cards });
  }

  protected onDrop(event: CdkDragDrop<readonly ConsoleFavoriteCardConfig[]>): void {
    if (this.disabled()) {
      return;
    }
    const cards = [...this.config().cards];
    moveItemInArray(cards, event.previousIndex, event.currentIndex);
    this.configChange.emit({ ...this.config(), cards });
  }
}
