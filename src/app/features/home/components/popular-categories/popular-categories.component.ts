import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { StorefrontCategoryCardComponent } from '../../../../shared/components/storefront-category-card/storefront-category-card.component';
import { StorefrontCategory } from '../../models/storefront-home';

@Component({
  selector: 'app-popular-categories',
  standalone: true,
  imports: [StorefrontCategoryCardComponent, ScrollRevealDirective],
  templateUrl: './popular-categories.component.html',
  styleUrl: './popular-categories.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopularCategoriesComponent {
  categories = input.required<readonly StorefrontCategory[]>();
  sectionTitle = input('Popular Categories');
}
