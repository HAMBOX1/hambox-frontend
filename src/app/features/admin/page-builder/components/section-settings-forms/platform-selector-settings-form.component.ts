import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';

import {
  AdminIconButtonComponent,
  IconPickerComponent,
  RoutePickerComponent,
} from '../../../../../shared/components/admin';
import {
  PlatformSelectorItemConfig,
  PlatformSelectorSectionConfig,
} from '../../../../home/section-registry/models/section-config.model';

@Component({
  selector: 'app-platform-selector-settings-form',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    DragDropModule,
    InputTextModule,
    AdminIconButtonComponent,
    IconPickerComponent,
    RoutePickerComponent,
  ],
  templateUrl: './platform-selector-settings-form.component.html',
  styleUrl: './platform-selector-settings-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformSelectorSettingsFormComponent {
  readonly config = input.required<PlatformSelectorSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<PlatformSelectorSectionConfig>();

  protected updateItem(index: number, patch: Partial<PlatformSelectorItemConfig>): void {
    if (this.disabled()) {
      return;
    }
    const items = this.config().items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    this.configChange.emit({ items });
  }

  protected addItem(): void {
    if (this.disabled()) {
      return;
    }
    const items: PlatformSelectorItemConfig[] = [
      ...this.config().items,
      { id: crypto.randomUUID(), label: '', iconClass: 'pi pi-desktop', linkUrl: '' },
    ];
    this.configChange.emit({ items });
  }

  protected removeItem(index: number): void {
    if (this.disabled()) {
      return;
    }
    const items = this.config().items.filter((_, i) => i !== index);
    this.configChange.emit({ items });
  }

  protected onDrop(event: CdkDragDrop<readonly PlatformSelectorItemConfig[]>): void {
    if (this.disabled()) {
      return;
    }
    const items = [...this.config().items];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.configChange.emit({ items });
  }
}
