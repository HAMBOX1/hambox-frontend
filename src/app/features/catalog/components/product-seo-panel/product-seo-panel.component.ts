import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AdminEmptyStateComponent, AdminSectionCardComponent } from '../../../../shared/components/admin';

@Component({
  selector: 'app-product-seo-panel',
  standalone: true,
  imports: [AdminSectionCardComponent, AdminEmptyStateComponent],
  templateUrl: './product-seo-panel.component.html',
  styleUrl: './product-seo-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSeoPanelComponent {}
