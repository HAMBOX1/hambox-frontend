import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
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

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly headingFields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'subtitle', control: 'text', ...KEY('SUBTITLE') },
  ];

  protected readonly viewAllFields: SettingsFieldConfig[] = [
    { key: 'viewAllText', control: 'text', ...KEY('VIEW_ALL_TEXT') },
    { key: 'viewAllUrl', control: 'text', ...KEY('VIEW_ALL_URL') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.localConfig() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const updated = { ...this.localConfig(), [key]: value };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }

  protected updateCard(index: number, patch: Partial<ConsoleFavoriteCardConfig>): void {
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
    const cards: ConsoleFavoriteCardConfig[] = [
      ...this.localConfig().cards,
      {
        id: crypto.randomUUID(),
        imageUrl: '',
        title: '',
        platform: '',
        genre: '',
        price: '',
        badgeText: '',
        buttonText: '',
        buttonUrl: '',
        featured: false,
      },
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

  protected onDrop(event: CdkDragDrop<readonly ConsoleFavoriteCardConfig[]>): void {
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
