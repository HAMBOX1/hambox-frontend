import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { HamboxTranslateRefreshDirective } from '../../../../../shared/directives/hambox-translate-refresh.directive';
import { KnowledgeArticleSummaryApiDto } from '../../../../../core/support/support-api.model';
import { SupportApiService } from '../../../../../core/support/support-api.service';
import { SupportSubnavComponent } from '../../components/support-subnav/support-subnav.component';

@Component({
  selector: 'app-account-knowledge-base-page',
  standalone: true,
  imports: [TranslatePipe, HamboxTranslateRefreshDirective, SupportSubnavComponent],
  templateUrl: './account-knowledge-base-page.component.html',
  styleUrl: './account-knowledge-base-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountKnowledgeBasePageComponent {
  private readonly api = inject(SupportApiService);

  protected readonly searchTerm = signal('');
  protected readonly expandedId = signal<string | null>(null);
  protected readonly articles = signal<readonly KnowledgeArticleSummaryApiDto[]>([]);
  protected readonly expandedBody = signal<string | null>(null);
  protected readonly loading = signal(false);

  constructor() {
    void this.load();
  }

  protected onSearchChange(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    void this.load();
  }

  protected async toggle(id: string): Promise<void> {
    if (this.expandedId() === id) {
      this.expandedId.set(null);
      this.expandedBody.set(null);
      return;
    }
    this.expandedId.set(id);
    const article = await firstValueFrom(this.api.getPublicKbArticle(id));
    this.expandedBody.set(article.body);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const page = await firstValueFrom(
        this.api.getPublicKbArticles({ page: 1, pageSize: 50, search: this.searchTerm().trim() || undefined }),
      );
      this.articles.set(page.items);
    } finally {
      this.loading.set(false);
    }
  }
}
