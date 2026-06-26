import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-product-catalog-toolbar',
  standalone: true,
  imports: [RouterLink, ButtonModule, InputTextModule],
  templateUrl: './product-catalog-toolbar.component.html',
  styleUrl: './product-catalog-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogToolbarComponent {
  readonly title = input('Product Catalog');
  readonly subtitle = input('');
  readonly searchTerm = input('');
  readonly needsAttentionCount = input(12);

  readonly searchChange = output<string>();

  protected readonly platformFilters = [
    'Xbox Live',
    'PlayStation',
    'Steam',
    'Epic Games',
    'Switch',
  ] as const;

  protected readonly sourceFilters = [
    'All Sources',
    'Manual Intake',
    'Direct API',
    'Reseller Pool',
  ] as const;

  protected onSearchInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }
}
