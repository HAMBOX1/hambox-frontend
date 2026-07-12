import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';

import {
  THEME_TOKEN_SECTIONS,
  ThemeSemanticTokenKey,
  tokenLabelKey,
} from '../../../../../core/theme/theme-semantic-tokens';
import { AdminSectionCardComponent } from '../../../../../shared/components/admin';

@Component({
  selector: 'app-theme-token-editor',
  standalone: true,
  imports: [FormsModule, TranslatePipe, InputTextModule, AdminSectionCardComponent],
  templateUrl: './theme-token-editor.component.html',
  styleUrl: './theme-token-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeTokenEditorComponent {
  readonly tokens = input.required<Readonly<Record<string, string>>>();
  readonly disabled = input(false);

  readonly tokensChange = output<Record<string, string>>();

  protected readonly sections = THEME_TOKEN_SECTIONS;

  protected tokenValue(tokenKey: ThemeSemanticTokenKey): string {
    return this.tokens()[tokenKey] ?? '';
  }

  protected tokenLabel(tokenKey: ThemeSemanticTokenKey): string {
    return tokenLabelKey(tokenKey);
  }

  protected onTokenChange(tokenKey: ThemeSemanticTokenKey, value: string): void {
    const next = { ...this.tokens(), [tokenKey]: value };
    this.tokensChange.emit(next);
  }
}
