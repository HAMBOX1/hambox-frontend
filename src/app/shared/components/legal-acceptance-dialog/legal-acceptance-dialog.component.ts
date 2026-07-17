import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { LEGAL_API } from '../../../core/api/api-endpoints';
import { TranslationService } from '../../../core/i18n/translation.service';

interface LegalTabDocument {
  slug: string;
  titleEn: string;
  titleAr: string | null;
  contentEn: string;
  contentAr: string | null;
}

@Component({
  selector: 'app-legal-acceptance-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ButtonModule, CheckboxModule, DialogModule, TabsModule],
  templateUrl: './legal-acceptance-dialog.component.html',
  styleUrl: './legal-acceptance-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalAcceptanceDialogComponent {
  private readonly api = inject(ApiClientService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly translation = inject(TranslationService);

  readonly visible = input(false);
  /** Slugs of the sections to show — defaults to every section requiring acceptance. */
  readonly slugs = input<readonly string[]>([]);

  readonly visibleChange = output<boolean>();
  readonly accepted = output<void>();

  protected readonly activeTab = signal('0');
  protected readonly agreed = signal(false);
  protected readonly loading = signal(false);
  protected readonly documents = signal<readonly LegalTabDocument[]>([]);

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.agreed.set(false);
        this.activeTab.set('0');
        void this.loadDocuments();
      }
    });
  }

  protected localizedTitle(document: LegalTabDocument): string {
    return this.translation.language() === 'ar' && document.titleAr ? document.titleAr : document.titleEn;
  }

  protected sanitizedContent(document: LegalTabDocument) {
    const content =
      this.translation.language() === 'ar' && document.contentAr ? document.contentAr : document.contentEn;
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  protected onTabChange(value: string | number | undefined): void {
    this.activeTab.set(String(value ?? '0'));
  }

  protected close(): void {
    this.visibleChange.emit(false);
  }

  protected confirm(): void {
    if (!this.agreed()) {
      return;
    }

    this.accepted.emit();
  }

  private async loadDocuments(): Promise<void> {
    this.loading.set(true);

    try {
      const results = await Promise.all(
        this.slugs().map((slug) =>
          firstValueFrom(this.api.get<LegalTabDocument>(LEGAL_API.publicDocument(slug))).catch(
            () => ({ slug, titleEn: slug, titleAr: null, contentEn: '', contentAr: null }) as LegalTabDocument,
          ),
        ),
      );
      this.documents.set(results);
    } finally {
      this.loading.set(false);
    }
  }
}
