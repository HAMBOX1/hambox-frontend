import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { PRIME_ICON_NAMES } from './primeicons-list';

let nextId = 0;

/**
 * Searchable grid over the full PrimeIcons catalog with live preview — replaces free-text icon-class
 * inputs (e.g. `PlatformSelectorItemConfig.iconClass`). Emits the full `pi pi-xxx` class string that
 * every icon-consuming template in this app already expects.
 */
@Component({
  selector: 'app-icon-picker',
  standalone: true,
  imports: [FormsModule, TranslatePipe, InputTextModule, TooltipModule],
  templateUrl: './icon-picker.component.html',
  styleUrl: './icon-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconPickerComponent {
  readonly value = input<string | null>(null);
  readonly disabled = input(false);

  readonly valueChange = output<string | null>();

  protected readonly fieldId = `icon-picker-${++nextId}`;
  protected readonly query = signal('');
  protected readonly open = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected readonly filteredIcons = computed(() => {
    const q = this.query().trim().toLowerCase().replace(/^pi-/, '');
    const list = q ? PRIME_ICON_NAMES.filter((name) => name.includes(q)) : PRIME_ICON_NAMES;
    return list.slice(0, 96);
  });

  protected readonly currentIconClass = computed(() => {
    const v = this.value();
    return v ? (v.startsWith('pi ') ? v : `pi ${v}`) : null;
  });

  protected toggleOpen(): void {
    if (!this.disabled()) {
      this.open.update((o) => !o);
    }
  }

  protected select(name: string): void {
    this.valueChange.emit(`pi ${name}`);
    this.open.set(false);
    this.query.set('');
  }

  protected clear(event: Event): void {
    event.stopPropagation();
    this.valueChange.emit(null);
  }

  protected iconLabel(name: string): string {
    return name.replace('pi-', '').replace(/-/g, ' ');
  }
}
