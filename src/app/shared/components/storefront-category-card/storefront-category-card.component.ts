import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StorefrontCategory } from '../../../features/home/models/storefront-home';
import { HamboxLinkDirective } from '../../directives/hambox-link.directive';

@Component({
  selector: 'app-storefront-category-card',
  standalone: true,
  imports: [HamboxLinkDirective],
  templateUrl: './storefront-category-card.component.html',
  styleUrl: './storefront-category-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontCategoryCardComponent {
  category = input.required<StorefrontCategory>();
}
