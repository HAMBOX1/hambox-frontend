import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import {
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStepperComponent,
  AdminStepperStep,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { ThemeManagementFacade } from '../../services/theme-management.facade';

interface StartingPoint {
  readonly key: string;
  readonly templateId: string | null;
  readonly name: string;
  readonly description: string;
  readonly baseMode: 'Light' | 'Dark';
  readonly previewPrimary: string;
  readonly previewBackground: string;
}

const BLANK_STARTING_POINTS: readonly StartingPoint[] = [
  {
    key: 'blank-dark',
    templateId: null,
    name: 'Default Dark',
    description: 'A clean dark storefront baseline.',
    baseMode: 'Dark',
    previewPrimary: '#50ed95',
    previewBackground: '#131314',
  },
  {
    key: 'blank-light',
    templateId: null,
    name: 'Default Light',
    description: 'A clean light storefront baseline.',
    baseMode: 'Light',
    previewPrimary: '#16a34a',
    previewBackground: '#f8faf9',
  },
];

const STEPS: readonly AdminStepperStep[] = [
  { label: 'Starting point', icon: 'pi pi-palette' },
  { label: 'Details', icon: 'pi pi-pencil' },
];

@Component({
  selector: 'app-create-theme-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminStepperComponent,
  ],
  providers: [ThemeManagementFacade, MessageService],
  templateUrl: './create-theme-page.component.html',
  styleUrl: './create-theme-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateThemePageComponent implements OnInit {
  private readonly facade = inject(ThemeManagementFacade);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      { label: this.translate.instant('ADMIN.THEMES.LIST.TITLE'), route: '/admin/themes' },
      { label: this.translate.instant('ADMIN.THEMES.CREATE.TITLE') },
    ),
  );

  protected readonly steps = STEPS;
  protected readonly activeIndex = signal(0);
  protected readonly blankStartingPoints = BLANK_STARTING_POINTS;
  protected readonly templates = this.facade.templates;
  protected readonly templatesLoading = this.facade.templatesLoading;
  protected readonly saving = this.facade.detailSaving;

  protected readonly selected = signal<StartingPoint | null>(null);
  protected readonly name = signal('');
  protected readonly description = signal('');

  ngOnInit(): void {
    void this.facade.loadTemplates();
  }

  protected selectStartingPoint(point: StartingPoint): void {
    this.selected.set(point);
    this.name.set(point.templateId ? point.name : '');
    this.activeIndex.set(1);
  }

  protected backToStartingPoint(): void {
    this.activeIndex.set(0);
  }

  protected async create(): Promise<void> {
    const point = this.selected();
    const name = this.name().trim();
    if (!point || !name) {
      return;
    }

    const slug = slugify(name);

    if (point.templateId) {
      const createdId = await this.facade.duplicateTheme(point.templateId, {
        newName: name,
        newSlug: slug,
      });
      this.afterCreate(createdId);
      return;
    }

    const createdId = await this.facade.createTheme({
      name,
      slug,
      description: this.description().trim() || null,
      baseMode: point.baseMode,
      tokens: null,
    });
    this.afterCreate(createdId);
  }

  private afterCreate(createdId: string | null): void {
    if (!createdId) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.THEMES.CREATE.FAILED'),
        life: 5000,
      });
      return;
    }

    void this.router.navigate(['/admin/themes', createdId, 'edit']);
  }
}

function slugify(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'theme'}-${Date.now().toString(36)}`;
}
