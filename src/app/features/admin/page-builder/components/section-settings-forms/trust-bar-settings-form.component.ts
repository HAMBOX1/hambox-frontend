import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import { AdminIconButtonComponent, MediaPickerComponent } from '../../../../../shared/components/admin';
import { TrustBarSectionConfig, TrustItemConfig } from '../../../../home/section-registry/models/section-config.model';

/**
 * The one settings form that isn't a flat field list — `TrustBarSectionConfig.items` is a
 * reorderable list of {icon, title, description}. Reuses the same `cdkDropList`/`cdkDrag` pattern
 * `page-builder-page.component.html` already uses for section reordering, scoped to this small list.
 */
@Component({
  selector: 'app-trust-bar-settings-form',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    DragDropModule,
    InputTextModule,
    TextareaModule,
    AdminIconButtonComponent,
    MediaPickerComponent,
  ],
  templateUrl: './trust-bar-settings-form.component.html',
  styleUrl: './trust-bar-settings-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustBarSettingsFormComponent {
  readonly config = input.required<TrustBarSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<TrustBarSectionConfig>();

  protected updateItem(index: number, patch: Partial<TrustItemConfig>): void {
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
    const items: TrustItemConfig[] = [
      ...this.config().items,
      { id: crypto.randomUUID(), iconUrl: '', title: '', description: '', sortOrder: this.config().items.length },
    ];
    this.configChange.emit({ items });
  }

  protected removeItem(index: number): void {
    if (this.disabled()) {
      return;
    }
    const items = this.config()
      .items.filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, sortOrder: i }));
    this.configChange.emit({ items });
  }

  protected onDrop(event: CdkDragDrop<readonly TrustItemConfig[]>): void {
    if (this.disabled()) {
      return;
    }
    const items = [...this.config().items];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.configChange.emit({ items: items.map((item, i) => ({ ...item, sortOrder: i })) });
  }
}
