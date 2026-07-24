import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import { tokenLabelKey, ThemeSemanticTokenKey } from '../../../../../core/theme/theme-semantic-tokens';
import { ThemeListItemDto, ThemeTokenDiffDto, ThemeVersionDto } from '../../models/theme-api.model';
import { ThemeManagementFacade } from '../../services/theme-management.facade';

type CompareMode = 'themes' | 'versions';

@Component({
  selector: 'app-theme-compare-panel',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    SelectModule,
    TableModule,
    AdminSectionCardComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
  ],
  templateUrl: './theme-compare-panel.component.html',
  styleUrl: './theme-compare-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeComparePanelComponent implements OnInit {
  readonly themes = input<readonly ThemeListItemDto[]>([]);
  readonly currentThemeId = input<string | null>(null);
  readonly versions = input<readonly ThemeVersionDto[]>([]);

  private readonly facade = inject(ThemeManagementFacade);

  protected readonly mode = signal<CompareMode>('themes');
  protected readonly leftId = signal<string | null>(null);
  protected readonly rightId = signal<string | null>(null);
  protected readonly leftVersionId = signal<string | null>(null);
  protected readonly rightVersionId = signal<string | null>(null);

  protected readonly compare = this.facade.compare;
  protected readonly compareLoading = this.facade.compareLoading;
  protected readonly compareError = this.facade.compareError;

  protected readonly versionOptions = computed(() =>
    [...this.versions()]
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((v) => ({
        label: `v${v.versionNumber}${v.isPublished ? ' (published)' : ''}`,
        value: v.id,
      })),
  );

  protected readonly versionDiff = computed<readonly ThemeTokenDiffDto[] | null>(() => {
    const left = this.versions().find((v) => v.id === this.leftVersionId());
    const right = this.versions().find((v) => v.id === this.rightVersionId());
    if (!left || !right) {
      return null;
    }

    const keys = new Set([...Object.keys(left.tokens), ...Object.keys(right.tokens)]);
    return [...keys]
      .filter((key) => left.tokens[key] !== right.tokens[key])
      .map((key) => ({ token: key, leftValue: left.tokens[key] ?? null, rightValue: right.tokens[key] ?? null }));
  });

  ngOnInit(): void {
    const current = this.currentThemeId();
    if (current) {
      this.leftId.set(current);
    }
  }

  protected setMode(mode: CompareMode): void {
    this.mode.set(mode);
  }

  protected themeOptions(): ThemeListItemDto[] {
    return [...this.themes()];
  }

  protected runCompare(): void {
    const left = this.leftId();
    const right = this.rightId();
    if (!left || !right || left === right) {
      return;
    }

    void this.facade.loadCompare(left, right);
  }

  protected tokenLabel(token: string): string {
    return tokenLabelKey(token as ThemeSemanticTokenKey);
  }

  protected retryCompare(): void {
    this.runCompare();
  }
}
