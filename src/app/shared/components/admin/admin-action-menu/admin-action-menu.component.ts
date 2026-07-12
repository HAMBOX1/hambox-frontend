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
  readonly disabled = input(false);

  private readonly menu = viewChild<Menu>('menu');

  protected toggle(event: Event): void {
    this.menu()?.toggle(event);
  }
}
