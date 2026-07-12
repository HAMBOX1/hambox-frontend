import { ChangeDetectorRef, DestroyRef, Directive, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

import { TranslationService } from '../../core/i18n/translation.service';

/**
 * Marks OnPush (or lazy-updated) hosts for check when the active locale changes.
 * Bind `translation.revision()` in the template when possible for an extra refresh signal.
 */
@Directive({
  selector: '[hamboxTranslateRefresh]',
  standalone: true,
})
export class HamboxTranslateRefreshDirective {
  private readonly translate = inject(TranslateService);
  private readonly i18n = inject(TranslationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());

    effect(() => {
      this.i18n.revision();
      this.cdr.markForCheck();
    });
  }
}
