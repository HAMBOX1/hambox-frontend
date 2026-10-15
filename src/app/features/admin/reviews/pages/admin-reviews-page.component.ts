import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom, Observable } from 'rxjs';

import { ADMIN_REVIEWS_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';

export interface AdminReviewDto {
  readonly id: string;
  readonly productId: string;
  readonly userId: string;
  readonly orderId: string;
  readonly rating: number;
  readonly comment: string;
  readonly helpfulCount: number;
  readonly notHelpfulCount: number;
  readonly isHidden: boolean;
  readonly hiddenReason: string | null;
  readonly hiddenByUserId: string | null;
  readonly hiddenOnUtc: string | null;
  readonly createdOnUtc: string;
}

type ReviewFilter = 'all' | 'visible' | 'hidden';

const FILTERS: { value: ReviewFilter; label: string }[] = [
  { value: 'all', label: 'All reviews' },
  { value: 'visible', label: 'Visible on the storefront' },
  { value: 'hidden', label: 'Hidden by a moderator' },
];

/** Moderation of customer reviews (audit R50): see votes, hide with a reason, restore. */
@Component({
  selector: 'app-admin-reviews-page',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    ButtonModule,
    DialogModule,
    SelectModule,
    TableModule,
    TextareaModule,
    ToastModule,
    HasPermissionDirective,
  ],
  providers: [MessageService],
  templateUrl: './admin-reviews-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReviewsPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly messageService = inject(MessageService);

  protected readonly permissions = PERMISSIONS;
  protected readonly filterOptions = FILTERS;

  protected readonly reviews = signal<readonly AdminReviewDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filter = signal<ReviewFilter>('all');

  protected readonly hideTarget = signal<AdminReviewDto | null>(null);
  protected readonly hideReason = signal('');
  protected readonly saving = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  protected setFilter(value: ReviewFilter): void {
    this.filter.set(value);
    void this.load();
  }

  protected openHide(review: AdminReviewDto): void {
    this.hideReason.set('');
    this.hideTarget.set(review);
  }

  protected async confirmHide(): Promise<void> {
    const target = this.hideTarget();
    const reason = this.hideReason().trim();
    if (!target || !reason) return;

    const ok = await this.run(
      () => this.api.post<AdminReviewDto>(ADMIN_REVIEWS_API.hide(target.id), { reason }),
      'Review hidden from the storefront',
    );
    if (ok) {
      this.hideTarget.set(null);
    }
  }

  protected async unhide(review: AdminReviewDto): Promise<void> {
    await this.run(
      () => this.api.post<AdminReviewDto>(ADMIN_REVIEWS_API.unhide(review.id), {}),
      'Review restored',
    );
  }

  private async run(call: () => Observable<AdminReviewDto>, success: string): Promise<boolean> {
    this.saving.set(true);
    try {
      await firstValueFrom(call());
      this.messageService.add({ severity: 'success', summary: success });
      await this.load();
      return true;
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      });
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const params: Record<string, string | number | boolean> = { take: 200 };
    if (this.filter() === 'hidden') params['hidden'] = true;
    if (this.filter() === 'visible') params['hidden'] = false;

    try {
      this.reviews.set(
        await firstValueFrom(this.api.get<readonly AdminReviewDto[]>(ADMIN_REVIEWS_API.reviews, { params })),
      );
    } catch (error) {
      this.error.set(error instanceof ApiError ? error.message : 'Could not load reviews.');
    } finally {
      this.loading.set(false);
    }
  }
}
