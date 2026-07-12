import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxTranslateRefreshDirective } from '../../../shared/directives/hambox-translate-refresh.directive';
import { TranslationService } from '../../../core/i18n/translation.service';
import { SupportedLanguageId } from '../../../core/i18n/locale.model';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [TranslatePipe, HamboxTranslateRefreshDirective],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
  private readonly translation = inject(TranslationService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);
  protected readonly languages = this.translation.languages;
  protected readonly current = this.translation.currentLanguage;

  protected async selectLanguage(languageId: SupportedLanguageId): Promise<void> {
    await this.translation.setLanguage(languageId);
    this.open.set(false);
  }

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
