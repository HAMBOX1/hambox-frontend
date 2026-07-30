import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConsoleFavoritesSectionConfig } from '../../section-registry/models/section-config.model';

@Component({
  selector: 'app-console-favorites-section',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './console-favorites-section.component.html',
  styleUrl: './console-favorites-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsoleFavoritesSectionComponent implements AfterViewInit {
  readonly config = input.required<ConsoleFavoritesSectionConfig>();

  protected readonly visible = signal(false);

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.visible.set(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  protected scrollByDirection(direction: 1 | -1): void {
    const element = this.track()?.nativeElement;
    if (!element) {
      return;
    }
    element.scrollBy({ left: direction * element.clientWidth * 0.6, behavior: 'smooth' });
  }
}
