import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { StoreCategoryPill } from '../../models/product';

@Component({
  selector: 'app-store-category-nav',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './store-category-nav.component.html',
  styleUrl: './store-category-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreCategoryNavComponent {
  categories = input.required<readonly StoreCategoryPill[]>();
  activeCategoryId = input('all');

  categoryChange = output<string>();

  protected select(categoryId: string): void {
    if (categoryId === this.activeCategoryId()) {
      return;
    }

    this.categoryChange.emit(categoryId);
  }
}
