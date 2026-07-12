import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-admin-search-bar',
  standalone: true,
  imports: [InputTextModule],
  templateUrl: './admin-search-bar.component.html',
  styleUrl: './admin-search-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSearchBarComponent {
  readonly value = input('');
  readonly placeholder = input('Search…');
  readonly ariaLabel = input('Search');
  readonly shortcutHint = input('');
  readonly searchChange = output<string>();
  readonly cleared = output<void>();

  protected onInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  protected clear(): void {
    this.searchChange.emit('');
    this.cleared.emit();
  }
}
