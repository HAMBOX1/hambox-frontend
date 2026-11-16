import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';

import { CollectionShowcaseSectionConfig } from '../../section-registry/models/section-config.model';
import { HamboxLinkDirective } from '../../../../shared/directives/hambox-link.directive';

@Component({
  selector: 'app-collection-showcase',
  standalone: true,
  imports: [HamboxLinkDirective],
  templateUrl: './collection-showcase.component.html',
  styleUrl: './collection-showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionShowcaseComponent {
  readonly config = input.required<CollectionShowcaseSectionConfig>();

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  protected scrollByDirection(direction: 1 | -1): void {
    const element = this.track()?.nativeElement;
    if (!element) {
      return;
    }
    element.scrollBy({ left: direction * element.clientWidth * 0.9, behavior: 'smooth' });
  }
}
