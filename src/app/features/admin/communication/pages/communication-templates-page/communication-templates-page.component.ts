import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminPageHeaderComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { COMMUNICATION_CATEGORIES, COMMUNICATION_CHANNELS, CommunicationTemplateListItemDto } from '../../models/communication.model';
import { CommunicationFacade } from '../../services/communication.facade';

@Component({
  selector: 'app-communication-templates-page',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TableModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [CommunicationFacade, MessageService],
  templateUrl: './communication-templates-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunicationTemplatesPageComponent implements OnInit {
  protected readonly facade = inject(CommunicationFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Communication', route: '/admin/communication' }, { label: 'Templates' });
  protected readonly categories = [...COMMUNICATION_CATEGORIES];
  protected readonly channels = [...COMMUNICATION_CHANNELS];

  protected readonly templates = this.facade.templates;
  protected readonly loading = this.facade.templatesLoading;
  protected readonly error = this.facade.templatesError;
  protected readonly detail = this.facade.templateDetail;
  protected readonly saving = this.facade.templateSaving;
  protected readonly detailError = this.facade.templateError;

  protected readonly editDialogOpen = signal(false);
  protected readonly createDialogOpen = signal(false);

  protected readonly subjectEn = signal('');
  protected readonly subjectAr = signal('');
  protected readonly bodyEn = signal('');
  protected readonly bodyAr = signal('');

  protected readonly newKey = signal('');
  protected readonly newChannel = signal<string>('InApp');
  protected readonly newCategory = signal<string>('General');

  ngOnInit(): void {
    void this.facade.loadTemplates();
  }

  protected retryLoad(): void {
    void this.facade.loadTemplates();
  }

  protected async openEdit(template: CommunicationTemplateListItemDto): Promise<void> {
    await this.facade.loadTemplateDetail(template.id);
    const detail = this.detail();
    const draft = detail?.versions.find((v) => !v.isPublished) ?? detail?.versions[0];
    this.subjectEn.set(draft?.subjectEn ?? '');
    this.subjectAr.set(draft?.subjectAr ?? '');
    this.bodyEn.set(draft?.bodyEn ?? '');
    this.bodyAr.set(draft?.bodyAr ?? '');
    this.editDialogOpen.set(true);
  }

  protected closeEdit(): void {
    this.editDialogOpen.set(false);
    this.facade.clearTemplateDetail();
  }

  protected async saveDraft(): Promise<void> {
    const detail = this.detail();
    if (!detail) {
      return;
    }

    const success = await this.facade.updateTemplate(detail.id, {
      subjectEn: this.subjectEn(),
      subjectAr: this.subjectAr() || null,
      bodyEn: this.bodyEn(),
      bodyAr: this.bodyAr() || null,
      variablesJson: null,
    });

    this.notify(success, 'ADMIN.COMMUNICATION.TEMPLATES.MESSAGES.SAVED', 'ADMIN.COMMUNICATION.TEMPLATES.MESSAGES.SAVE_FAILED');
  }

  protected async publishDraft(): Promise<void> {
    const detail = this.detail();
    if (!detail) {
      return;
    }

    const draft = detail.versions.find((v) => !v.isPublished);
    const success = await this.facade.publishTemplate(detail.id, draft?.id ?? null);
    this.notify(success, 'ADMIN.COMMUNICATION.TEMPLATES.MESSAGES.PUBLISHED', 'ADMIN.COMMUNICATION.TEMPLATES.MESSAGES.PUBLISH_FAILED');
    if (success) {
      this.closeEdit();
    }
  }

  protected openCreate(): void {
    this.newKey.set('');
    this.newChannel.set('InApp');
    this.newCategory.set('General');
    this.createDialogOpen.set(true);
  }

  protected async submitCreate(): Promise<void> {
    if (!this.newKey().trim()) {
      return;
    }

    const id = await this.facade.createTemplate({
      key: this.newKey().trim(),
      channel: this.newChannel(),
      category: this.newCategory(),
    });

    if (id) {
      this.createDialogOpen.set(false);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.COMMUNICATION.TEMPLATES.MESSAGES.CREATED'),
        life: 4000,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.COMMUNICATION.TEMPLATES.MESSAGES.CREATE_FAILED'),
        detail: this.facade.templateError() ?? '',
        life: 5000,
      });
    }
  }

  private notify(success: boolean, successKey: string, failKey: string): void {
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant(successKey), life: 4000 });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant(failKey),
      detail: this.facade.templateError() ?? '',
      life: 5000,
    });
  }
}
