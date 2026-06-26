import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableLazyLoadEvent } from 'primeng/table';

import { CategoryCreateFormComponent } from '../../components/category-create-form/category-create-form.component';
import { CategoryTableComponent } from '../../components/category-table/category-table.component';
import { CreateCategoryRequest } from '../../models/category.model';
import { CategoryListFacade } from '../../services/category-list.facade';

@Component({
  selector: 'app-category-list-page',
  standalone: true,
  imports: [
    ButtonModule,
    DialogModule,
    InputTextModule,
    ToastModule,
    CategoryTableComponent,
    CategoryCreateFormComponent,
  ],
  providers: [CategoryListFacade, MessageService],
  templateUrl: './category-list-page.component.html',
  styleUrl: './category-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryListPageComponent {
  private readonly facade = inject(CategoryListFacade);
  private readonly messageService = inject(MessageService);

  protected readonly items = this.facade.items;
  protected readonly loading = this.facade.loading;
  protected readonly creating = this.facade.creating;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly error = this.facade.error;
  protected readonly createError = this.facade.createError;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly createDialogOpen = this.facade.createDialogOpen;
  protected readonly hasActiveSearch = this.facade.hasActiveSearch;
  protected readonly subtitle = this.facade.subtitle;

  protected readonly formResetToken = signal(0);

  protected readonly tableFirst = computed(
    () => (this.facade.pageNumber() - 1) * this.facade.pageSize(),
  );

  constructor() {
    effect(() => {
      if (this.facade.createDialogOpen()) {
        this.formResetToken.update((value) => value + 1);
      }
    });
  }

  protected onSearchInput(event: Event): void {
    this.facade.setSearchTerm((event.target as HTMLInputElement).value);
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.facade.pageSize();
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / rows) + 1;

    this.facade.setPage(pageNumber, rows);
  }

  protected retryLoad(): void {
    void this.facade.reload();
  }

  protected openCreateDialog(): void {
    this.facade.openCreateDialog();
  }

  protected onDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.facade.closeCreateDialog();
    }
  }

  protected async onCreateSubmitted(request: CreateCategoryRequest): Promise<void> {
    const created = await this.facade.createCategory(request);

    if (created) {
      this.messageService.add({
        severity: 'success',
        summary: 'Category created',
        detail: `"${request.nameEn}" was added to the catalog.`,
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Create failed',
      detail: this.facade.createError() ?? 'Unable to create category.',
      life: 5000,
    });
  }

  protected onCreateCancelled(): void {
    this.facade.closeCreateDialog();
  }
}
