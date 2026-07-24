import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { CollectionCreateFormComponent } from '../../components/collection-create-form/collection-create-form.component';
import { CollectionTreeComponent } from '../../components/collection-tree/collection-tree.component';
import {
  CreateCollectionRequest,
  ProductCollection,
  UpdateCollectionRequest,
} from '../../models/collection.model';
import { CollectionListFacade } from '../../services/collection-list.facade';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminConfirmDialogComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
} from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';

/** Mirrors `CategoryListPageComponent` — Collections management gets its own tree page inside
 * Product Catalog, exactly like Categories, but never touches storefront/customer-facing data. */
@Component({
  selector: 'app-collection-list-page',
  standalone: true,
  imports: [
    ButtonModule,
    DialogModule,
    DrawerModule,
    ToastModule,
    CollectionTreeComponent,
    CollectionCreateFormComponent,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminIconButtonComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminConfirmDialogComponent,
  ],
  providers: [CollectionListFacade, MessageService],
  templateUrl: './collection-list-page.component.html',
  styleUrl: './collection-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionListPageComponent implements OnInit {
  private readonly facade = inject(CollectionListFacade);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Collections' });

  protected readonly totalCount = this.facade.totalCount;
  protected readonly loading = this.facade.loading;
  protected readonly creating = this.facade.creating;
  protected readonly updating = this.facade.updating;
  protected readonly deleting = this.facade.deleting;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly error = this.facade.error;
  protected readonly createError = this.facade.createError;
  protected readonly updateError = this.facade.updateError;
  protected readonly parentOptions = this.facade.parentOptions;
  protected readonly editableParentOptions = this.facade.editableParentOptions;
  protected readonly createDialogOpen = this.facade.createDialogOpen;
  protected readonly editDialogOpen = this.facade.editDialogOpen;
  protected readonly editingCollection = this.facade.editingCollection;
  protected readonly createParentId = this.facade.createParentId;
  protected readonly subtitle = this.facade.subtitle;

  protected readonly formResetToken = signal(0);
  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<ProductCollection | null>(null);

  constructor() {
    effect(() => {
      if (this.facade.createDialogOpen() || this.facade.editDialogOpen()) {
        this.formResetToken.update((value) => value + 1);
      }
    });
  }

  ngOnInit(): void {
    this.facade.load();
  }

  protected onSearchChange(term: string): void {
    this.facade.setSearchTerm(term);
  }

  protected retryLoad(): void {
    void this.facade.reload();
  }

  protected openCreateDialog(): void {
    this.facade.openCreateDialog();
  }

  protected openCreateDialogForParent(parentId: string): void {
    this.facade.openCreateDialog(parentId);
  }

  protected openEditDialog(collection: ProductCollection): void {
    this.facade.openEditDialog(collection);
  }

  protected viewProducts(collection: ProductCollection): void {
    void this.router.navigate(['/admin/products'], { queryParams: { collectionId: collection.id } });
  }

  protected onCreateDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.facade.closeCreateDialog();
    }
  }

  protected onEditDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.facade.closeEditDialog();
    }
  }

  protected async onCreateSubmitted(request: CreateCollectionRequest): Promise<void> {
    const created = await this.facade.createCollection(request);

    if (created) {
      this.messageService.add({
        severity: 'success',
        summary: 'Collection created',
        detail: `"${request.name}" was added.`,
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Create failed',
      detail: this.facade.createError() ?? 'Unable to create collection.',
      life: 5000,
    });
  }

  protected async onUpdateSubmitted(request: UpdateCollectionRequest): Promise<void> {
    const updated = await this.facade.updateCollection(request);

    if (updated) {
      this.messageService.add({
        severity: 'success',
        summary: 'Collection updated',
        detail: `"${request.name}" was saved.`,
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Update failed',
      detail: this.facade.updateError() ?? 'Unable to update collection.',
      life: 5000,
    });
  }

  protected requestDelete(collection: ProductCollection): void {
    this.deleteTarget.set(collection);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const collection = this.deleteTarget();
    if (!collection) {
      return;
    }

    const success = await this.facade.deleteCollection(collection.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Collection deleted',
        detail: `"${collection.name}" was removed.`,
        life: 4000,
      });
      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Delete failed',
        detail: this.facade.error() ?? 'Unable to delete collection.',
        life: 5000,
      });
    }
  }

  protected deleteDialogMessage(): string {
    const collection = this.deleteTarget();
    return collection
      ? `Delete "${collection.name}"? Products stay untouched — they simply lose this collection tag. Collections with children can't be deleted — remove those first.`
      : '';
  }

  protected onCreateCancelled(): void {
    this.facade.closeCreateDialog();
  }
}
