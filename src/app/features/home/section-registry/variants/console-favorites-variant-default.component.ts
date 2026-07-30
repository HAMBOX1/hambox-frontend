import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ConsoleFavoritesSectionComponent } from '../../components/console-favorites-section/console-favorites-section.component';
import { ConsoleFavoritesSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-console-favorites-variant-default',
  standalone: true,
  imports: [ConsoleFavoritesSectionComponent],
  template: `<app-console-favorites-section [config]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsoleFavoritesVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<ConsoleFavoritesSectionConfig>();
}
