import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminConfirmDialogComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { ReportDefinition } from '../../models/reports-api.model';
import { ReportsFacade } from '../../services/reports.facade';

@Component({
  selector: 'app-reports-library-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminEmptyStateComponent,
    AdminConfirmDialogComponent,
  ],
  templateUrl: './reports-library-page.component.html',
  styleUrl: './reports-library-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsLibraryPageComponent implements OnInit {
  protected readonly facade = inject(ReportsFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly types = this.facade.types;
  protected readonly library = this.facade.library;
  protected readonly favorites = this.facade.favorites;
  protected readonly loading = this.facade.loading;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly error = this.facade.error;
  protected readonly search = signal('');
  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<ReportDefinition | null>(null);

  protected readonly favoriteIds = computed(() => {
    const ids = new Set<string>();
    for (const favorite of this.favorites()) {
      ids.add(favorite.id);
    }
    for (const definition of this.library()) {
      if (definition.isFavorite) {
        ids.add(definition.id);
      }
    }
    return ids;
  });

  protected readonly savedDefinitions = computed(() =>
    this.library().filter((item) => !item.isSystem),
  );

  protected readonly systemDefinitions = computed(() =>
    this.library().filter((item) => item.isSystem),
  );

  ngOnInit(): void {
    void this.reload();
  }

  protected async reload(): Promise<void> {
    await Promise.all([
      this.facade.loadTypes(),
      this.facade.loadLibrary(this.search() || undefined),
      this.facade.loadFavorites(),
    ]);
  }

  protected isFavorite(definition: ReportDefinition): boolean {
    return this.favoriteIds().has(definition.id);
  }

  protected async toggleFavorite(definition: ReportDefinition): Promise<void> {
    if (this.isFavorite(definition)) {
      await this.facade.removeFavorite(definition.id);
    } else {
      await this.facade.addFavorite(definition.id);
    }
  }

  protected requestDelete(definition: ReportDefinition): void {
    if (definition.isSystem) {
      return;
    }
    this.deleteTarget.set(definition);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const definition = this.deleteTarget();
    if (!definition) {
      return;
    }
    await this.facade.deleteDefinition(definition.id);
    this.deleteDialogOpen.set(false);
    this.deleteTarget.set(null);
  }
}