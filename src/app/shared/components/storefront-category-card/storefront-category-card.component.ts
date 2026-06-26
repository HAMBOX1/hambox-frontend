import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorefrontCategory } from '../../../features/home/models/storefront-home';

@Component({
  selector: 'app-storefront-category-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './storefront-category-card.component.html',
  styleUrl: './storefront-category-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontCategoryCardComponent {
  category = input.required<StorefrontCategory>();
}
