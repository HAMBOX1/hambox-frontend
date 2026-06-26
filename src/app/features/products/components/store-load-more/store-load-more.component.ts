import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-store-load-more',
  standalone: true,
  templateUrl: './store-load-more.component.html',
  styleUrl: './store-load-more.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreLoadMoreComponent {
  loading = input(false);

  loadMore = output<void>();

  protected onLoadMore(): void {
    if (this.loading()) {
      return;
    }

    this.loadMore.emit();
  }
}
