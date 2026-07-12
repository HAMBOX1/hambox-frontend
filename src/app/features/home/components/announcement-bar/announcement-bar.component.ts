import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { StorefrontAnnouncementBarContent } from '../../models/storefront-content.model';

@Component({
  selector: 'app-announcement-bar',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (announcement().visible) {
      <div
        class="announcement-bar"
        [style.background]="announcement().backgroundColor"
        [style.color]="announcement().textColor"
        role="region"
        aria-label="Announcement"
      >
        <div class="announcement-bar__inner">
          <p class="announcement-bar__text">{{ announcement().text }}</p>
          @if (announcement().buttonText && announcement().link) {
            <a class="announcement-bar__cta" [routerLink]="announcement().link">
              {{ announcement().buttonText }}
            </a>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .announcement-bar {
      width: 100%;
    }

    .announcement-bar__inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0.65rem 1rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .announcement-bar__text {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .announcement-bar__cta {
      color: inherit;
      font-weight: 700;
      text-decoration: underline;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementBarComponent {
  readonly announcement = input.required<StorefrontAnnouncementBarContent>();
}
