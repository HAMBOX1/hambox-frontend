import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Popover, PopoverModule } from 'primeng/popover';

import { HamboxTranslateRefreshDirective } from '../../../shared/directives/hambox-translate-refresh.directive';
import { TranslationService } from '../../../core/i18n/translation.service';
import { SupportedLanguageId } from '../../../core/i18n/locale.model';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [TranslatePipe, HamboxTranslateRefreshDirective, PopoverModule],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
  private readonly translation = inject(TranslationService);
  private readonly panel = viewChild.required<Popover>('panel');

  protected readonly open = signal(false);
  protected readonly languages = this.translation.languages;
  protected readonly current = this.translation.currentLanguage;

  protected async selectLanguage(languageId: SupportedLanguageId): Promise<void> {
    await this.translation.setLanguage(languageId);
    this.panel().hide();
  }

  protected toggle(event: Event): void {
    this.panel().toggle(event);
  }
}
