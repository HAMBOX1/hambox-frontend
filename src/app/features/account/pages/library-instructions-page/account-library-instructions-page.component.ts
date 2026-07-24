import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';
import { RichContentViewerComponent } from '../../../../shared/components/rich-content-viewer/rich-content-viewer.component';
import { LibraryItemInstructionsFacade } from '../../services/library-item-instructions.facade';

const WORDS_PER_MINUTE = 200;

@Component({
  selector: 'app-account-library-instructions-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, HamboxTranslateRefreshDirective, HamboxDatePipe, RichContentViewerComponent],
  providers: [LibraryItemInstructionsFacade],
  templateUrl: './account-library-instructions-page.component.html',
  styleUrl: './account-library-instructions-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountLibraryInstructionsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly facade = inject(LibraryItemInstructionsFacade);

  protected readonly instructions = this.facade.instructions;
  protected readonly loading = this.facade.loading;
  protected readonly forbidden = this.facade.forbidden;
  protected readonly error = this.facade.error;

  protected readonly estimatedMinutes = computed(() => {
    const html = this.instructions()?.contentHtml ?? '';
    const text = html.replace(/<[^>]*>/g, ' ');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
  });

  ngOnInit(): void {
    const orderItemId = this.route.snapshot.paramMap.get('orderItemId');
    if (orderItemId) {
      void this.facade.load(orderItemId);
    }
  }

  protected retry(): void {
    const orderItemId = this.route.snapshot.paramMap.get('orderItemId');
    if (orderItemId) {
      void this.facade.load(orderItemId);
    }
  }
}
