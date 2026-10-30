import { ChangeDetectionStrategy, Component, input, viewChild } from '@angular/core';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-admin-action-menu',
  standalone: true,
  imports: [MenuModule],
  templateUrl: './admin-action-menu.component.html',
  styleUrl: './admin-action-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminActionMenuComponent {
  readonly items = input.required<MenuItem[]>();
  readonly label = input('Actions');
  /** PrimeIcons class of the trigger button (defaults to the vertical ellipsis). */
  readonly icon = input('pi pi-ellipsis-v');
  readonly disabled = input(false);

  private readonly menu = viewChild<Menu>('menu');

  toggle(event: Event): void {
    this.menu()?.toggle(event);
  }
}
