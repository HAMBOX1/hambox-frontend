import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <button
      type="button"
      class="theme-toggle"
      [class.theme-toggle--compact]="compact()"
      [attr.aria-label]="
        (theme.isDark() ? 'COMMON.THEME.SWITCH_TO_LIGHT' : 'COMMON.THEME.SWITCH_TO_DARK') | translate
      "
      [attr.aria-pressed]="theme.isDark()"
      (click)="theme.toggle()"
    >
      @if (theme.isDark()) {
        <i class="pi pi-sun" aria-hidden="true"></i>
      } @else {
        <i class="pi pi-moon" aria-hidden="true"></i>
      }
      @if (!compact()) {
        <span>{{ (theme.isDark() ? 'COMMON.THEME.LIGHT' : 'COMMON.THEME.DARK') | translate }}</span>
      }
    </button>
  `,
  styles: `
    .theme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      min-width: 2.5rem;
      height: 2.5rem;
      padding: 0 0.75rem;
      border: 1px solid var(--color-nav-border, var(--color-border));
      border-radius: var(--sf-radius-sm);
      background: var(--color-nav-panel, var(--color-btn-secondary-bg));
      color: var(--color-nav-text, var(--color-text-secondary));
      font-family: var(--sf-font-body);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--hambox-transition-theme);

      &:hover {
        color: var(--color-nav-heading, var(--color-text-primary));
        border-color: var(--color-border-strong);
        background: var(--color-nav-hover, var(--color-surface-hover));
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }
    }

    .theme-toggle--compact {
      width: 2.5rem;
      padding: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  readonly compact = input(false);
  protected readonly theme = inject(ThemeService);
}
