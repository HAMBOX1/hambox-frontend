import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { map } from 'rxjs';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import {
  REPORT_FORMATS,
  ReportFormat,
  ReportTypeInfo,
} from '../../models/reports-api.model';
import { ReportsFacade } from '../../services/reports.facade';

@Component({
  selector: 'app-reports-generate-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    SelectModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminEmptyStateComponent,
  ],
  templateUrl: './reports-generate-page.component.html',
  styleUrl: './reports-generate-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsGeneratePageComponent implements OnInit {
  private readonly facade = inject(ReportsFacade);
  private readonly route = inject(ActivatedRoute);

  protected readonly permissions = PERMISSIONS;
  protected readonly types = this.facade.types;
  protected readonly loading = this.facade.loading;
  protected readonly generating = this.facade.generating;
  protected readonly error = this.facade.error;
  protected readonly selectedType = signal<string | null>(null);
  protected readonly selectedFormat = signal<ReportFormat>('pdf');
  protected readonly formats = REPORT_FORMATS;
  protected readonly typeSelectOptions = computed(() => [...this.types()]);

  private readonly routeType = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('type'))),
    { initialValue: this.route.snapshot.paramMap.get('type') },
  );

  private readonly routeTypeEffect = effect(() => {
    const type = this.routeType();
    if (type) {
      this.selectType(type);
    }
  });

  protected readonly selectedTypeMeta = computed(() => {
    const type = this.selectedType();
    return this.types().find((item) => item.type === type) ?? null;
  });

  protected readonly formatOptions = computed(() => {
    const meta = this.selectedTypeMeta();
    const supported = meta?.supportedFormats?.length
      ? meta.supportedFormats.map((value) => value.toLowerCase())
      : [...this.formats];
    return this.formats.filter((format) => supported.includes(format));
  });

  ngOnInit(): void {
    void this.bootstrap();
  }

  protected selectType(type: string): void {
    this.selectedType.set(type);
    const options = this.formatOptions();
    if (!options.includes(this.selectedFormat()) && options.length > 0) {
      this.selectedFormat.set(options[0]!);
    }
  }

  protected async generate(): Promise<void> {
    const reportType = this.selectedType();
    if (!reportType) {
      return;
    }
    await this.facade.generateReport(reportType, this.selectedFormat());
  }

  protected typeLabel(type: ReportTypeInfo): string {
    return type.name || type.type;
  }

  private async bootstrap(): Promise<void> {
    await this.facade.loadTypes();
    this.syncRouteType();
  }

  private syncRouteType(): void {
    const routeType = this.routeType();
    if (routeType) {
      this.selectType(routeType);
    }
  }
}