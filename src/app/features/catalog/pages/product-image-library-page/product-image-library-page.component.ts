import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

import { AdminPageHeaderComponent } from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';
import { Category } from '../../models/category.model';
import { Product, ProductImageLibraryItem } from '../../models/product.model';
import { CategoryApiService } from '../../services/category-api.service';
import { ProductApiService } from '../../services/product-api.service';

const PAGE_SIZE = 48;

/**
 * One place to see every product image and fix it without opening each product: replace a picture in
 * place (keeps its position / primary flag), set the primary, delete, upload for products that have none,
 * and copy one picture onto many products at once.
 */
@Component({
  selector: 'app-product-image-library-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    AdminPageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './product-image-library-page.component.html',
  styleUrl: './product-image-library-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductImageLibraryPageComponent implements OnInit {
  private readonly productApi = inject(ProductApiService);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly messages = inject(MessageService);

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Image Library' });

  protected readonly items = signal<readonly ProductImageLibraryItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(false);
  protected readonly busyKey = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly categoryId = signal<string | null>(null);
  protected readonly withoutImages = signal(false);
  protected readonly categories = signal<Category[]>([]);

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.totalCount() / PAGE_SIZE)));

  // "Use for other products" dialog
  protected readonly applySource = signal<ProductImageLibraryItem | null>(null);
  protected readonly applySearch = signal('');
  protected readonly applyCandidates = signal<readonly Product[]>([]);
  protected readonly applySelected = signal<ReadonlySet<string>>(new Set());
  protected readonly applySearching = signal(false);
  protected readonly applying = signal(false);

  // Delete confirmation
  protected readonly deleteTarget = signal<ProductImageLibraryItem | null>(null);

  private searchToken = 0;

  ngOnInit(): void {
    void this.loadCategories();
    void this.load();
  }

  protected onSearch(term: string): void {
    this.searchTerm.set(term);
    this.page.set(1);
    void this.load();
  }

  protected onCategoryChange(value: string | null): void {
    this.categoryId.set(value);
    this.page.set(1);
    void this.load();
  }

  protected onWithoutImagesChange(value: boolean): void {
    this.withoutImages.set(value);
    this.page.set(1);
    void this.load();
  }

  protected goToPage(next: number): void {
    const clamped = Math.min(this.pageCount(), Math.max(1, next));
    if (clamped === this.page()) {
      return;
    }

    this.page.set(clamped);
    void this.load();
  }

  protected rowKey(item: ProductImageLibraryItem): string {
    return item.imageId ?? `product-${item.productId}`;
  }

  protected async replaceImage(item: ProductImageLibraryItem, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !item.imageId) {
      return;
    }

    await this.runItemAction(item, 'Image replaced', 'Could not replace the image', () =>
      firstValueFrom(this.productApi.replaceProductImage(item.productId, item.imageId!, file)),
    );
  }

  protected async uploadImage(item: ProductImageLibraryItem, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    await this.runItemAction(item, 'Image uploaded', 'Could not upload the image', () =>
      firstValueFrom(this.productApi.uploadProductImage(item.productId, file)),
    );
  }

  protected async makePrimary(item: ProductImageLibraryItem): Promise<void> {
    if (!item.imageId || item.isPrimary) {
      return;
    }

    await this.runItemAction(item, 'Primary image updated', 'Could not set the primary image', () =>
      firstValueFrom(this.productApi.setPrimaryProductImage(item.productId, item.imageId!)),
    );
  }

  protected askDelete(item: ProductImageLibraryItem): void {
    this.deleteTarget.set(item);
  }

  protected async confirmDelete(): Promise<void> {
    const item = this.deleteTarget();
    this.deleteTarget.set(null);
    if (!item?.imageId) {
      return;
    }

    await this.runItemAction(item, 'Image deleted', 'Could not delete the image', () =>
      firstValueFrom(this.productApi.deleteProductImage(item.productId, item.imageId!)),
    );
  }

  protected openApply(item: ProductImageLibraryItem): void {
    this.applySource.set(item);
    this.applySearch.set('');
    this.applyCandidates.set([]);
    this.applySelected.set(new Set());
    void this.searchApplyCandidates('');
  }

  protected closeApply(): void {
    if (!this.applying()) {
      this.applySource.set(null);
    }
  }

  protected onApplySearch(term: string): void {
    this.applySearch.set(term);
    void this.searchApplyCandidates(term);
  }

  protected toggleApplyTarget(productId: string, checked: boolean): void {
    this.applySelected.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  }

  protected async confirmApply(): Promise<void> {
    const source = this.applySource();
    const targets = [...this.applySelected()];
    if (!source?.imageId || targets.length === 0 || this.applying()) {
      return;
    }

    this.applying.set(true);
    try {
      const result = await firstValueFrom(this.productApi.applyImageToProducts(source.imageId, targets));
      this.messages.add({
        severity: result.skipped > 0 ? 'warn' : 'success',
        summary: `Image applied to ${result.applied} product(s)`,
        detail: result.skipped > 0 ? `${result.skipped} skipped (image limit reached or file unavailable).` : undefined,
        life: 5000,
      });
      this.applySource.set(null);
      await this.load();
    } catch {
      this.messages.add({ severity: 'error', summary: 'Could not apply the image', life: 5000 });
    } finally {
      this.applying.set(false);
    }
  }

  private async searchApplyCandidates(term: string): Promise<void> {
    const token = ++this.searchToken;
    this.applySearching.set(true);
    try {
      const result = await firstValueFrom(
        this.productApi.getProducts({ pageNumber: 1, pageSize: 40, searchTerm: term.trim() || undefined }),
      );
      if (token === this.searchToken) {
        const sourceProductId = this.applySource()?.productId;
        this.applyCandidates.set(result.items.filter((product) => product.id !== sourceProductId));
      }
    } catch {
      if (token === this.searchToken) {
        this.applyCandidates.set([]);
      }
    } finally {
      if (token === this.searchToken) {
        this.applySearching.set(false);
      }
    }
  }

  private async runItemAction(
    item: ProductImageLibraryItem,
    successMessage: string,
    failureMessage: string,
    action: () => Promise<unknown>,
  ): Promise<void> {
    this.busyKey.set(this.rowKey(item));
    try {
      await action();
      this.messages.add({ severity: 'success', summary: successMessage, life: 2500 });
      await this.load();
    } catch {
      this.messages.add({ severity: 'error', summary: failureMessage, detail: 'Please try again.', life: 5000 });
    } finally {
      this.busyKey.set(null);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(
        this.productApi.getProductImageLibrary({
          searchTerm: this.searchTerm().trim() || undefined,
          categoryId: this.categoryId() ?? undefined,
          withoutImages: this.withoutImages(),
          page: this.page(),
          pageSize: PAGE_SIZE,
        }),
      );
      this.items.set(result.items);
      this.totalCount.set(result.totalCount);
    } catch {
      this.items.set([]);
      this.totalCount.set(0);
      this.messages.add({ severity: 'error', summary: 'Could not load the image library', life: 5000 });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const result = await firstValueFrom(this.categoryApi.getCategories({ pageNumber: 1, pageSize: 100 }));
      this.categories.set([...result.items]);
    } catch {
      this.categories.set([]);
    }
  }
}
