import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CollectionShowcaseSectionConfig } from '../../section-registry/models/section-config.model';

@Component({
  selector: 'app-collection-showcase',
  standalone: true,
  imports: [RouterLink],
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
