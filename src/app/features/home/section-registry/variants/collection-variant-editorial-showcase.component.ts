import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CollectionShowcaseComponent } from '../../components/collection-showcase/collection-showcase.component';
import { CollectionShowcaseSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-collection-variant-editorial-showcase',
  standalone: true,
  imports: [CollectionShowcaseComponent],
  template: `<app-collection-showcase [config]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionVariantEditorialShowcaseComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<CollectionShowcaseSectionConfig>();
}
