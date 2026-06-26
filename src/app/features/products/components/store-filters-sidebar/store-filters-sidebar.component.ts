import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StorePlatformFilter } from '../../models/product';

@Component({
  selector: 'app-store-filters-sidebar',
  standalone: true,
  templateUrl: './store-filters-sidebar.component.html',
  styleUrl: './store-filters-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreFiltersSidebarComponent {
  platforms = input.required<readonly StorePlatformFilter[]>();
  region = input<string>('Global');
}
